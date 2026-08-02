/**
 * Контроллер «Зарплата».
 *
 * - Настройки офиса (`office_salary_settings`) — проценты, пороги бонусов, ставка смены, цена пакета.
 * - Оклад/индивидуальные переопределения сотрудника (`employee_salaries`).
 * - Журнал смен администраторов (`shifts`).
 * - Расчёт зарплаты за период по ролям: юрист, ОКК, менеджер, представитель, администратор, эксперт.
 *
 * Базовые формулы (значения по умолчанию, можно менять директором):
 *   юрист/ОКК:  oklad + sum(подтв.актов где responsible=он, period) * P,
 *               где P = bonus_percent если sum < bonus_threshold, иначе percent (10%/12%).
 *   менеджер:   oklad + общая касса офиса за период * manager_office_percent;
 *               + если он responsible на конкретных актах — за эти акты доля как у юриста.
 *   представитель: oklad + sum(подтв.актов где responsible=он) * representative_percent (20%).
 *   админ ресепшена: count(смен в периоде) * admin_shift_rate.
 *   эксперт:    count(подтв.актов типа docs где responsible=он, period) * expert_per_doc_amount.
 *               Эксперт может работать на несколько офисов одного владельца — учитываем все его акты.
 */
const db = require('../db');
const { checkOfficeAccess, getUserOfficeIds } = require('../utils/ensureOffice');
const { resolveRollingWindow, todayIsoInTz } = require('../utils/planPeriod');

const ok = (res, data) => res.json({ success: true, data });
const bad = (res, code, message, err) => {
  if (err) console.error(message, err.message || err);
  return res.status(code).json({ success: false, message });
};

const ROLE_LAWYER = 'lawyer';
const ROLE_OKK = 'okk';
const ROLE_MANAGER = 'manager';
const ROLE_REPRESENTATIVE = 'representative';
const ROLE_ADMIN_RECEPTION = 'reception';
const ROLE_EXPERT = 'expert';
const ROLE_DIRECTOR = 'director';

const ROLE_LABELS = {
  [ROLE_LAWYER]: 'Юрист',
  [ROLE_OKK]: 'ОКК',
  [ROLE_MANAGER]: 'Менеджер',
  [ROLE_REPRESENTATIVE]: 'Представитель',
  [ROLE_ADMIN_RECEPTION]: 'Администратор ресепшена',
  [ROLE_EXPERT]: 'Эксперт',
  [ROLE_DIRECTOR]: 'Директор',
};

function normalizeRole(position, userRole) {
  const p = String(position || '').toLowerCase();
  if (p.includes('юрист') || p.includes('адвокат')) return ROLE_LAWYER;
  if (p.includes('окк') || p.includes('контрол')) return ROLE_OKK;
  if (p.includes('менеджер')) return ROLE_MANAGER;
  if (p.includes('представит')) return ROLE_REPRESENTATIVE;
  if (p.includes('ресепш') || p.includes('админ')) return ROLE_ADMIN_RECEPTION;
  if (p.includes('эксперт')) return ROLE_EXPERT;
  const r = String(userRole || '').toLowerCase();
  if (r === 'lawyer') return ROLE_LAWYER;
  if (r === 'okk') return ROLE_OKK;
  if (r === 'manager') return ROLE_MANAGER;
  if (r === 'representative') return ROLE_REPRESENTATIVE;
  if (r === 'admin') return ROLE_ADMIN_RECEPTION;
  if (r === 'expert') return ROLE_EXPERT;
  if (r === 'director') return ROLE_DIRECTOR;
  return null;
}

async function resolveUserOfficeId(user) {
  if (user.office_id) return Number(user.office_id);
  const [[u]] = await db.query('SELECT office_id FROM users WHERE id = ?', [user.id]);
  if (u && u.office_id) return Number(u.office_id);
  const [[emp]] = await db.query('SELECT office_id FROM employees WHERE id = ?', [user.id]);
  if (emp && emp.office_id) return Number(emp.office_id);
  return null;
}

const isPrivileged = (user) => {
  const r = String(user.role || '').toLowerCase();
  return r === 'admin' || r === 'owner' || r === 'director';
};

const isDirectorLike = (user) => {
  const r = String(user.role || '').toLowerCase();
  return r === 'admin' || r === 'owner' || r === 'director';
};

const isManagerOrAbove = (user) => {
  const r = String(user.role || '').toLowerCase();
  return r === 'admin' || r === 'owner' || r === 'director' || r === 'manager';
};

const DEFAULTS = {
  lawyer_percent: 10,
  lawyer_bonus_threshold: 500000,
  lawyer_bonus_percent: 12,
  okk_percent: 10,
  okk_bonus_threshold: 500000,
  okk_bonus_percent: 12,
  manager_office_percent: 5,
  representative_percent: 20,
  admin_shift_rate: 2000,
  expert_per_doc_amount: 1500,
};

async function getOrCreateSettings(officeId) {
  const [[row]] = await db.query('SELECT * FROM office_salary_settings WHERE office_id = ?', [
    officeId,
  ]);
  if (row) return row;
  await db.query(
    `INSERT INTO office_salary_settings (office_id) VALUES (?)`,
    [officeId]
  );
  const [[fresh]] = await db.query('SELECT * FROM office_salary_settings WHERE office_id = ?', [
    officeId,
  ]);
  return fresh || { office_id: officeId, ...DEFAULTS };
}

