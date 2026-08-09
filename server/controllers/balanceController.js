/**
 * Контроллер «Баланс денежных средств».
 *
 * Ежедневный казначейский баланс по трём «кошелькам»:
 *   - cash    — Наличные
 *   - noncash — Безнал / банковская карта
 *   - bank    — Расчётный счёт компании (Р/С)
 *
 * Логика каждого дня:
 *   Остаток на конец = Остаток на начало + Поступления − Расходы   (по каждому кошельку)
 *   Остаток на начало = остаток на конец предыдущего активного дня
 *
 * Источники данных (ничего не дублируем):
 *   Поступления = подтверждённые строки contract_payments по способу и дате платежа
 *               + ручные поступления (office_income)
 *   Расходы     = expenses.amount по payment_method, на spent_on (зарплаты/возвраты падают сюда авто)
 *   Стартовый остаток задаётся один раз (office_balance_opening).
 *
 */
const db = require('../db');
const { checkOfficeAccess } = require('../utils/ensureOffice');
const { resolveRollingWindow } = require('../utils/planPeriod');

const ok = (res, data) => res.json({ success: true, data });
const bad = (res, code, message, err) => {
  if (err) console.error(message, err.message || err);
  return res.status(code).json({ success: false, message });
};

const BUCKETS = ['cash', 'noncash', 'bank'];
const COMPOSITION_ROLES = ['admin','administrator','director','manager','okk'];
const BALANCE_ROLES = new Set(COMPOSITION_ROLES); // кто может задавать стартовый остаток

const zero = () => ({ cash: 0, noncash: 0, bank: 0 });
const normBucket = (pm) => {
  if (pm === 'sbp') return 'bank';
  if (pm === 'card') return 'noncash';
  return BUCKETS.includes(pm) ? pm : 'cash';
};
const num = (v) => Number(v || 0);
const today = () => new Date().toISOString().slice(0, 10);
const dstr = (d) => {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
};

// Разрешить офис из query/body или из токена пользователя
async function resolveOffice(req, res) {
  if (!BALANCE_ROLES.has(String(req.user?.role||'').toLowerCase())) { bad(res,403,'Нет доступа к Балансу'); return null; }
  const officeId = Number(req.query.office_id || req.body.office_id || req.user.office_id);
  if (!officeId) { bad(res, 400, 'Не указан офис'); return null; }
  const allowed = await checkOfficeAccess(req.user, officeId);
  if (!allowed) { bad(res, 403, 'Доступ запрещён'); return null; }
  return officeId;
}

// ─── GET /api/office/:officeId/balance/opening ───
const getOpening = async (req, res) => {
  if (!BALANCE_ROLES.has(String(req.user?.role||'').toLowerCase())) return bad(res,403,'Нет доступа к Балансу');
  try {
    const officeId = Number(req.params.officeId);
    if (!officeId) return bad(res, 400, 'Не указан офис');
    if (!await checkOfficeAccess(req.user, officeId)) return bad(res, 403, 'Доступ запрещён');

    const [[row]] = await db.query('SELECT * FROM office_balance_opening WHERE office_id = ?', [officeId]);
    if (!row) return ok(res, null);
    return ok(res, {
      office_id: officeId,
      start_date: dstr(row.start_date),
      cash: num(row.opening_cash),
      noncash: num(row.opening_noncash),
      bank: num(row.opening_bank),
    });
  } catch (e) {
    return bad(res, 500, 'Ошибка получения стартового остатка', e);
  }
};

