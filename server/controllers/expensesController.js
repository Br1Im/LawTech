/**
 * Контроллер «Расходы».
 *
 * Автоматические категории (рассчитываются из данных системы):
 *   - Зарплаты сотрудников (из salary calculate)
 *   - Бонусы (из salary calculate)
 *   - Покупка лидов (из call_center_leads)
 *   - Возвраты клиентам (из cash_register с expense_amount > 0)
 *
 * Ручные категории (CRUD в таблице expenses):
 *   - Аренда, Коммунальные услуги, Реклама, Прочее
 */
const db = require('../db');
const { checkOfficeAccess } = require('../utils/ensureOffice');

const ok = (res, data) => res.json({ success: true, data });
const bad = (res, code, message, err) => {
  if (err) console.error(message, err.message || err);
  return res.status(code).json({ success: false, message });
};

async function resolveUserOfficeId(user) {
  if (user.office_id) return Number(user.office_id);
  const [[u]] = await db.query('SELECT office_id FROM users WHERE id = ?', [user.id]);
  if (u && u.office_id) return Number(u.office_id);
  return null;
}

// ─── Автоматические расходы ───

async function getAutoSalaries(officeId, dateFrom, dateTo) {
  // Получаем настройки зарплаты офиса
  let settings;
  try {
    const [[row]] = await db.query('SELECT * FROM office_salary_settings WHERE office_id = ?', [officeId]);
    settings = row || {
      lawyer_percent: 10, lawyer_bonus_threshold: 500000, lawyer_bonus_percent: 12,
      okk_percent: 10, okk_bonus_threshold: 500000, okk_bonus_percent: 12,
      manager_office_percent: 5, representative_percent: 20,
      admin_shift_rate: 2000, expert_per_doc_amount: 1500,
    };
  } catch {
    settings = {
      lawyer_percent: 10, lawyer_bonus_threshold: 500000, lawyer_bonus_percent: 12,
      okk_percent: 10, okk_bonus_threshold: 500000, okk_bonus_percent: 12,
      manager_office_percent: 5, representative_percent: 20,
      admin_shift_rate: 2000, expert_per_doc_amount: 1500,
    };
  }

  // Параллельные запросы: сотрудники, касса, расходы, акты, смены
  const cashWhere = ['emp.office_id = ?'];
  const cashParams = [officeId];
  if (dateFrom) { cashWhere.push('c.contract_date >= ?'); cashParams.push(dateFrom); }
  if (dateTo) { cashWhere.push('c.contract_date <= ?'); cashParams.push(dateTo); }

  const expWhere = ['ex.office_id = ?'];
  const expParams = [officeId];
  if (dateFrom) { expWhere.push('ex.spent_on >= ?'); expParams.push(dateFrom); }
  if (dateTo) { expWhere.push('ex.spent_on <= ?'); expParams.push(dateTo); }

  const actWhere = ['a.status = "confirmed"', 'a.office_id = ?'];
  const actParams = [officeId];
  if (dateFrom) { actWhere.push('a.act_date >= ?'); actParams.push(dateFrom); }
  if (dateTo) { actWhere.push('a.act_date <= ?'); actParams.push(dateTo); }

  const shiftWhere = ['s.office_id = ?'];
  const shiftParams = [officeId];
  if (dateFrom) { shiftWhere.push('s.shift_date >= ?'); shiftParams.push(dateFrom); }
  if (dateTo) { shiftWhere.push('s.shift_date <= ?'); shiftParams.push(dateTo); }

  const [
    [employees],
    [[cashRow]],
    [[expRow]],
    [actRows],
    [shiftRows]
  ] = await Promise.all([
    db.query(
      `SELECT e.*, COALESCE(es.base_salary, 0) AS base_salary,
              es.custom_percent, es.custom_shift_rate, es.custom_per_doc,
              u.role AS user_role
         FROM employees e
         LEFT JOIN employee_salaries es ON es.employee_id = e.id
         LEFT JOIN users u ON u.id = e.id
        WHERE e.office_id = ?`,
      [officeId]
    ),
    db.query(
      `SELECT COALESCE(SUM(c.paid_amount), 0) AS office_cash
         FROM contracts c
         LEFT JOIN employees emp ON emp.id = c.id_employee
        WHERE ${cashWhere.join(' AND ')}`,
      cashParams
    ),
    db.query(
      `SELECT COALESCE(SUM(ex.amount), 0) AS office_expenses
         FROM expenses ex
        WHERE ${expWhere.join(' AND ')}`,
      expParams
    ),
    db.query(
      `SELECT a.responsible_id, a.type, COALESCE(SUM(a.amount), 0) AS sum_amount
         FROM acts a
        WHERE ${actWhere.join(' AND ')}
        GROUP BY a.responsible_id, a.type`,
      actParams
    ),
    db.query(
      `SELECT employee_id, COUNT(*) AS cnt FROM shifts s WHERE ${shiftWhere.join(' AND ')} GROUP BY employee_id`,
      shiftParams
    )
  ]);

  const officeCash = Number(cashRow.office_cash || 0);
  const officeExpenses = Number(expRow.office_expenses || 0);
  const officeProfit = officeCash - officeExpenses;

  const actsByResp = new Map();
  for (const r of actRows) {
    if (!r.responsible_id) continue;
    if (!actsByResp.has(r.responsible_id)) actsByResp.set(r.responsible_id, { docs: 0, court_rep: 0 });
    const slot = r.type === 'court_rep' ? 'court_rep' : 'docs';
    actsByResp.get(r.responsible_id)[slot] += Number(r.sum_amount);
  }

  const shiftsByEmp = new Map(shiftRows.map((r) => [r.employee_id, Number(r.cnt)]));

  function normalizeRole(position) {
    const p = String(position || '').toLowerCase();
    if (p.includes('юрист') || p.includes('адвокат')) return 'lawyer';
    if (p.includes('окк') || p.includes('контрол')) return 'okk';
    if (p.includes('менеджер')) return 'manager';
    if (p.includes('представит')) return 'representative';
    if (p.includes('ресепш') || p.includes('админ')) return 'reception';
    if (p.includes('эксперт')) return 'expert';
    return null;
  }

  const salaryDetails = [];
  const bonusDetails = [];
  let totalSalary = 0;
  let totalBonus = 0;

  for (const emp of employees) {
    const userRole = String(emp.user_role || '').toLowerCase();
    const role = userRole === 'director' ? 'director' : normalizeRole(emp.position);
    const baseSalary = Number(emp.base_salary || 0);
    const fullName = [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ');
    const acts = actsByResp.get(emp.id) || { docs: 0, court_rep: 0 };
    const totalActs = acts.docs + acts.court_rep;

    let bonus = 0;

    switch (role) {
      case 'lawyer': {
        const customP = emp.custom_percent != null ? Number(emp.custom_percent) : null;
        const percent = customP != null ? customP
          : (totalActs < Number(settings.lawyer_bonus_threshold) ? Number(settings.lawyer_bonus_percent) : Number(settings.lawyer_percent));
        bonus = Math.round(totalActs * percent) / 100;
        break;
      }
      case 'okk': {
        const customP = emp.custom_percent != null ? Number(emp.custom_percent) : null;
        const percent = customP != null ? customP
          : (totalActs < Number(settings.okk_bonus_threshold) ? Number(settings.okk_bonus_percent) : Number(settings.okk_percent));
        bonus = Math.round(totalActs * percent) / 100;
        break;
      }
      case 'manager': {
        const customP = emp.custom_percent != null ? Number(emp.custom_percent) : null;
        const officePercent = customP != null ? customP : Number(settings.manager_office_percent);
        bonus = Math.round(officeCash * officePercent) / 100;
        if (totalActs > 0) {
          const p = totalActs < Number(settings.lawyer_bonus_threshold) ? Number(settings.lawyer_bonus_percent) : Number(settings.lawyer_percent);
          bonus += Math.round(totalActs * p) / 100;
        }
        break;
      }
      case 'representative': {
        const customP = emp.custom_percent != null ? Number(emp.custom_percent) : null;
        const percent = customP != null ? customP : Number(settings.representative_percent);
        bonus = Math.round(totalActs * percent) / 100;
        break;
      }
      case 'reception': {
        const shifts = shiftsByEmp.get(emp.id) || 0;
        const customRate = emp.custom_shift_rate != null ? Number(emp.custom_shift_rate) : null;
        const rate = customRate != null ? customRate : Number(settings.admin_shift_rate);
        bonus = shifts * rate;
        break;
      }
      case 'expert': {
        // handled below (cross-office experts)
        break;
      }
      case 'director': {
        // director profit is not an expense
        continue;
      }
      default:
        break;
    }

    if (baseSalary > 0) {
      salaryDetails.push({
        employee_name: fullName,
        position: emp.position || 'Сотрудник',
        amount: baseSalary,
      });
      totalSalary += baseSalary;
    }

    if (bonus > 0) {
      bonusDetails.push({
        employee_name: fullName,
        position: emp.position || 'Сотрудник',
        amount: bonus,
      });
      totalBonus += bonus;
    }
  }

  return { salaryDetails, bonusDetails, totalSalary, totalBonus, officeCash, officeProfit };
}

async function getAutoLeads(officeId, dateFrom, dateTo) {
  const where = ['l.office_id = ?'];
  const params = [officeId];
  if (dateFrom) { where.push('l.created_at >= ?'); params.push(dateFrom); }
  if (dateTo) { where.push('l.created_at <= ?'); params.push(dateTo + ' 23:59:59'); }

  const [rows] = await db.query(
    `SELECT l.source, COUNT(*) AS cnt,
            COALESCE(SUM(CASE WHEN l.metadata IS NOT NULL AND JSON_VALID(l.metadata) THEN COALESCE(JSON_EXTRACT(l.metadata, '$.cost'), 0) ELSE 0 END), 0) AS total_cost
       FROM call_center_leads l
      WHERE ${where.join(' AND ')}
      GROUP BY l.source`,
    params
  );

  const details = [];
  let total = 0;
  for (const r of rows) {
    const cost = Number(r.total_cost || 0);
    if (cost > 0) {
      details.push({ source: r.source, count: Number(r.cnt), amount: cost });
      total += cost;
    }
  }

  return { details, total };
}

async function getAutoRefunds(officeId, dateFrom, dateTo) {
  const where = ['cr.office_id = ?', 'cr.expense_amount > 0'];
  const params = [officeId];
  if (dateFrom) { where.push('cr.entry_date >= ?'); params.push(dateFrom); }
  if (dateTo) { where.push('cr.entry_date <= ?'); params.push(dateTo); }

  const [rows] = await db.query(
    `SELECT cr.client_name, cr.contract_number, cr.expense_amount, cr.comment, cr.entry_date
       FROM cash_register cr
      WHERE ${where.join(' AND ')}
      ORDER BY cr.entry_date DESC`,
    params
  );

  const details = rows.map(r => ({
    client_name: r.client_name || 'Без имени',
    contract_number: r.contract_number || '',
    amount: Number(r.expense_amount),
    comment: r.comment || '',
    date: r.entry_date,
  }));
  const total = details.reduce((s, d) => s + d.amount, 0);

  return { details, total };
}

// ─── Ручные расходы (из таблицы expenses) ───

async function getManualExpenses(officeId, dateFrom, dateTo) {
  const where = ['e.office_id = ?'];
  const params = [officeId];
  if (dateFrom) { where.push('e.spent_on >= ?'); params.push(dateFrom); }
  if (dateTo) { where.push('e.spent_on <= ?'); params.push(dateTo); }

  const [rows] = await db.query(
    `SELECT e.id, e.category, e.amount, e.title, e.description, e.spent_on, e.created_at
       FROM expenses e
      WHERE ${where.join(' AND ')}
      ORDER BY e.spent_on DESC, e.id DESC`,
    params
  );

  // Группируем по категории
  const grouped = {};
  for (const r of rows) {
    const cat = r.category || 'Прочее';
    if (!grouped[cat]) grouped[cat] = { details: [], total: 0 };
    grouped[cat].details.push({
      id: r.id,
      title: r.title,
      description: r.description || '',
      amount: Number(r.amount),
      spent_on: r.spent_on,
    });
    grouped[cat].total += Number(r.amount);
  }

  return grouped;
}

// ─── GET /api/office/:officeId/expenses-summary ───
const getSummary = async (req, res) => {
  try {
    const officeId = Number(req.params.officeId);
    if (!officeId) return bad(res, 400, 'Не указан офис');
    const allowed = await checkOfficeAccess(req.user, officeId);
    if (!allowed) return bad(res, 403, 'Доступ запрещен');

    const dateFrom = req.query.date_from || null;
    const dateTo = req.query.date_to || null;

    const [salaryData, leadsData, refundsData, manualData] = await Promise.all([
      getAutoSalaries(officeId, dateFrom, dateTo),
      getAutoLeads(officeId, dateFrom, dateTo),
      getAutoRefunds(officeId, dateFrom, dateTo),
      getManualExpenses(officeId, dateFrom, dateTo),
    ]);

    const categories = [];

    // 1. Зарплаты (авто)
    categories.push({
      name: 'Зарплаты сотрудников',
      total: salaryData.totalSalary,
      type: 'auto',
      details: salaryData.salaryDetails,
    });

    // 2. Бонусы (авто)
    categories.push({
      name: 'Бонусы',
      total: salaryData.totalBonus,
      type: 'auto',
      details: salaryData.bonusDetails,
    });

    // 3. Покупка лидов (авто)
    categories.push({
      name: 'Покупка лидов',
      total: leadsData.total,
      type: 'auto',
      details: leadsData.details,
    });

    // 4. Возвраты клиентам (авто)
    categories.push({
      name: 'Возвраты клиентам',
      total: refundsData.total,
      type: 'auto',
      details: refundsData.details,
    });

    // 5-8. Ручные категории
    const manualCategories = ['Аренда', 'Коммунальные услуги', 'Реклама', 'Прочее'];
    for (const cat of manualCategories) {
      const data = manualData[cat] || { details: [], total: 0 };
      categories.push({
        name: cat,
        total: data.total,
        type: 'manual',
        details: data.details,
      });
    }

    // Дополнительные ручные категории (не из стандартного списка)
    for (const [cat, data] of Object.entries(manualData)) {
      if (!manualCategories.includes(cat) && !['Зарплаты сотрудников', 'Бонусы', 'Покупка лидов', 'Возвраты клиентам'].includes(cat)) {
        categories.push({
          name: cat,
          total: data.total,
          type: 'manual',
          details: data.details,
        });
      }
    }

    const totalExpenses = categories.reduce((s, c) => s + c.total, 0);

    return ok(res, {
      office_id: officeId,
      date_from: dateFrom,
      date_to: dateTo,
      categories,
      total_expenses: totalExpenses,
      office_cash: salaryData.officeCash,
      office_profit: salaryData.officeCash - totalExpenses,
    });
  } catch (e) {
    return bad(res, 500, 'Ошибка получения расходов', e);
  }
};

// ─── CRUD для ручных расходов ───

// POST /api/expenses
const createExpense = async (req, res) => {
  try {
    const { office_id, category, amount, title, description, spent_on } = req.body;
    if (!office_id || !title || amount === undefined) {
      return bad(res, 400, 'Обязательные поля: office_id, title, amount');
    }

    const [result] = await db.query(
      `INSERT INTO expenses (office_id, category, amount, title, description, spent_on, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        office_id,
        category || 'Прочее',
        Number(amount) || 0,
        title,
        description || null,
        spent_on || new Date().toISOString().slice(0, 10),
        req.user.id || null,
      ]
    );

    return ok(res, { id: result.insertId, message: 'Расход добавлен' });
  } catch (e) {
    return bad(res, 500, 'Ошибка создания расхода', e);
  }
};

// PUT /api/expenses/:id
const updateExpense = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { category, amount, title, description, spent_on } = req.body;

    const updates = [];
    const params = [];
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (amount !== undefined) { updates.push('amount = ?'); params.push(Number(amount)); }
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (spent_on !== undefined) { updates.push('spent_on = ?'); params.push(spent_on); }

    if (!updates.length) return bad(res, 400, 'Нет полей для обновления');

    params.push(id);
    await db.query(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`, params);

    return ok(res, { id, message: 'Расход обновлён' });
  } catch (e) {
    return bad(res, 500, 'Ошибка обновления расхода', e);
  }
};

// DELETE /api/expenses/:id
const deleteExpense = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.query('DELETE FROM expenses WHERE id = ?', [id]);
    return ok(res, { id, message: 'Расход удалён' });
  } catch (e) {
    return bad(res, 500, 'Ошибка удаления расхода', e);
  }
};

module.exports = {
  getSummary,
  createExpense,
  updateExpense,
  deleteExpense,
};