// GET /api/offices/:id/salary-settings
const getSettings = async (req, res) => {
  try {
    const officeId = Number(req.params.id);
    const allowed = await checkOfficeAccess(req.user, officeId);
    if (!allowed) return bad(res, 403, 'Чужой офис');
    const row = await getOrCreateSettings(officeId);
    return ok(res, row);
  } catch (e) {
    return bad(res, 500, 'Ошибка получения настроек ЗП', e);
  }
};

// PUT /api/offices/:id/salary-settings (только директор/admin/owner)
const updateSettings = async (req, res) => {
  try {
    if (!isDirectorLike(req.user)) return bad(res, 403, 'Доступно только директору');
    const officeId = Number(req.params.id);
    const allowedSettings = await checkOfficeAccess(req.user, officeId);
    if (!allowedSettings) return bad(res, 403, 'Чужой офис');
    await getOrCreateSettings(officeId);
    const fields = [
      'lawyer_percent',
      'lawyer_bonus_threshold',
      'lawyer_bonus_percent',
      'okk_percent',
      'okk_bonus_threshold',
      'okk_bonus_percent',
      'manager_office_percent',
      'representative_percent',
      'admin_shift_rate',
      'expert_per_doc_amount',
    ];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(Number(req.body[f]));
      }
    }
    if (updates.length) {
      updates.push('updated_by = ?');
      params.push(req.user.id || null);
      params.push(officeId);
      await db.query(
        `UPDATE office_salary_settings SET ${updates.join(', ')} WHERE office_id = ?`,
        params
      );
    }
    const [[row]] = await db.query('SELECT * FROM office_salary_settings WHERE office_id = ?', [
      officeId,
    ]);
    return ok(res, row);
  } catch (e) {
    return bad(res, 500, 'Ошибка обновления настроек ЗП', e);
  }
};

// GET /api/employees/:id/salary
const getEmployeeSalary = async (req, res) => {
  try {
    const empId = Number(req.params.id);
    const [[emp]] = await db.query('SELECT e.*, u.role AS user_role FROM employees e LEFT JOIN users u ON u.id = e.id WHERE e.id = ?', [empId]);
    if (!emp) return bad(res, 404, 'Сотрудник не найден');
    if (emp.office_id) {
      const allowedEmp = await checkOfficeAccess(req.user, emp.office_id);
      if (!allowedEmp) return bad(res, 403, 'Чужой офис');
    }
    const [[row]] = await db.query('SELECT * FROM employee_salaries WHERE employee_id = ?', [
      empId,
    ]);
    return ok(res, row || {
      employee_id: empId,
      base_salary: 0,
      custom_percent: null,
      custom_shift_rate: null,
      custom_per_doc: null,
    });
  } catch (e) {
    return bad(res, 500, 'Ошибка получения оклада', e);
  }
};

// PUT /api/employees/:id/salary
const upsertEmployeeSalary = async (req, res) => {
  try {
    const empId = Number(req.params.id);
    const [[emp]] = await db.query('SELECT e.*, u.role AS user_role FROM employees e LEFT JOIN users u ON u.id = e.id WHERE e.id = ?', [empId]);
    if (!emp) return bad(res, 404, 'Сотрудник не найден');
    if (!isManagerOrAbove(req.user)) return bad(res, 403, 'Недостаточно прав');
    const role = normalizeRole(emp.position, emp.user_role);
    if (role === ROLE_MANAGER && !isDirectorLike(req.user)) {
      return bad(res, 403, 'Оклад менеджера задаёт только директор');
    }
    if (emp.office_id) {
      const allowedUpsert = await checkOfficeAccess(req.user, emp.office_id);
      if (!allowedUpsert) return bad(res, 403, 'Чужой офис');
    }
    const { base_salary, custom_percent, custom_shift_rate, custom_per_doc } = req.body;
    await db.query(
      `INSERT INTO employee_salaries (employee_id, base_salary, custom_percent, custom_shift_rate, custom_per_doc, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         base_salary = VALUES(base_salary),
         custom_percent = VALUES(custom_percent),
         custom_shift_rate = VALUES(custom_shift_rate),
         custom_per_doc = VALUES(custom_per_doc),
         updated_by = VALUES(updated_by)`,
      [
        empId,
        Number(base_salary) || 0,
        custom_percent === null || custom_percent === '' || custom_percent === undefined ? null : Number(custom_percent),
        custom_shift_rate === null || custom_shift_rate === '' || custom_shift_rate === undefined ? null : Number(custom_shift_rate),
        custom_per_doc === null || custom_per_doc === '' || custom_per_doc === undefined ? null : Number(custom_per_doc),
        req.user.id || null,
      ]
    );
    const [[row]] = await db.query('SELECT * FROM employee_salaries WHERE employee_id = ?', [empId]);
    return ok(res, row);
  } catch (e) {
    return bad(res, 500, 'Ошибка сохранения оклада', e);
  }
};