// ─── PUT /api/office/:officeId/balance/opening ───  (director/manager/okk)
const setOpening = async (req, res) => {
  try {
    const officeId = Number(req.params.officeId);
    if (!officeId) return bad(res, 400, 'Не указан офис');
    if (!await checkOfficeAccess(req.user, officeId)) return bad(res, 403, 'Доступ запрещён');
    if (!COMPOSITION_ROLES.includes(req.user.role)) {
      return bad(res, 403, 'Стартовый остаток может задавать Директор / Менеджер / ОКК');
    }
    const { start_date, cash, noncash, bank } = req.body;
    if (!start_date) return bad(res, 400, 'Укажите дату начала');

    await db.query(
      `INSERT INTO office_balance_opening (office_id, start_date, opening_cash, opening_noncash, opening_bank, created_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE start_date = VALUES(start_date),
         opening_cash = VALUES(opening_cash), opening_noncash = VALUES(opening_noncash),
         opening_bank = VALUES(opening_bank), updated_at = CURRENT_TIMESTAMP`,
      [officeId, dstr(start_date), num(cash), num(noncash), num(bank), req.user.id || null]
    );
    return ok(res, { office_id: officeId, start_date: dstr(start_date), cash: num(cash), noncash: num(noncash), bank: num(bank) });
  } catch (e) {
    return bad(res, 500, 'Ошибка сохранения стартового остатка', e);
  }
};

// Собрать поступления по дням/кошелькам
async function loadIncome(officeId, from, to) {
  const map = {}; // date -> {cash,noncash,bank}
  const add = (d, pm, amt) => {
    const k = dstr(d);
    if (!k) return;
    if (!map[k]) map[k] = zero();
    map[k][normBucket(pm)] += num(amt);
  };
  // оплаты по договорам
  const [contracts] = await db.query(
    `SELECT p.payment_date d, p.payment_method pm, COALESCE(SUM(p.amount),0) s
       FROM contract_payments p
       JOIN contracts c ON c.id = p.contract_id
      WHERE c.office_id = ? AND p.confirmed = 1
        AND p.payment_date BETWEEN ? AND ?
      GROUP BY p.payment_date, p.payment_method`,
    [officeId, from, to]
  );
  contracts.forEach(r => add(r.d, r.pm, r.s));
  // ручные поступления
  const [manual] = await db.query(
    `SELECT income_date d, payment_method pm, COALESCE(SUM(amount),0) s
       FROM office_income
      WHERE office_id = ? AND income_date BETWEEN ? AND ?
      GROUP BY income_date, payment_method`,
    [officeId, from, to]
  );
  manual.forEach(r => add(r.d, r.pm, r.s));
  return map;
}

// Собрать расходы по дням/кошелькам
async function loadExpenses(officeId, from, to) {
  const map = {};
  const [rows] = await db.query(
    `SELECT spent_on d, payment_method pm, COALESCE(SUM(amount),0) s
       FROM expenses
      WHERE office_id = ? AND spent_on BETWEEN ? AND ?
      GROUP BY spent_on, payment_method`,
    [officeId, from, to]
  );
  rows.forEach(r => {
    const k = dstr(r.d);
    if (!map[k]) map[k] = zero();
    map[k][normBucket(r.pm)] += num(r.s);
  });
  return map;
}

// Внутренние переводы не являются доходом или расходом: они только меняют
// остатки отдельных кошельков. Для расчёта дня возвращаем чистое изменение
// по каждому кошельку и отдельную сумму переводов для журнала.
async function loadTransfers(officeId, from, to) {
  const map = {};
  const [rows] = await db.query(
    `SELECT transfer_date d, source_bucket source_pm, destination_bucket destination_pm,
            COALESCE(SUM(amount),0) total
       FROM office_transfers
      WHERE office_id = ? AND transfer_date BETWEEN ? AND ?
      GROUP BY transfer_date, source_bucket, destination_bucket`,
    [officeId, from, to]
  );
  rows.forEach(r => {
    const k = dstr(r.d);
    if (!map[k]) map[k] = { delta: zero(), total: 0 };
    const amount = num(r.total);
    map[k].delta[normBucket(r.destination_pm)] += amount;
    map[k].delta[normBucket(r.source_pm)] -= amount;
    map[k].total += amount;
  });
  return map;
}

