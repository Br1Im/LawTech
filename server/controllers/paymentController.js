const db = require('../db');

/**
 * GET /contracts/:id/payments
 * Все платежи по договору
 */
async function getPayments(req, res) {
  try {
    const contractId = req.params.id;
    const [payments] = await db.query(
      `SELECT
         p.*,
         TRIM(CONCAT_WS(' ', cu.last_name, cu.first_name)) AS created_by_name,
         TRIM(CONCAT_WS(' ', cb.last_name, cb.first_name)) AS confirmed_by_name
       FROM contract_payments p
       LEFT JOIN users cu ON cu.id = p.created_by
       LEFT JOIN users cb ON cb.id = p.confirmed_by
       WHERE p.contract_id = ?
       ORDER BY p.payment_date ASC, p.created_at ASC`,
      [contractId]
    );
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('Error getting payments:', error);
    res.status(500).json({ success: false, message: 'Ошибка при загрузке платежей' });
  }
}

/**
 * POST /contracts/:id/payments
 * Добавить доплату (admin/administrator)
 */
async function addPayment(req, res) {
  try {
    const contractId = req.params.id;
    const role = String(req.user.role || '').toLowerCase();
    
    // Только админ, директор, менеджер
    if (!['admin', 'administrator', 'director', 'manager'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Нет прав для внесения доплаты' });
    }

    const { amount, payment_date, payment_method, comment } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Укажите сумму доплаты' });
    }
    if (!payment_date) {
      return res.status(400).json({ success: false, message: 'Укажите дату доплаты' });
    }

    // Проверяем что договор существует
    const [contracts] = await db.query('SELECT id, amount, paid_amount FROM contracts WHERE id = ?', [contractId]);
    if (!contracts.length) {
      return res.status(404).json({ success: false, message: 'Договор не найден' });
    }

    const [result] = await db.query(
      `INSERT INTO contract_payments (contract_id, amount, payment_date, payment_method, comment, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [contractId, amount, payment_date, payment_method || 'cash', comment || null, req.user.id]
    );

    res.json({ success: true, data: { id: result.insertId }, message: 'Доплата добавлена' });
  } catch (error) {
    console.error('Error adding payment:', error);
    res.status(500).json({ success: false, message: 'Ошибка при добавлении доплаты' });
  }
}

/**
 * PATCH /contracts/:id/payments/:paymentId/confirm
 * Подтвердить платёж (director/manager/okk)
 */
async function confirmPayment(req, res) {
  try {
    const { id: contractId, paymentId } = req.params;
    const role = String(req.user.role || '').toLowerCase();
    
    if (!['director', 'manager', 'okk'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Только руководство может подтвердить платёж' });
    }

    // Получаем платёж
    const [payments] = await db.query(
      'SELECT * FROM contract_payments WHERE id = ? AND contract_id = ?',
      [paymentId, contractId]
    );
    if (!payments.length) {
      return res.status(404).json({ success: false, message: 'Платёж не найден' });
    }
    if (payments[0].confirmed) {
      return res.status(400).json({ success: false, message: 'Платёж уже подтверждён' });
    }

    const conn = await db.getClient();
    try {
      await conn.beginTransaction();

      // Подтверждаем платёж
      await conn.query(
        `UPDATE contract_payments SET confirmed = 1, confirmed_by = ?, confirmed_at = NOW() WHERE id = ?`,
        [req.user.id, paymentId]
      );

      // Увеличиваем paid_amount договора
      await conn.query(
        `UPDATE contracts SET paid_amount = COALESCE(paid_amount, 0) + ? WHERE id = ?`,
        [payments[0].amount, contractId]
      );

      await conn.commit();
      res.json({ success: true, message: 'Платёж подтверждён' });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ success: false, message: 'Ошибка при подтверждении платежа' });
  }
}

/**
 * DELETE /contracts/:id/payments/:paymentId
 * Удалить неподтверждённый платёж
 */
async function deletePayment(req, res) {
  try {
    const { id: contractId, paymentId } = req.params;
    const role = String(req.user.role || '').toLowerCase();

    const [payments] = await db.query(
      'SELECT * FROM contract_payments WHERE id = ? AND contract_id = ?',
      [paymentId, contractId]
    );
    if (!payments.length) {
      return res.status(404).json({ success: false, message: 'Платёж не найден' });
    }
    if (payments[0].confirmed) {
      return res.status(400).json({ success: false, message: 'Нельзя удалить подтверждённый платёж' });
    }

    // Удалить может создатель или руководство
    const isCreator = payments[0].created_by === req.user.id;
    const isManagement = ['director', 'manager', 'okk', 'admin', 'administrator'].includes(role);
    if (!isCreator && !isManagement) {
      return res.status(403).json({ success: false, message: 'Нет прав для удаления' });
    }

    await db.query('DELETE FROM contract_payments WHERE id = ?', [paymentId]);
    res.json({ success: true, message: 'Платёж удалён' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ success: false, message: 'Ошибка при удалении платежа' });
  }
}

module.exports = { getPayments, addPayment, confirmPayment, deletePayment };