// ----- Смены администраторов -----
// GET /api/shifts?office_id=X&date_from&date_to&employee_id
const listShifts = async (req, res) => {
  try {
    const where = [];
    const params = [];
    if (req.query.office_id) {
      const qOffice = Number(req.query.office_id);
      const allowedShift = await checkOfficeAccess(req.user, qOffice);
      if (!allowedShift) return bad(res, 403, 'Чужой офис');
      where.push('s.office_id = ?');
      params.push(qOffice);
    } else {
      const officeIds = await getUserOfficeIds(req.user);
      if (!officeIds.length) return bad(res, 403, 'Нет привязки к офису');
      where.push(`s.office_id IN (${officeIds.map(() => '?').join(',')})`);
      params.push(...officeIds);
    }
    if (req.query.employee_id) {
      where.push('s.employee_id = ?');
      params.push(Number(req.query.employee_id));
    }
    if (req.query.date_from) { where.push('s.shift_date >= ?'); params.push(req.query.date_from); }
    if (req.query.date_to) { where.push('s.shift_date <= ?'); params.push(req.query.date_to); }
    const sql = `
      SELECT s.id, s.office_id, s.employee_id,
             DATE_FORMAT(s.shift_date, '%Y-%m-%d') AS shift_date,
             s.note,
             CONCAT_WS(' ', e.last_name, e.first_name, e.middle_name) AS employee_full_name,
             e.position
        FROM shifts s
        LEFT JOIN employees e ON e.id = s.employee_id
        LEFT JOIN users u ON u.id = s.employee_id
       ${where.length ? 'WHERE ' + where.join(' AND ') + ' AND (u.is_active = 1 OR u.is_active IS NULL)' : 'WHERE (u.is_active = 1 OR u.is_active IS NULL)'}
       ORDER BY s.shift_date DESC, s.id DESC`;
    const [rows] = await db.query(sql, params);
    return ok(res, rows);
  } catch (e) {
    return bad(res, 500, 'Ошибка получения смен', e);
  }
};

const createShift = async (req, res) => {
  try {
    if (!isManagerOrAbove(req.user)) return bad(res, 403, 'Недостаточно прав');
    const { employee_id, shift_date, note } = req.body;
    if (!employee_id || !shift_date) return bad(res, 400, 'Сотрудник и дата обязательны');
    const [[emp]] = await db.query('SELECT * FROM employees WHERE id = ?', [Number(employee_id)]);
    if (!emp) return bad(res, 404, 'Сотрудник не найден');
    const officeId = emp.office_id;
    if (officeId) {
      const allowedCreate = await checkOfficeAccess(req.user, officeId);
      if (!allowedCreate) return bad(res, 403, 'Чужой офис');
    }
    try {
      await db.query(
        `INSERT INTO shifts (office_id, employee_id, shift_date, note, created_by) VALUES (?, ?, ?, ?, ?)`,
        [officeId, Number(employee_id), shift_date, note || null, req.user.id || null]
      );
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') {
        return bad(res, 409, 'Смена этого сотрудника на эту дату уже есть');
      }
      throw err;
    }
    return ok(res, { ok: true });
  } catch (e) {
    return bad(res, 500, 'Ошибка создания смены', e);
  }
};

const removeShift = async (req, res) => {
  try {
    if (!isManagerOrAbove(req.user)) return bad(res, 403, 'Недостаточно прав');
    const id = Number(req.params.id);
    const [[row]] = await db.query('SELECT * FROM shifts WHERE id = ?', [id]);
    if (!row) return bad(res, 404, 'Смена не найдена');
    if (row.office_id) {
      const allowedDel = await checkOfficeAccess(req.user, row.office_id);
      if (!allowedDel) return bad(res, 403, 'Чужой офис');
    }
    await db.query('DELETE FROM shifts WHERE id = ?', [id]);
    return ok(res, { id });
  } catch (e) {
    return bad(res, 500, 'Ошибка удаления смены', e);
  }
};

