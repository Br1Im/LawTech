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
const { createAutoExpense } = require('./expensesController');

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
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
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

    const dateFrom = req.query.date_from || null;
    const dateTo = req.query.date_to || null;
    const settings = await getOrCreateSettings(officeId);

    // 1. Сотрудники офиса (с ролью пользователя, чтобы выделить директора).
    const [employees] = await db.query(
      `SELECT e.*, COALESCE(es.base_salary, 0) AS base_salary,
              es.custom_percent, es.custom_shift_rate, es.custom_per_doc,
              u.role AS user_role
         FROM employees e
         LEFT JOIN employee_salaries es ON es.employee_id = e.id
         LEFT JOIN users u ON u.id = e.id
        WHERE e.office_id = ?`,
      [officeId]
    );

    // 2. Эксперты (могут не иметь office_id или работать на другие офисы — учтём всех экспертов).
    const [allExperts] = await db.query(
      `SELECT e.*, COALESCE(es.base_salary, 0) AS base_salary,
              es.custom_percent, es.custom_shift_rate, es.custom_per_doc
         FROM employees e
         LEFT JOIN employee_salaries es ON es.employee_id = e.id
        WHERE e.position LIKE '%ксперт%'`
    );
    const expertsById = new Map(allExperts.map((e) => [e.id, e]));

    // 3. Касса офиса за период.
    const cashWhere = ['emp.office_id = ?'];
    const cashParams = [officeId];
    if (dateFrom) { cashWhere.push('c.contract_date >= ?'); cashParams.push(dateFrom); }
    if (dateTo) { cashWhere.push('c.contract_date <= ?'); cashParams.push(dateTo); }
    const [[cashRow]] = await db.query(
      `SELECT COALESCE(SUM(c.paid_amount), 0) AS office_cash
         FROM contracts c
         LEFT JOIN employees emp ON emp.id = c.id_employee
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
    if (dateFrom) { actWhere.push('a.act_date >= ?'); actParams.push(dateFrom); }
    if (dateTo) { actWhere.push('a.act_date <= ?'); actParams.push(dateTo); }
    const [actRows] = await db.query(
      `SELECT a.responsible_id, a.type, COUNT(*) AS cnt, COALESCE(SUM(a.amount), 0) AS sum_amount
         FROM acts a
        WHERE ${actWhere.join(' AND ')}
        GROUP BY a.responsible_id, a.type`,
      actParams
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
    if (dateFrom) { expertActWhere.push('a.act_date >= ?'); expertActParams.push(dateFrom); }
    if (dateTo) { expertActWhere.push('a.act_date <= ?'); expertActParams.push(dateTo); }
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

    // Авто-расход «Зарплаты» — создаем/обновляем при расчете
    const totalSalaries = results.reduce((s, r) => s + Number(r.total || 0), 0);
    if (totalSalaries > 0 && dateFrom) {
      const salaryDate = dateFrom;
      // source_id = officeId * 1000000 + YYYYMM (уникален для офис+месяц)
      const dt = new Date(dateFrom);
      const sourceId = officeId * 1000000 + dt.getFullYear() * 100 + (dt.getMonth() + 1);
      const empNames = results.filter(r => r.total > 0).map(r => r.full_name).slice(0, 5).join(', ');
      const titleStr = 'Зарплаты за ' + dt.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

      // Upsert: delete old + create new
      try {
        await db.query('DELETE FROM expenses WHERE source_type = ? AND source_id = ? AND office_id = ?', ['salary', sourceId, officeId]);
        await createAutoExpense({
          office_id: officeId,
          category: 'Зарплаты',
          title: titleStr,
          amount: totalSalaries,
          description: empNames ? ('Сотрудники: ' + empNames + (results.filter(r => r.total > 0).length > 5 ? '...' : '')) : null,
          spent_on: salaryDate,
          source_type: 'salary',
          source_id: sourceId,
          created_by: req.user ? req.user.id : null,
        });
      } catch (salErr) { console.error('Salary auto-expense error:', salErr.message); }
    }

    return ok(res, {
      office_id: officeId,
      date_from: dateFrom,
      date_to: dateTo,
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

module.exports = {
  getSettings,
  updateSettings,
  getEmployeeSalary,
  upsertEmployeeSalary,
  listShifts,
  createShift,
  removeShift,
  calculate,
};