// ─── GET /api/office/:officeId/balance?date_from&date_to ───
const getBalance = async (req, res) => {
  if (!BALANCE_ROLES.has(String(req.user?.role||'').toLowerCase())) return bad(res,403,'Нет доступа к Балансу');
  try {
    const officeId = Number(req.params.officeId);
    if (!officeId) return bad(res, 400, 'Не указан офис');
    if (!await checkOfficeAccess(req.user, officeId)) return bad(res, 403, 'Доступ запрещён');

    const [[op]] = await db.query('SELECT * FROM office_balance_opening WHERE office_id = ?', [officeId]);
    const startDate = op ? dstr(op.start_date) : '2000-01-01';
    const opening = op
      ? { cash: num(op.opening_cash), noncash: num(op.opening_noncash), bank: num(op.opening_bank) }
      : zero();

    // Бежим от стартовой даты до конца запрошенного периода (или сегодня),
    // чтобы корректно перенести остатки, но показываем только запрошенный диапазон.
    // Period by office plan (same as Office tab): rolling cycle + cycle_offset for past periods.
    let periodInfo = null;
    let reqFrom, reqTo;
    const explicitFrom = dstr(req.query.date_from);
    const explicitTo = dstr(req.query.date_to);
    const usePlan = req.query.period === 'plan' || (!explicitFrom && !explicitTo);
    if (usePlan) {
      const cycleOffset = Number(req.query.cycle_offset || 0);
      try {
        const [prows] = await db.query(
          `SELECT DATE_FORMAT(period_start, '%Y-%m-%d') AS period_start,
                  DATE_FORMAT(period_end, '%Y-%m-%d') AS period_end
             FROM office_plans WHERE office_id = ?
             ORDER BY (period_start <= ?) DESC, period_start DESC, updated_at DESC
             LIMIT 1`,
          [officeId, today()]
        );
        if (prows[0] && prows[0].period_start && prows[0].period_end) {
          const win = resolveRollingWindow(prows[0].period_start, prows[0].period_end, today(), cycleOffset);
          periodInfo = {
            label: 'plan', from: win.from, to: win.to, today: today(),
            cycle_index: win.cycle_index, current_cycle_index: win.current_cycle_index,
            duration_days: win.duration_days,
          };
        }
      } catch (_) { /* fallback below */ }
    }
    reqFrom = periodInfo ? periodInfo.from : (explicitFrom || startDate);
    reqTo = periodInfo ? periodInfo.to : (explicitTo || today());
    const calcTo = reqTo;

    const incomeMap = await loadIncome(officeId, startDate, calcTo);
    const expenseMap = await loadExpenses(officeId, startDate, calcTo);
    const transferMap = await loadTransfers(officeId, startDate, calcTo);

    // все активные даты (есть поступления или расходы) в пределах [startDate, calcTo]
    const activeDates = Array.from(new Set([
      ...Object.keys(incomeMap),
      ...Object.keys(expenseMap),
      ...Object.keys(transferMap),
    ])).filter(d => d >= startDate && d <= calcTo).sort();

    const running = { ...opening };
    const days = [];
    const totals = { income: zero(), expense: zero(), transfer: zero() };

    for (const date of activeDates) {
      const inc = incomeMap[date] || zero();
      const exp = expenseMap[date] || zero();
      const transfer = transferMap[date] || { delta: zero(), total: 0 };
      const dayOpening = { ...running };
      const dayClosing = {
        cash: dayOpening.cash + inc.cash - exp.cash + transfer.delta.cash,
        noncash: dayOpening.noncash + inc.noncash - exp.noncash + transfer.delta.noncash,
        bank: dayOpening.bank + inc.bank - exp.bank + transfer.delta.bank,
      };
      Object.assign(running, dayClosing);

      // показываем только запрошенный диапазон
      if (date >= reqFrom && date <= reqTo) {
        days.push({ date, opening: dayOpening, income: inc, expense: exp, transfer: transfer.delta, transfer_total: transfer.total, closing: dayClosing });
        BUCKETS.forEach(b => { totals.income[b] += inc[b]; totals.expense[b] += exp[b]; });
        BUCKETS.forEach(b => { totals.transfer[b] += transfer.delta[b]; });
      }
    }

    // Текущий остаток = остаток после последней активной даты на/до сегодня
    const current = { ...opening };
    const allActiveToToday = Array.from(new Set([
      ...Object.keys(incomeMap), ...Object.keys(expenseMap),
      ...Object.keys(transferMap),
    ])).filter(d => d >= startDate && d <= today()).sort();
    for (const date of allActiveToToday) {
      const inc = incomeMap[date] || zero();
      const exp = expenseMap[date] || zero();
      current.cash += inc.cash - exp.cash;
      current.noncash += inc.noncash - exp.noncash;
      current.bank += inc.bank - exp.bank;
      const transfer = transferMap[date] || { delta: zero(), total: 0 };
      current.cash += transfer.delta.cash;
      current.noncash += transfer.delta.noncash;
      current.bank += transfer.delta.bank;
    }

    return ok(res, {
      office_id: officeId,
      has_opening: !!op,
      start_date: op ? startDate : null,
      date_from: reqFrom,
      date_to: reqTo,
      opening,
      current,
      current_total: current.cash + current.noncash + current.bank,
      totals,
      period: periodInfo,
      days: days.reverse(), // свежие сверху
    });
  } catch (e) {
    return bad(res, 500, 'Ошибка расчёта баланса', e);
  }
};