// ----- Расчёт зарплаты за период -----
// GET /api/salary?office_id=X&date_from=Y&date_to=Z
const calculate = async (req, res) => {
  try {
    let officeId = Number(req.query.office_id) || null;
    if (!officeId) {
      const ids = await getUserOfficeIds(req.user);
      officeId = ids.length ? ids[0] : null;
    } else {
      const allowedCalc = await checkOfficeAccess(req.user, officeId);
      if (!allowedCalc) return bad(res, 403, 'Чужой офис');
    }
    if (!officeId) return bad(res, 400, 'Не указан офис');

    let dateFrom = req.query.date_from || null;
    let dateTo = req.query.date_to || null;
    let periodLabel = (dateFrom && dateTo) ? 'custom' : 'plan';
    const settings = await getOrCreateSettings(officeId);

    // Per-office timezone (pilot). When set, confirmed acts are bound to the
    // salary period by their CONFIRMATION date (confirmed_at) converted to the
    // office timezone — an act counts in the period when it was confirmed.
    // Offices without a timezone keep legacy behaviour (bind by act_date).
    let officeTz = null;
    try {
      const [[tzRow]] = await db.query('SELECT timezone FROM offices WHERE id = ? LIMIT 1', [officeId]);
      officeTz = tzRow && tzRow.timezone ? tzRow.timezone : null;
    } catch (e) {
      officeTz = null;
    }

    // Salary period binding. Explicit date_from + date_to => manual range
    // (reports). Otherwise bind to the office's ESTABLISHED plan period
    // (office_plans), rolled to the active cycle, computed in office tz.
    // `cycle_offset` lets the UI page through previous/next periods.
    if (!(dateFrom && dateTo)) {
      const todayIso = officeTz ? todayIsoInTz(officeTz) : new Date().toISOString().slice(0, 10);
      const cycleOffset = Number(req.query.cycle_offset || 0);
      try {
        const [planRows] = await db.query(
          `SELECT DATE_FORMAT(period_start, '%Y-%m-%d') AS period_start,
                  DATE_FORMAT(period_end, '%Y-%m-%d') AS period_end
             FROM office_plans
            WHERE office_id = ?
            ORDER BY (period_start <= ?) DESC, period_start DESC, updated_at DESC
            LIMIT 1`,
          [officeId, todayIso]
        );
        if (planRows[0] && planRows[0].period_start && planRows[0].period_end) {
          const win = resolveRollingWindow(planRows[0].period_start, planRows[0].period_end, todayIso, cycleOffset);
          dateFrom = win.from;
          dateTo = win.to;
          periodLabel = 'plan';
        }
      } catch (e) { /* fall back to provided values (legacy) */ }
    }

    // Expression that buckets an act into the salary period.
    const actDateCol = officeTz
      ? "DATE(CONVERT_TZ(COALESCE(a.confirmed_at, a.act_date), '+00:00', ?))"
      : 'a.act_date';

    // 1. Сотрудники офиса (с ролью пользователя, чтобы выделить директора).
    const [employees] = await db.query(
      `SELECT e.*, COALESCE(es.base_salary, 0) AS base_salary,
              es.custom_percent, es.custom_shift_rate, es.custom_per_doc,
              u.role AS user_role
         FROM employees e
         LEFT JOIN employee_salaries es ON es.employee_id = e.id
         LEFT JOIN users u ON u.id = e.id
        WHERE e.office_id = ? AND e.deleted_at IS NULL
          AND (u.is_active = 1 OR u.is_active IS NULL)
          AND (u.role IS NULL OR u.role NOT IN ('cc_manager', 'cc_operator'))`,
      [officeId]
    );

    // 2. Эксперты (могут не иметь office_id или работать на другие офисы — учтём всех экспертов).
    const [allExperts] = await db.query(
      `SELECT e.*, COALESCE(es.base_salary, 0) AS base_salary,
              es.custom_percent, es.custom_shift_rate, es.custom_per_doc
         FROM employees e
         LEFT JOIN employee_salaries es ON es.employee_id = e.id
         LEFT JOIN users u ON u.id = e.id
        WHERE e.position LIKE '%ксперт%' AND e.deleted_at IS NULL AND (u.is_active = 1 OR u.is_active IS NULL)`
    );
    const expertsById = new Map(allExperts.map((e) => [e.id, e]));

    // 3. Касса офиса за период.
    const cashWhere = ['c.office_id = ?'];
    const cashParams = [officeId];
    if (dateFrom) { cashWhere.push('c.contract_date >= ?'); cashParams.push(dateFrom); }
    if (dateTo) { cashWhere.push('c.contract_date <= ?'); cashParams.push(dateTo); }
    const [[cashRow]] = await db.query(
      `SELECT COALESCE(SUM(c.paid_amount), 0) AS office_cash
         FROM contracts c
        WHERE ${cashWhere.join(' AND ')}`,
      cashParams
    );
    const officeCash = Number(cashRow.office_cash || 0);

    // 3b. Расходы офиса за период (для директора: прибыль = касса − расходы).
    const expWhere = ['ex.office_id = ?'];
    const expParams = [officeId];
    if (dateFrom) { expWhere.push('ex.spent_on >= ?'); expParams.push(dateFrom); }
    if (dateTo) { expWhere.push('ex.spent_on <= ?'); expParams.push(dateTo); }
    const [[expRow]] = await db.query(
      `SELECT COALESCE(SUM(ex.amount), 0) AS office_expenses
         FROM expenses ex
        WHERE ${expWhere.join(' AND ')}`,
      expParams
    );
    const officeExpenses = Number(expRow.office_expenses || 0);
    const officeProfit = officeCash - officeExpenses;

    // 4. Подтверждённые акты офиса за период по ответственному.
    const actWhere = ['a.status = "confirmed"', 'a.office_id = ?'];
    const actParams = [officeId];
    if (dateFrom) { actWhere.push(`${actDateCol} >= ?`); if (officeTz) actParams.push(officeTz); actParams.push(dateFrom); }
    if (dateTo) { actWhere.push(`${actDateCol} <= ?`); if (officeTz) actParams.push(officeTz); actParams.push(dateTo); }
    // Совместные договоры: акт, ответственным по которому указан один из двух юристов
    // договора, делится 50/50 по СУММЕ между обоими юристами; КОЛИЧЕСТВО учитывается
    // полностью каждому. Прочие акты (в т.ч. экспертные) — как раньше, по responsible_id.
    const actCond = actWhere.join(' AND ');
    const [actRows] = await db.query(
      `SELECT emp_id AS responsible_id, type, SUM(cnt_unit) AS cnt, COALESCE(SUM(amt), 0) AS sum_amount
         FROM (
           /* 1. Все акты → ответственному (кроме совместных договоров, где ответственный — один из юристов) */
           SELECT a.responsible_id AS emp_id, a.type AS type, 1 AS cnt_unit, a.amount AS amt
             FROM acts a
             LEFT JOIN contracts c ON c.id = a.contract_id
            WHERE ${actCond} AND a.responsible_id IS NOT NULL
              AND NOT (c.is_joint = 1 AND a.responsible_id IN (c.id_employee, c.second_employee_id))
           UNION ALL
           /* 2. Совместные договоры, ответственный = один из юристов → юрист 1 получает 50% */
           SELECT c.id_employee AS emp_id, a.type AS type, 1 AS cnt_unit, a.amount * 0.5 AS amt
             FROM acts a
             JOIN contracts c ON c.id = a.contract_id
            WHERE ${actCond} AND c.is_joint = 1 AND c.id_employee IS NOT NULL
              AND a.responsible_id IN (c.id_employee, c.second_employee_id)
           UNION ALL
           /* 3. Совместные договоры, ответственный = один из юристов → юрист 2 получает 50% */
           SELECT c.second_employee_id AS emp_id, a.type AS type, 1 AS cnt_unit, a.amount * 0.5 AS amt
             FROM acts a
             JOIN contracts c ON c.id = a.contract_id
            WHERE ${actCond} AND c.is_joint = 1 AND c.second_employee_id IS NOT NULL
              AND a.responsible_id IN (c.id_employee, c.second_employee_id)
           UNION ALL
           /* 4. НЕ совместный договор, ответственный НЕ юрист → юрист договора тоже получает зп */
           SELECT c.id_employee AS emp_id, a.type AS type, 1 AS cnt_unit, a.amount AS amt
             FROM acts a
             JOIN contracts c ON c.id = a.contract_id
            WHERE ${actCond} AND c.id_employee IS NOT NULL
              AND (c.is_joint = 0 OR c.is_joint IS NULL)
              AND a.responsible_id IS NOT NULL
              AND a.responsible_id != c.id_employee
           UNION ALL
           /* 5. Совместный договор, ответственный НЕ один из юристов → юрист 1 получает 50% */
           SELECT c.id_employee AS emp_id, a.type AS type, 1 AS cnt_unit, a.amount * 0.5 AS amt
             FROM acts a
             JOIN contracts c ON c.id = a.contract_id
            WHERE ${actCond} AND c.is_joint = 1 AND c.id_employee IS NOT NULL
              AND a.responsible_id IS NOT NULL
              AND a.responsible_id NOT IN (c.id_employee, COALESCE(c.second_employee_id, -1))
           UNION ALL
           /* 6. Совместный договор, ответственный НЕ один из юристов → юрист 2 получает 50% */
           SELECT c.second_employee_id AS emp_id, a.type AS type, 1 AS cnt_unit, a.amount * 0.5 AS amt
             FROM acts a
             JOIN contracts c ON c.id = a.contract_id
            WHERE ${actCond} AND c.is_joint = 1 AND c.second_employee_id IS NOT NULL
              AND a.responsible_id IS NOT NULL
              AND a.responsible_id NOT IN (COALESCE(c.id_employee, -1), c.second_employee_id)
         ) t
        GROUP BY emp_id, type`,
      [...actParams, ...actParams, ...actParams, ...actParams, ...actParams, ...actParams]
    );
    const actsByResp = new Map();
    for (const r of actRows) {
      if (!r.responsible_id) continue;
      if (!actsByResp.has(r.responsible_id)) actsByResp.set(r.responsible_id, { docs: { cnt: 0, sum: 0 }, court_rep: { cnt: 0, sum: 0 } });
      const slot = r.type === 'court_rep' ? 'court_rep' : 'docs';
      actsByResp.get(r.responsible_id)[slot].cnt += Number(r.cnt);
      actsByResp.get(r.responsible_id)[slot].sum += Number(r.sum_amount);
    }

    // 5. Подтверждённые акты по экспертам — могут быть в любом офисе.
    const expertActWhere = ['a.status = "confirmed"', 'a.responsible_id IS NOT NULL'];
    const expertActParams = [];
    if (dateFrom) { expertActWhere.push(`${actDateCol} >= ?`); if (officeTz) expertActParams.push(officeTz); expertActParams.push(dateFrom); }
    if (dateTo) { expertActWhere.push(`${actDateCol} <= ?`); if (officeTz) expertActParams.push(officeTz); expertActParams.push(dateTo); }
    const [expertActs] = await db.query(
      `SELECT a.responsible_id, a.type, COUNT(*) AS cnt, COALESCE(SUM(a.amount), 0) AS sum_amount
         FROM acts a
         JOIN employees e ON e.id = a.responsible_id
        WHERE e.position LIKE '%ксперт%' AND ${expertActWhere.join(' AND ')}
        GROUP BY a.responsible_id, a.type`,
      expertActParams
    );
    const expertActsById = new Map();
    for (const r of expertActs) {
      if (!expertActsById.has(r.responsible_id)) expertActsById.set(r.responsible_id, { docs: { cnt: 0, sum: 0 }, court_rep: { cnt: 0, sum: 0 } });
      const slot = r.type === 'court_rep' ? 'court_rep' : 'docs';
      expertActsById.get(r.responsible_id)[slot].cnt += Number(r.cnt);
      expertActsById.get(r.responsible_id)[slot].sum += Number(r.sum_amount);
    }

    // 6. Смены за период.
    const shiftWhere = ['s.office_id = ?'];
    const shiftParams = [officeId];
    if (dateFrom) { shiftWhere.push('s.shift_date >= ?'); shiftParams.push(dateFrom); }
    if (dateTo) { shiftWhere.push('s.shift_date <= ?'); shiftParams.push(dateTo); }
    const [shiftRows] = await db.query(
      `SELECT employee_id, COUNT(*) AS cnt
         FROM shifts s
        WHERE ${shiftWhere.join(' AND ')}
        GROUP BY employee_id`,
      shiftParams
    );
    const shiftsByEmp = new Map(shiftRows.map((r) => [r.employee_id, Number(r.cnt)]));

    // 7. Считаем для каждого сотрудника (директора исключаем).
    const computeFor = (emp) => {
      const role = normalizeRole(emp.position, emp.user_role);
      if (role === ROLE_DIRECTOR) return null;
      const baseSalary = Number(emp.base_salary || 0);
      const out = {
        employee_id: emp.id,
        full_name: [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' '),
        position: emp.position,
        role,
        role_label: role ? ROLE_LABELS[role] : 'Без роли',
        base_salary: baseSalary,
        bonus: 0,
        bonus_breakdown: [],
        total: baseSalary,
        // диагностика
        acts_sum_docs: 0,
        acts_count_docs: 0,
        acts_sum_court: 0,
        acts_count_court: 0,
      };
      const acts = actsByResp.get(emp.id) || { docs: { cnt: 0, sum: 0 }, court_rep: { cnt: 0, sum: 0 } };
      out.acts_sum_docs = acts.docs.sum;
      out.acts_count_docs = acts.docs.cnt;
      out.acts_sum_court = acts.court_rep.sum;
      out.acts_count_court = acts.court_rep.cnt;

      const lawyerLikeBonus = (lawyerSettings) => {
        const totalSum = (acts.docs.sum + acts.court_rep.sum);
        const customP = emp.custom_percent !== null && emp.custom_percent !== undefined ? Number(emp.custom_percent) : null;
        const percent = customP !== null
          ? customP
          : (totalSum < Number(lawyerSettings.threshold) ? Number(lawyerSettings.bonus_percent) : Number(lawyerSettings.percent));
        const bonus = Math.round(totalSum * percent) / 100;
        out.bonus_breakdown.push({
          label: `Акты (${percent}% от ${totalSum.toFixed(0)} ₽)`,
          value: bonus,
        });
        out.bonus += bonus;
      };

      switch (role) {
        case ROLE_LAWYER:
          lawyerLikeBonus({
            percent: settings.lawyer_percent,
            bonus_percent: settings.lawyer_bonus_percent,
            threshold: settings.lawyer_bonus_threshold,
          });
          break;
        case ROLE_OKK:
          lawyerLikeBonus({
            percent: settings.okk_percent,
            bonus_percent: settings.okk_bonus_percent,
            threshold: settings.okk_bonus_threshold,
          });
          break;
        case ROLE_REPRESENTATIVE: {
          const totalSum = acts.docs.sum + acts.court_rep.sum;
          const customP = emp.custom_percent !== null && emp.custom_percent !== undefined ? Number(emp.custom_percent) : null;
          const percent = customP !== null ? customP : Number(settings.representative_percent);
          const bonus = Math.round(totalSum * percent) / 100;
          out.bonus_breakdown.push({ label: `Акты (${percent}% от ${totalSum.toFixed(0)} ₽)`, value: bonus });
          out.bonus += bonus;
          break;
        }
        case ROLE_MANAGER: {
          const customP = emp.custom_percent !== null && emp.custom_percent !== undefined ? Number(emp.custom_percent) : null;
          const officePercent = customP !== null ? customP : Number(settings.manager_office_percent);
          const officeBonus = Math.round(officeCash * officePercent) / 100;
          out.bonus_breakdown.push({ label: `Касса офиса (${officePercent}% от ${officeCash.toFixed(0)} ₽)`, value: officeBonus });
          out.bonus += officeBonus;
          // Если менеджер сам ответственный по актам — добавляем долю как у юриста.
          const totalSum = acts.docs.sum + acts.court_rep.sum;
          if (totalSum > 0) {
            const p = totalSum < Number(settings.lawyer_bonus_threshold) ? Number(settings.lawyer_bonus_percent) : Number(settings.lawyer_percent);
            const personalBonus = Math.round(totalSum * p) / 100;
            out.bonus_breakdown.push({ label: `Личные акты (${p}% от ${totalSum.toFixed(0)} ₽)`, value: personalBonus });
            out.bonus += personalBonus;
          }
          break;
        }
        // Директор исключён из расчёта зарплаты (фильтруется выше)
        case ROLE_ADMIN_RECEPTION: {
          out.base_salary = 0;
          const shifts = shiftsByEmp.get(emp.id) || 0;
          const customRate = emp.custom_shift_rate !== null && emp.custom_shift_rate !== undefined ? Number(emp.custom_shift_rate) : null;
          const rate = customRate !== null ? customRate : Number(settings.admin_shift_rate);
          const bonus = shifts * rate;
          out.bonus_breakdown.push({ label: `Смены (${shifts} × ${rate.toFixed(0)} ₽)`, value: bonus });
          out.bonus += bonus;
          break;
        }
        default:
          break;
      }

      out.total = (out.base_salary !== undefined ? Number(out.base_salary) : baseSalary) + out.bonus;
      return out;
    };

    const results = employees.map(computeFor).filter(Boolean);

    // Эксперты — не привязаны к офису, считаем всех с подтв. актами в системе.
    for (const e of allExperts) {
      const exActs = expertActsById.get(e.id) || { docs: { cnt: 0, sum: 0 }, court_rep: { cnt: 0, sum: 0 } };
      const cnt = exActs.docs.cnt;
      if (!cnt && (!e.office_id || Number(e.office_id) !== Number(officeId))) {
        // Эксперт без актов и без привязки к этому офису — в этом расчёте показываем только если он был активен.
        continue;
      }
      const baseSalary = Number(e.base_salary || 0);
      const customRate = e.custom_per_doc !== null && e.custom_per_doc !== undefined ? Number(e.custom_per_doc) : null;
      const perDoc = customRate !== null ? customRate : Number(settings.expert_per_doc_amount);
      const bonus = cnt * perDoc;
      // Если эксперт уже учтён как сотрудник этого офиса — пропускаем дубликат.
      if (results.some((r) => r.employee_id === e.id)) continue;
      results.push({
        employee_id: e.id,
        full_name: [e.last_name, e.first_name, e.middle_name].filter(Boolean).join(' '),
        position: e.position,
        role: ROLE_EXPERT,
        role_label: ROLE_LABELS[ROLE_EXPERT],
        base_salary: baseSalary,
        bonus,
        bonus_breakdown: [
          { label: `Документы (${cnt} × ${perDoc.toFixed(0)} ₽)`, value: bonus },
        ],
        total: baseSalary + bonus,
        acts_count_docs: cnt,
        acts_sum_docs: exActs.docs.sum,
        acts_count_court: 0,
        acts_sum_court: 0,
        external: e.office_id ? Number(e.office_id) !== Number(officeId) : true,
      });
    }

    // Эксперты, числящиеся в этом офисе по штату — пересчёт через expertActs.
    for (const r of results) {
      if (r.role === ROLE_EXPERT && !r.bonus_breakdown.length) {
        const e = expertsById.get(r.employee_id);
        const exActs = expertActsById.get(r.employee_id) || { docs: { cnt: 0, sum: 0 }, court_rep: { cnt: 0, sum: 0 } };
        const cnt = exActs.docs.cnt;
        const customRate = e?.custom_per_doc !== null && e?.custom_per_doc !== undefined ? Number(e.custom_per_doc) : null;
        const perDoc = customRate !== null ? customRate : Number(settings.expert_per_doc_amount);
        const bonus = cnt * perDoc;
        r.bonus = bonus;
        r.bonus_breakdown = [{ label: `Документы (${cnt} × ${perDoc.toFixed(0)} ₽)`, value: bonus }];
        r.acts_count_docs = cnt;
        r.acts_sum_docs = exActs.docs.sum;
        r.total = Number(r.base_salary || 0) + bonus;
      }
    }

    // Сортируем по итоговой ЗП по убыванию.
    results.sort((a, b) => b.total - a.total);

    // Выплаты не создаются при расчёте. Подтягиваем уже проведённые и отменённые
    // выплаты этого периода, чтобы интерфейс показывал их рядом с начислением.
    const [paymentRows] = await db.query(
      `SELECT sp.*, e.first_name, e.last_name, e.middle_name,
              TRIM(CONCAT_WS(' ', pu.last_name, pu.first_name)) paid_by_name,
              TRIM(CONCAT_WS(' ', cu.last_name, cu.first_name)) cancelled_by_name
         FROM salary_payments sp
         JOIN employees e ON e.id=sp.employee_id
         LEFT JOIN users pu ON pu.id=sp.paid_by
         LEFT JOIN users cu ON cu.id=sp.cancelled_by
        WHERE sp.office_id=? AND sp.period_from=? AND sp.period_to=?
        ORDER BY sp.paid_at DESC`,
      [officeId, dateFrom, dateTo]
    );
    const paymentsByEmployee = new Map();
    for (const payment of paymentRows) {
      if (!paymentsByEmployee.has(Number(payment.employee_id))) paymentsByEmployee.set(Number(payment.employee_id), []);
      paymentsByEmployee.get(Number(payment.employee_id)).push(payment);
    }
    for (const row of results) {
      row.salary_payments = paymentsByEmployee.get(Number(row.employee_id)) || [];
      row.active_payment = row.salary_payments.find(payment => payment.status === 'paid') || null;
    }

    return ok(res, {
      office_id: officeId,
      date_from: dateFrom,
      date_to: dateTo,
      period_label: periodLabel,
      office_cash: officeCash,
      office_expenses: officeExpenses,
      office_profit: officeProfit,
      settings,
      rows: results,
    });
  } catch (e) {
    return bad(res, 500, 'Ошибка расчёта зарплаты', e);
  }
};


