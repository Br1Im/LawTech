const db = require('../db');
const { checkOfficeAccess } = require('../utils/ensureOffice');
const { canAccessContract } = require('../utils/contractAccess');
const { dateOnly, claimIdempotency, audit } = require('../utils/financeSecurity');
const { reconcileInstallments, syncLegacyFields } = require('../services/installmentService');

const PAYMENT_METHODS = new Set(['cash', 'noncash', 'bank', 'sbp']);
const PAYMENT_ROLES = new Set(['admin', 'administrator', 'director', 'manager', 'okk']);

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

async function getAccessibleContract(req, connection = db, lock = false) {
  const suffix = lock ? ' FOR UPDATE' : '';
  const [rows] = await connection.query(
    `SELECT id, office_id, id_client, id_employee, contract_number, contract_date,
            amount, paid_amount, registered_by, title, status, terminated_at,
            refund_amount, refund_confirmed
       FROM contracts
      WHERE id = ?${suffix}`,
    [req.params.id]
  );
  const contract = rows[0];
  if (!contract) return { error: [404, 'Договор не найден'] };
  if (!await canAccessContract(req.user, contract.id, connection)) {
    return { error: [403, 'Доступ запрещён'] };
  }
  return { contract };
}

async function syncPaidAmount(connection, contractId) {
  const [[row]] = await connection.query(
    `SELECT COALESCE(ROUND(SUM(amount), 2), 0) AS total
       FROM contract_payments
      WHERE contract_id = ? AND confirmed = 1`,
    [contractId]
  );
  const total = roundMoney(row?.total);
  await connection.query(
    `UPDATE contracts
        SET paid_amount = ?,
            payment_date = CASE WHEN ? > 0 THEN CURRENT_DATE() ELSE payment_date END,
            additional_payment_date = CASE WHEN ? >= amount THEN NULL ELSE additional_payment_date END,
            additional_payment_amount = CASE WHEN ? >= amount THEN NULL ELSE ROUND(amount-?,2) END,
            remainder_confirmed = CASE WHEN ? >= amount THEN 1 ELSE 0 END,
            remainder_confirmed_at = CASE WHEN ? >= amount THEN NOW() ELSE remainder_confirmed_at END
      WHERE id = ?`,
    [total, total, total, total, total, total, total, contractId]
  );
  return total;
}

async function createCashRegisterEntry(connection, contract, payment, userId) {
  const bucket = payment.payment_method === 'sbp' ? 'bank' : payment.payment_method;
  const [[client]] = await connection.query(
    'SELECT name FROM clients WHERE id = ?',
    [contract.id_client]
  );
  const [[employee]] = await connection.query(
    `SELECT TRIM(CONCAT_WS(' ', last_name, first_name, middle_name)) AS full_name
       FROM employees WHERE id = ?`,
    [contract.id_employee]
  );
  await connection.query(
    `INSERT INTO cash_register (
       office_id, entry_date, client_name, contract_number, action,
       lawyer_name, employee_id, cash_amount, noncash_amount,
       bank_amount, expense_amount, comment, created_by
     ) VALUES (?, ?, ?, ?, 'Оплата договора', ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      contract.office_id,
      payment.payment_date,
      client?.name || null,
      contract.contract_number || `ДОГ-${String(contract.id).padStart(8, '0')}`,
      employee?.full_name || null,
      contract.id_employee,
      bucket === 'cash' ? payment.amount : 0,
      bucket === 'noncash' ? payment.amount : 0,
      bucket === 'bank' ? payment.amount : 0,
      payment.comment || null,
      userId || null,
    ]
  );
}

/**
 * GET /contracts/:id/payments
 * Неизменяемый журнал всех оплат по договору.
 */
async function getPayments(req, res) {
  try {
    const access = await getAccessibleContract(req);
    if (access.error) {
      return res.status(access.error[0]).json({ success: false, message: access.error[1] });
    }
    const [payments] = await db.query(
      `SELECT
         p.*,
         TRIM(CONCAT_WS(' ', cu.last_name, cu.first_name)) AS created_by_name,
         TRIM(CONCAT_WS(' ', cb.last_name, cb.first_name)) AS confirmed_by_name
       FROM contract_payments p
       LEFT JOIN users cu ON cu.id = p.created_by
       LEFT JOIN users cb ON cb.id = p.confirmed_by
       WHERE p.contract_id = ?
       ORDER BY p.payment_date DESC, p.created_at DESC, p.id DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('Error getting payments:', error);
    res.status(500).json({ success: false, message: 'Ошибка при загрузке платежей' });
  }
}

/**
 * POST /contracts/:id/payments
 * Добавляет подтверждённую оплату, обновляет долг и сразу включает её в баланс.
 */