// ─── GET /api/office/:officeId/balance/day?date=YYYY-MM-DD ───  построчная расшифровка дня
const getDayDetail = async (req, res) => {
  if (!BALANCE_ROLES.has(String(req.user?.role||'').toLowerCase())) return bad(res,403,'Нет доступа к Балансу');
  try {
    const officeId = Number(req.params.officeId);
    const date = dstr(req.query.date);
    if (!officeId || !date) return bad(res, 400, 'Нужны office_id и date');
    if (!await checkOfficeAccess(req.user, officeId)) return bad(res, 403, 'Доступ запрещён');

    const [contractRows] = await db.query(
      `SELECT p.id, p.contract_id, c.contract_number, p.payment_method, p.amount,
              p.payment_type, p.comment,
              TIME_FORMAT(p.created_at, '%H:%i') AS t,
              COALESCE(
                NULLIF(TRIM(CONCAT_WS(' ', creator.last_name, creator.first_name)), ''),
                NULLIF(TRIM(CONCAT_WS(' ', employee.last_name, employee.first_name, employee.middle_name)), '')
              ) AS employee_name,
              cl.name AS client_name
         FROM contract_payments p
         JOIN contracts c ON c.id = p.contract_id
         LEFT JOIN users creator ON creator.id = p.created_by
         LEFT JOIN employees employee ON employee.id = c.id_employee
         LEFT JOIN clients cl ON cl.id = c.id_client
        WHERE c.office_id = ? AND p.payment_date = ? AND p.confirmed = 1
        ORDER BY p.created_at, p.id`,
      [officeId, date]
    );
    const [manualIncome] = await db.query(
      `SELECT id, payment_method, amount, title, description, TIME_FORMAT(created_at, '%H:%i') AS t FROM office_income
        WHERE office_id = ? AND income_date = ? ORDER BY id`,
      [officeId, date]
    );
    const [expenseRows] = await db.query(
      `SELECT id, category, payment_method, amount, title, description, is_auto, expense_type, TIME_FORMAT(created_at, '%H:%i') AS t
         FROM expenses WHERE office_id = ? AND spent_on = ? ORDER BY id`,
      [officeId, date]
    );
    const [transferRows] = await db.query(
      `SELECT id, source_bucket, destination_bucket, amount, comment,
              TIME_FORMAT(created_at, '%H:%i') AS t
         FROM office_transfers WHERE office_id = ? AND transfer_date = ? ORDER BY id`,
      [officeId, date]
    );

    return ok(res, {
      date,
      income: {
        contracts: contractRows.map(r => ({
          id: r.id, contract_id: r.contract_id, type: 'contract',
          payment_type: r.payment_type, payment_method: r.payment_method,
          amount: num(r.amount), title: `Договор ${r.contract_number || r.contract_id}`,
          client_name: (r.client_name || '').trim() || null,
          lawyer_name: (r.employee_name || '').trim() || null,
          description: r.comment || null,
          time: r.t || null,
        })),
        manual: manualIncome.map(r => ({
          id: r.id, type: 'manual', payment_method: normBucket(r.payment_method),
          amount: num(r.amount), title: r.title || 'Поступление', description: r.description || null,
          time: r.t || null,
        })),
      },
      expenses: expenseRows.map(r => ({
        id: r.id, category: r.category, payment_method: normBucket(r.payment_method),
        amount: num(r.amount), title: r.title, description: r.description || null,
        is_auto: !!r.is_auto, expense_type: r.expense_type,
        time: r.t || null,
      })),
      transfers: transferRows.map(r => ({
        id: r.id, source: normBucket(r.source_bucket), destination: normBucket(r.destination_bucket),
        amount: num(r.amount), comment: r.comment || null, time: r.t || null,
      })),
    });
  } catch (e) {
    return bad(res, 500, 'Ошибка расшифровки дня', e);
  }
};