const PAYOUT_ROLES = new Set(['director', 'manager', 'okk']);
const PAYMENT_METHODS = new Set(['cash', 'noncash', 'bank']);
const canPaySalary = user => PAYOUT_ROLES.has(String(user?.role || '').toLowerCase());

async function calculatePayload(req, query) {
  let payload = null;
  let statusCode = 200;
  const fakeReq = { ...req, query };
  const fakeRes = {
    status(code) { statusCode = code; return this; },
    json(body) { payload = body; return body; },
  };
  await calculate(fakeReq, fakeRes);
  if (statusCode >= 400 || !payload?.success) {
    throw new Error(payload?.message || 'Не удалось пересчитать зарплату');
  }
  return payload.data;
}

const listSalaryPayments = async (req, res) => {
  try {
    const officeId = Number(req.query.office_id || await resolveUserOfficeId(req.user));
    if (!officeId || !await checkOfficeAccess(req.user, officeId)) return bad(res, 403, 'Нет доступа к офису');
    const where = ['sp.office_id=?']; const params = [officeId];
    if (req.query.date_from) { where.push('sp.period_from>=?'); params.push(req.query.date_from); }
    if (req.query.date_to) { where.push('sp.period_to<=?'); params.push(req.query.date_to); }
    if (req.query.employee_id) { where.push('sp.employee_id=?'); params.push(Number(req.query.employee_id)); }
    const [rows] = await db.query(
      `SELECT sp.*, TRIM(CONCAT_WS(' ',e.last_name,e.first_name,e.middle_name)) employee_name,
              TRIM(CONCAT_WS(' ',pu.last_name,pu.first_name)) paid_by_name,
              TRIM(CONCAT_WS(' ',cu.last_name,cu.first_name)) cancelled_by_name
         FROM salary_payments sp JOIN employees e ON e.id=sp.employee_id
         LEFT JOIN users pu ON pu.id=sp.paid_by LEFT JOIN users cu ON cu.id=sp.cancelled_by
        WHERE ${where.join(' AND ')} ORDER BY sp.paid_at DESC`, params
    );
    return ok(res, rows);
  } catch (e) { return bad(res, 500, 'Ошибка получения выплат', e); }
};