async function addPayment(req, res) {
  const role = String(req.user.role || '').toLowerCase();
  if (!PAYMENT_ROLES.has(role)) {
    return res.status(403).json({ success: false, message: 'Нет прав для внесения оплаты' });
  }

  const amount = roundMoney(req.body.amount);
  const paymentMethod = String(req.body.payment_method || '');
  const paymentDate=dateOnly(req.body.payment_date||new Date().toISOString().slice(0,10));
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Сумма каждого платежа должна быть больше 0.' });
  }
  if(!paymentDate) return res.status(400).json({success:false,message:'Некорректная дата платежа'});
  if (!PAYMENT_METHODS.has(paymentMethod)) {
    return res.status(400).json({ success: false, message: 'Выберите корректный способ оплаты.' });
  }

  const connection = await db.getClient();
  try {
    await connection.beginTransaction();
    await claimIdempotency(connection,req,'contract:payment',Number(req.user.office_id)||null);
    const access = await getAccessibleContract(req, connection, true);
    if (access.error) {
      await connection.rollback();
      return res.status(access.error[0]).json({ success: false, message: access.error[1] });
    }
    const contract = access.contract;
    if (String(contract.status || '').toLowerCase() === 'terminated' || contract.terminated_at) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        code: 'CONTRACT_TERMINATED',
        message: 'Нельзя добавлять оплату по расторгнутому договору'
      });
    }
    const [[current]] = await connection.query(
      `SELECT COALESCE(ROUND(SUM(amount), 2), 0) AS total
         FROM contract_payments
        WHERE contract_id = ? AND confirmed = 1`,
      [contract.id]
    );
    const newTotal = roundMoney(current.total) + amount;
    if (newTotal > roundMoney(contract.amount)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Общая сумма платежей превышает сумму договора.',
      });
    }

    const payment = {
      amount,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      comment: req.body.comment || null,
    };
    const [result] = await connection.query(
      `INSERT INTO contract_payments (
         contract_id, amount, payment_date, payment_method, payment_type,
         comment, created_by, confirmed, confirmed_by, confirmed_at
       ) VALUES (?, ?, ?, ?, 'additional', ?, ?, 1, ?, NOW())`,
      [
        contract.id,
        payment.amount,
        payment.payment_date,
        payment.payment_method,
        payment.comment,
        req.user.id || null,
        req.user.id || null,
      ]
    );

    const totalPaid = await syncPaidAmount(connection, contract.id);
    await reconcileInstallments(connection, contract.id);
    await syncLegacyFields(connection, contract.id);
    await createCashRegisterEntry(connection, contract, payment, req.user.id);
    await audit(connection,req,'create','contract_payment',result.insertId,contract.office_id,amount,{contract_id:contract.id,payment_method:paymentMethod,payment_date:paymentDate});
    await connection.commit();
    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        paid_amount: totalPaid,
        remaining_amount: Math.max(0, roundMoney(contract.amount) - totalPaid),
      },
      message: 'Оплата добавлена и учтена в балансе',
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Error adding payment:', error);
    res.status(error.statusCode||500).json({ success:false,message:error.message||'Ошибка при добавлении оплаты' });
  } finally {
    connection.release();
  }
}

/**
 * PATCH /contracts/:id/payments/:paymentId/confirm
 * Оставлено для подтверждения старых ожидающих платежей.
 */
async function confirmPayment(req, res) {
  const role = String(req.user.role || '').toLowerCase();
  if (!['director', 'manager', 'okk'].includes(role)) {
    return res.status(403).json({ success: false, message: 'Только руководство может подтвердить платёж' });
  }

  const connection = await db.getClient();
  try {
    await connection.beginTransaction();
    const access = await getAccessibleContract(req, connection, true);
    if (access.error) {
      await connection.rollback();
      return res.status(access.error[0]).json({ success: false, message: access.error[1] });
    }
    const contract = access.contract;
    const [[payment]] = await connection.query(
      `SELECT * FROM contract_payments
        WHERE id = ? AND contract_id = ? FOR UPDATE`,
      [req.params.paymentId, contract.id]
    );
    if (!payment) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Платёж не найден' });
    }
    if (payment.confirmed) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Платёж уже подтверждён' });
    }
    const [[current]] = await connection.query(
      `SELECT COALESCE(ROUND(SUM(amount), 2), 0) AS total
         FROM contract_payments
        WHERE contract_id = ? AND confirmed = 1`,
      [contract.id]
    );
    if (roundMoney(current.total) + roundMoney(payment.amount) > roundMoney(contract.amount)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Общая сумма платежей превышает сумму договора.',
      });
    }
    await connection.query(
      `UPDATE contract_payments
          SET confirmed = 1, confirmed_by = ?, confirmed_at = NOW()
        WHERE id = ?`,
      [req.user.id, payment.id]
    );
    await syncPaidAmount(connection, contract.id);
    await reconcileInstallments(connection, contract.id);
    await syncLegacyFields(connection, contract.id);
    await createCashRegisterEntry(connection, contract, payment, req.user.id);
    await audit(connection,req,'confirm','contract_payment',payment.id,contract.office_id,payment.amount,{contract_id:contract.id});
    await connection.commit();
    res.json({ success: true, message: 'Платёж подтверждён и учтён в балансе' });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Error confirming payment:', error);
    res.status(500).json({ success: false, message: 'Ошибка при подтверждении платежа' });
  } finally {
    connection.release();
  }
}

/**
 * DELETE /contracts/:id/payments/:paymentId
 * Подтверждённые записи журнала неизменяемы.
 */
async function deletePayment(req, res) {
  try {
    const access = await getAccessibleContract(req);
    if (access.error) {
      return res.status(access.error[0]).json({ success: false, message: access.error[1] });
    }
    const [[payment]] = await db.query(
      'SELECT * FROM contract_payments WHERE id = ? AND contract_id = ?',
      [req.params.paymentId, access.contract.id]
    );
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Платёж не найден' });
    }
    if (payment.confirmed) {
      return res.status(400).json({
        success: false,
        message: 'Подтверждённый платёж является частью финансового журнала и не может быть удалён.',
      });
    }
    const role = String(req.user.role || '').toLowerCase();
    const isCreator = Number(payment.created_by) === Number(req.user.id);
    if (!isCreator && !PAYMENT_ROLES.has(role)) {
      return res.status(403).json({ success: false, message: 'Нет прав для удаления платежа' });
    }
    await db.query('DELETE FROM contract_payments WHERE id = ?', [payment.id]);
    res.json({ success: true, message: 'Ожидающий платёж удалён' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ success: false, message: 'Ошибка при удалении платежа' });
  }
}

module.exports = { getPayments, addPayment, confirmPayment, deletePayment };