// ─── POST /api/office/:officeId/transfers ───  внутреннее перемещение средств
const createTransfer = async (req, res) => {
  const officeId = Number(req.params.officeId);
  if (!officeId) return bad(res, 400, 'Не указан офис');
  if (!await checkOfficeAccess(req.user, officeId)) return bad(res, 403, 'Доступ запрещён');
  if (!COMPOSITION_ROLES.includes(req.user.role)) return bad(res, 403, 'Перевод средств доступен руководству');

  const { source, destination, amount, transfer_date, comment } = req.body || {};
  if (!BUCKETS.includes(source) || !BUCKETS.includes(destination)) return bad(res, 400, 'Выберите источник и получателя');
  if (source === destination) return bad(res, 400, 'Источник и получатель должны отличаться');
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return bad(res, 400, 'Сумма должна быть больше нуля');
  const date = dstr(transfer_date) || today();

  let client;
  try {
    client = await db.getClient();
    await client.beginTransaction();
    // Сериализуем переводы одного офиса, чтобы два одновременных запроса
    // не смогли списать больше доступного остатка.
    await client.query('SELECT id FROM offices WHERE id = ? FOR UPDATE', [officeId]);
    const [[openingRow]] = await client.query('SELECT * FROM office_balance_opening WHERE office_id = ?', [officeId]);
    const startDate = openingRow ? dstr(openingRow.start_date) : '2000-01-01';
    const balances = openingRow
      ? { cash: num(openingRow.opening_cash), noncash: num(openingRow.opening_noncash), bank: num(openingRow.opening_bank) }
      : zero();
    const add = (pm, signed) => { balances[normBucket(pm)] += Number(signed || 0); };

    const [contracts] = await client.query(
      `SELECT p.payment_method pm, COALESCE(SUM(p.amount),0) s
         FROM contract_payments p
         JOIN contracts c ON c.id = p.contract_id
        WHERE c.office_id = ? AND p.confirmed = 1
          AND p.payment_date BETWEEN ? AND ?
        GROUP BY p.payment_method`,
      [officeId, startDate, date]
    );
    contracts.forEach(r => add(r.pm, r.s));
    const [incomes] = await client.query(
      `SELECT payment_method pm, COALESCE(SUM(amount),0) s FROM office_income
        WHERE office_id = ? AND income_date BETWEEN ? AND ? GROUP BY payment_method`,
      [officeId, startDate, date]
    );
    incomes.forEach(r => add(r.pm, r.s));
    const [expenses] = await client.query(
      `SELECT payment_method pm, COALESCE(SUM(amount),0) s FROM expenses
        WHERE office_id = ? AND spent_on BETWEEN ? AND ? GROUP BY payment_method`,
      [officeId, startDate, date]
    );
    expenses.forEach(r => add(r.pm, -Number(r.s || 0)));
    const [transfers] = await client.query(
      `SELECT source_bucket source_pm, destination_bucket destination_pm, COALESCE(SUM(amount),0) s
         FROM office_transfers WHERE office_id = ? AND transfer_date BETWEEN ? AND ?
        GROUP BY source_bucket, destination_bucket`,
      [officeId, startDate, date]
    );
    transfers.forEach(r => { add(r.source_pm, -Number(r.s || 0)); add(r.destination_pm, Number(r.s || 0)); });

    if (balances[source] + 0.000001 < value) {
      await client.rollback();
      return bad(res, 400, `Недостаточно средств на счёте «${source === 'cash' ? 'Наличные' : source === 'bank' ? 'Расчётный счёт' : 'Банковская карта'}»`);
    }
    const [result] = await client.query(
      `INSERT INTO office_transfers (office_id, source_bucket, destination_bucket, amount, transfer_date, comment, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [officeId, source, destination, value, date, comment ? String(comment).trim() : null, req.user.id || null]
    );
    await client.commit();
    const [[row]] = await db.query('SELECT * FROM office_transfers WHERE id = ?', [result.insertId]);
    return ok(res, row);
  } catch (e) {
    if (client) { try { await client.rollback(); } catch (_) {} }
    return bad(res, 500, 'Ошибка создания перевода средств', e);
  } finally {
    if (client) client.release();
  }
};

// ─── POST /api/office/:officeId/income ───  ручное поступление
const createIncome = async (req, res) => {
  try {
    const officeId = Number(req.params.officeId);
    if (!officeId) return bad(res, 400, 'Не указан офис');
    if (!await checkOfficeAccess(req.user, officeId)) return bad(res, 403, 'Доступ запрещён');
    const { amount, payment_method, income_date, title, description } = req.body;
    if (amount === undefined) return bad(res, 400, 'Укажите сумму');
    const [result] = await db.query(
      `INSERT INTO office_income (office_id, income_date, payment_method, amount, title, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [officeId, dstr(income_date) || today(), normBucket(payment_method), num(amount),
       title || 'Поступление', description || null, req.user.id || null]
    );
    const [[row]] = await db.query('SELECT * FROM office_income WHERE id = ?', [result.insertId]);
    return ok(res, row);
  } catch (e) {
    return bad(res, 500, 'Ошибка создания поступления', e);
  }
};

// ─── DELETE /api/office/:officeId/income/:id ───
const deleteIncome = async (req, res) => {
  try {
    const officeId = Number(req.params.officeId);
    const id = Number(req.params.id);
    if (!officeId || !id) return bad(res, 400, 'Нужны office_id и id');
    if (!await checkOfficeAccess(req.user, officeId)) return bad(res, 403, 'Доступ запрещён');
    const [[income]] = await db.query('SELECT source_type FROM office_income WHERE id=? AND office_id=?',[id,officeId]);
    if (income && income.source_type === 'salary_payment_reversal') {
      return bad(res,409,'Корректировку отмены выплаты нельзя удалить');
    }
    await db.query('DELETE FROM office_income WHERE id = ? AND office_id = ?', [id, officeId]);
    return ok(res, { id });
  } catch (e) {
    return bad(res, 500, 'Ошибка удаления поступления', e);
  }
};

module.exports = {
  getOpening,
  setOpening,
  getBalance,
  getDayDetail,
  createIncome,
  deleteIncome,
  createTransfer,
};