const paySalary = async (req, res) => {
  if (!canPaySalary(req.user)) return bad(res, 403, 'Выплачивать зарплату могут директор, менеджер или руководитель');
  const officeId = Number(req.body.office_id || await resolveUserOfficeId(req.user));
  const employeeId = Number(req.body.employee_id);
  const periodFrom = String(req.body.period_from || '').slice(0,10);
  const periodTo = String(req.body.period_to || '').slice(0,10);
  const paymentMethod = String(req.body.payment_method || '');
  if (!officeId || !employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(periodFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(periodTo) || periodTo < periodFrom) {
    return bad(res, 400, 'Проверьте сотрудника и период');
  }
  if (!PAYMENT_METHODS.has(paymentMethod)) return bad(res, 400, 'Выберите способ выплаты');
  if (!await checkOfficeAccess(req.user, officeId)) return bad(res, 403, 'Нет доступа к офису');

  const calculated = await calculatePayload(req, { office_id: officeId, date_from: periodFrom, date_to: periodTo });
  const row = (calculated.rows || []).find(item => Number(item.employee_id) === employeeId);
  if (!row || Number(row.total || 0) <= 0) return bad(res, 400, 'Нет начисления для выплаты');
  const amount = Math.round(Number(row.total) * 100) / 100;
  const connection = await db.getClient();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.query(
      `SELECT id FROM salary_payments WHERE office_id=? AND employee_id=?
        AND period_from=? AND period_to=? AND status='paid' AND active_flag=1 FOR UPDATE`,
      [officeId, employeeId, periodFrom, periodTo]
    );
    if (existing.length) { await connection.rollback(); return bad(res, 409, 'Зарплата этому сотруднику за период уже выплачена'); }
    const snapshot = JSON.stringify({
      employee_id: row.employee_id, full_name: row.full_name, role: row.role,
      base_salary: row.base_salary, bonus: row.bonus,
      bonus_breakdown: row.bonus_breakdown, total: amount,
      acts_sum_docs: row.acts_sum_docs, acts_sum_court: row.acts_sum_court,
    });
    const [paymentResult] = await connection.query(
      `INSERT INTO salary_payments
       (office_id,employee_id,period_from,period_to,amount,payment_method,status,calculation_snapshot,paid_by)
       VALUES (?,?,?,?,?,?,'paid',?,?)`,
      [officeId,employeeId,periodFrom,periodTo,amount,paymentMethod,snapshot,req.user.id]
    );
    const paymentId = paymentResult.insertId;
    const [expenseResult] = await connection.query(
      `INSERT INTO expenses
       (office_id,category,amount,expense_type,payment_method,is_auto,source_type,source_id,title,description,spent_on,created_by)
       VALUES (?,'Зарплаты',?,'Разовый',?,1,'salary_payment',?, ?, ?, CURRENT_DATE(),?)`,
      [officeId,amount,paymentMethod,paymentId,
       `Выплата зарплаты: ${row.full_name}`,
       `Период ${periodFrom} — ${periodTo}. Оклад ${row.base_salary}; бонус ${row.bonus}.`,req.user.id]
    );
    await connection.query('UPDATE salary_payments SET expense_id=? WHERE id=?',[expenseResult.insertId,paymentId]);
    await connection.commit();
    return res.status(201).json({ success:true, data:{ id:paymentId, amount, payment_method:paymentMethod, status:'paid' } });
  } catch (e) {
    try { await connection.rollback(); } catch (_) {}
    return bad(res, 500, 'Ошибка выплаты зарплаты', e);
  } finally { connection.release(); }
};

