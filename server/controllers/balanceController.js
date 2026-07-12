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
 *   Поступления = оплаты по договорам (contracts.paid_amount по payment_method, на contract_date)
 *               + ручные поступления (office_income)
 *   Расходы     = expenses.amount по payment_method, на spent_on (зарплаты/возвраты падают сюда авто)
 *   Стартовый остаток задаётся один раз (office_balance_opening).
 *
 * Налог: TAX_RATE от поступлений по Р/С (bank) за день. Накопительно за период.
 */
const db = require('../db');
const { checkOfficeAccess } = require('../utils/ensureOffice');
const { resolveRollingWindow } = require('../utils/planPeriod');

const ok = (res, data) => res.json({ success: true, data });
const bad = (res, code, message, err) => {
  if (err) console.error(message, err.message || err);
  return res.status(code).json({ success: false, message });
};

const TAX_RATE = 0.11; // 11 % от поступлений по Р/С
const BUCKETS = ['cash', 'noncash', 'bank'];
const COMPOSITION_ROLES = ['director', 'manager', 'okk']; // кто может задавать стартовый остаток

const zero = () => ({ cash: 0, noncash: 0, bank: 0 });
const normBucket = (pm) => (BUCKETS.includes(pm) ? pm : 'cash');
const num = (v) => Number(v || 0);
const today = () => new Date().toISOString().slice(0, 10);
const dstr = (d) => {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
};

// Разрешить офис из query/body или из токена пользователя
async function resolveOffice(req, res) {
  const officeId = Number(req.query.office_id || req.body.office_id || req.user.office_id);
  if (!officeId) { bad(res, 400, 'Не указан офис'); return null; }
  const allowed = await checkOfficeAccess(req.user, officeId);
  if (!allowed) { bad(res, 403, 'Доступ запрещён'); return null; }
  return officeId;
}

// ─── GET /api/office/:officeId/balance/opening ───
const getOpening = async (req, res) => {
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
    `SELECT contract_date d, payment_method pm, COALESCE(SUM(paid_amount),0) s
       FROM contracts
      WHERE office_id = ? AND paid_amount > 0 AND contract_date BETWEEN ? AND ?
      GROUP BY contract_date, payment_method`,
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

// ─── GET /api/office/:officeId/balance?date_from&date_to ───
const getBalance = async (req, res) => {
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

    // все активные даты (есть поступления или расходы) в пределах [startDate, calcTo]
    const activeDates = Array.from(new Set([
      ...Object.keys(incomeMap),
      ...Object.keys(expenseMap),
    ])).filter(d => d >= startDate && d <= calcTo).sort();

    const running = { ...opening };
    const days = [];
    const totals = { income: zero(), expense: zero(), tax: 0 };

    for (const date of activeDates) {
      const inc = incomeMap[date] || zero();
      const exp = expenseMap[date] || zero();
      const dayOpening = { ...running };
      const dayClosing = {
        cash: dayOpening.cash + inc.cash - exp.cash,
        noncash: dayOpening.noncash + inc.noncash - exp.noncash,
        bank: dayOpening.bank + inc.bank - exp.bank,
      };
      const tax = Math.round(inc.bank * TAX_RATE * 100) / 100;
      Object.assign(running, dayClosing);

      // показываем только запрошенный диапазон
      if (date >= reqFrom && date <= reqTo) {
        days.push({ date, opening: dayOpening, income: inc, expense: exp, closing: dayClosing, tax });
        BUCKETS.forEach(b => { totals.income[b] += inc[b]; totals.expense[b] += exp[b]; });
        totals.tax += tax;
      }
    }

    // Текущий остаток = остаток после последней активной даты на/до сегодня
    const current = { ...opening };
    const allActiveToToday = Array.from(new Set([
      ...Object.keys(incomeMap), ...Object.keys(expenseMap),
    ])).filter(d => d >= startDate && d <= today()).sort();
    for (const date of allActiveToToday) {
      const inc = incomeMap[date] || zero();
      const exp = expenseMap[date] || zero();
      current.cash += inc.cash - exp.cash;
      current.noncash += inc.noncash - exp.noncash;
      current.bank += inc.bank - exp.bank;
    }

    return ok(res, {
      office_id: officeId,
      has_opening: !!op,
      start_date: op ? startDate : null,
      tax_rate: TAX_RATE,
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
  try {
    const officeId = Number(req.params.officeId);
    const date = dstr(req.query.date);
    if (!officeId || !date) return bad(res, 400, 'Нужны office_id и date');
    if (!await checkOfficeAccess(req.user, officeId)) return bad(res, 403, 'Доступ запрещён');

    const [contractRows] = await db.query(
      `SELECT c.id, c.contract_number, c.payment_method, c.paid_amount amount,
              TIME_FORMAT(c.created_at, '%H:%i') AS t,
              CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) AS lawyer_name,
              cl.name AS client_name
         FROM contracts c
         LEFT JOIN users u ON u.id = c.id_employee
         LEFT JOIN clients cl ON cl.id = c.id_client
        WHERE c.office_id = ? AND c.contract_date = ? AND c.paid_amount > 0
        ORDER BY c.id`,
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

    return ok(res, {
      date,
      income: {
        contracts: contractRows.map(r => ({
          id: r.id, type: 'contract', payment_method: normBucket(r.payment_method),
          amount: num(r.amount), title: `Договор ${r.contract_number || r.id}`,
          client_name: (r.client_name || '').trim() || null,
          lawyer_name: (r.lawyer_name || '').trim() || null,
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
    });
  } catch (e) {
    return bad(res, 500, 'Ошибка расшифровки дня', e);
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
};