const cancelSalaryPayment = async (req, res) => {
  if (!canPaySalary(req.user)) return bad(res, 403, 'Отменять выплату могут директор, менеджер или руководитель');
  const reason = String(req.body.reason || '').trim();
  if (reason.length < 5) return bad(res, 400, 'Укажите причину отмены минимум из 5 символов');
  const connection = await db.getClient();
  try {
    await connection.beginTransaction();
    const [[payment]] = await connection.query('SELECT * FROM salary_payments WHERE id=? FOR UPDATE',[req.params.id]);
    if (!payment || !await checkOfficeAccess(req.user, payment.office_id)) { await connection.rollback(); return bad(res,404,'Выплата не найдена'); }
    if (payment.status !== 'paid' || payment.cancelled_at || payment.reversal_income_id) { await connection.rollback(); return bad(res,409,'Выплата уже отменена'); }
    const [realIncome] = await connection.query(
      `INSERT INTO office_income (office_id,income_date,payment_method,amount,title,description,created_by,source_type,source_id)
       VALUES (?,CURRENT_DATE(),?,?,?,?,?,'salary_payment_reversal',?)`,
      [payment.office_id,payment.payment_method,payment.amount,
       `Отмена выплаты зарплаты #${payment.id}`,
       `Возврат в баланс. Причина: ${reason}`,req.user.id,payment.id]
    );
    const reversalId = realIncome.insertId;
    await connection.query(
      `UPDATE salary_payments SET status='cancelled',active_flag=NULL,cancelled_by=?,cancelled_at=NOW(),
       cancellation_reason=?,reversal_income_id=? WHERE id=?`,
      [req.user.id,reason,reversalId,payment.id]
    );
    await connection.commit();
    return ok(res,{ id:payment.id,status:'cancelled',reversal_income_id:reversalId });
  } catch (e) {
    try { await connection.rollback(); } catch (_) {}
    return bad(res,500,'Ошибка отмены выплаты',e);
  } finally { connection.release(); }
};

module.exports = {
  getSettings,
  updateSettings,
  getEmployeeSalary,
  upsertEmployeeSalary,
  listShifts,
  createShift,
  removeShift,
  calculate,
  listSalaryPayments,
  paySalary,
  cancelSalaryPayment,
};
