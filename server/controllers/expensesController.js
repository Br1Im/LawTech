/**
 * Контроллер «Расходы / Финансы».
 *
 * Простой учет расходов офиса:
 * - KPI-карточки: Общие, Зарплаты, Возвраты, Прочие
 * - Категории: Зарплаты, Возвраты, Лиды, Реклама, Аренда, Коммунальные услуги,
 *              Налоги, Интернет, Телефония, Техника, Прочее
 * - Тип: Постоянный / Разовый (просто метка)
 * - Авто-расходы: зарплаты, возвраты
 * - Ручное редактирование всех записей
 */
const db = require('../db');
const { checkOfficeAccess } = require('../utils/ensureOffice');

const ok = (res, data) => res.json({ success: true, data });
const bad = (res, code, message, err) => {
  if (err) console.error(message, err.message || err);
  return res.status(code).json({ success: false, message });
};

const CATEGORIES = [
  'Зарплаты', 'Возвраты', 'Лиды', 'Реклама', 'Аренда',
  'Коммунальные услуги', 'Налоги', 'Интернет', 'Телефония', 'Техника', 'Прочее'
];

// ─── GET /api/office/:officeId/expenses-summary ───
const getSummary = async (req, res) => {
  try {
    const officeId = Number(req.params.officeId);
    if (!officeId) return bad(res, 400, 'Не указан офис');
    const allowed = await checkOfficeAccess(req.user, officeId);
    if (!allowed) return bad(res, 403, 'Доступ запрещен');

    const dateFrom = req.query.date_from || null;
    const dateTo = req.query.date_to || null;
    const filter = req.query.filter || 'all'; // all | auto | manual

    // Fetch expenses
    const where = ['e.office_id = ?'];
    const params = [officeId];
    if (dateFrom) { where.push('e.spent_on >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('e.spent_on <= ?'); params.push(dateTo); }
    if (filter === 'auto') { where.push('e.is_auto = 1'); }
    else if (filter === 'manual') { where.push('e.is_auto = 0'); }

    const [expenses] = await db.query(
      `SELECT e.id, e.category, e.amount, e.expense_type, e.is_auto,
              e.source_type, e.source_id, e.title, e.description, e.spent_on,
              e.created_by, e.created_at
         FROM expenses e
        WHERE ${where.join(' AND ')}
        ORDER BY e.spent_on DESC, e.id DESC`,
      params
    );

    // KPI calculations (always from all expenses in period, ignoring filter)
    const kpiWhere = ['e.office_id = ?'];
    const kpiParams = [officeId];
    if (dateFrom) { kpiWhere.push('e.spent_on >= ?'); kpiParams.push(dateFrom); }
    if (dateTo) { kpiWhere.push('e.spent_on <= ?'); kpiParams.push(dateTo); }

    const [[kpiRow]] = await db.query(
      `SELECT
         COALESCE(SUM(e.amount), 0) AS total,
         COALESCE(SUM(CASE WHEN e.category = 'Зарплаты' THEN e.amount ELSE 0 END), 0) AS salaries,
         COALESCE(SUM(CASE WHEN e.category = 'Возвраты' THEN e.amount ELSE 0 END), 0) AS refunds,
         COALESCE(SUM(CASE WHEN e.category NOT IN ('Зарплаты', 'Возвраты') THEN e.amount ELSE 0 END), 0) AS other
       FROM expenses e
       WHERE ${kpiWhere.join(' AND ')}`,
      kpiParams
    );

    // Office cash
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

    return ok(res, {
      office_id: officeId,
      date_from: dateFrom,
      date_to: dateTo,
      filter,
      expenses: expenses.map(e => ({
        ...e,
        amount: Number(e.amount || 0),
        is_auto: !!e.is_auto,
      })),
      kpi: {
        total: Number(kpiRow.total),
        salaries: Number(kpiRow.salaries),
        refunds: Number(kpiRow.refunds),
        other: Number(kpiRow.other),
      },
      office_cash: officeCash,
      office_profit: officeCash - Number(kpiRow.total),
      categories: CATEGORIES,
    });
  } catch (e) {
    return bad(res, 500, 'Ошибка получения расходов', e);
  }
};

// ─── POST /api/expenses ───
const createExpense = async (req, res) => {
  try {
    const { office_id, category, amount, title, description, spent_on, expense_type } = req.body;
    if (!office_id || !title || amount === undefined) {
      return bad(res, 400, 'Обязательные поля: office_id, title, amount');
    }

    const [result] = await db.query(
      `INSERT INTO expenses (office_id, category, amount, expense_type, is_auto, title, description, spent_on, created_by)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [
        office_id,
        category || 'Прочее',
        Number(amount) || 0,
        expense_type || 'Разовый',
        title,
        description || null,
        spent_on || new Date().toISOString().slice(0, 10),
        req.user.id || null,
      ]
    );

    const [[row]] = await db.query('SELECT * FROM expenses WHERE id = ?', [result.insertId]);
    return ok(res, row);
  } catch (e) {
    return bad(res, 500, 'Ошибка создания расхода', e);
  }
};

// ─── PUT /api/expenses/:id ───
const updateExpense = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { category, amount, title, description, spent_on, expense_type } = req.body;

    const updates = [];
    const params = [];
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (amount !== undefined) { updates.push('amount = ?'); params.push(Number(amount)); }
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (spent_on !== undefined) { updates.push('spent_on = ?'); params.push(spent_on); }
    if (expense_type !== undefined) { updates.push('expense_type = ?'); params.push(expense_type); }

    if (!updates.length) return bad(res, 400, 'Нет полей для обновления');

    params.push(id);
    await db.query(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`, params);

    const [[row]] = await db.query('SELECT * FROM expenses WHERE id = ?', [id]);
    return ok(res, row);
  } catch (e) {
    return bad(res, 500, 'Ошибка обновления расхода', e);
  }
};

// ─── DELETE /api/expenses/:id ───
const deleteExpense = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.query('DELETE FROM expenses WHERE id = ?', [id]);
    return ok(res, { id, message: 'Расход удалён' });
  } catch (e) {
    return bad(res, 500, 'Ошибка удаления расхода', e);
  }
};

/**
 * Утилита: создать авто-расход (вызывается из других контроллеров).
 * Не дублирует если уже есть запись с тем же source_type + source_id.
 */
async function createAutoExpense({ office_id, category, title, amount, description, spent_on, source_type, source_id, created_by }) {
  try {
    // Проверяем дублирование
    if (source_type && source_id) {
      const [existing] = await db.query(
        'SELECT id FROM expenses WHERE source_type = ? AND source_id = ? LIMIT 1',
        [source_type, source_id]
      );
      if (existing.length > 0) return existing[0].id;
    }

    const [result] = await db.query(
      `INSERT INTO expenses (office_id, category, amount, expense_type, is_auto, source_type, source_id, title, description, spent_on, created_by)
       VALUES (?, ?, ?, 'Разовый', 1, ?, ?, ?, ?, ?, ?)`,
      [
        office_id,
        category || 'Прочее',
        Number(amount) || 0,
        source_type || null,
        source_id || null,
        title || category,
        description || null,
        spent_on || new Date().toISOString().slice(0, 10),
        created_by || null,
      ]
    );
    return result.insertId;
  } catch (e) {
    console.error('createAutoExpense error:', e.message);
    return null;
  }
}

module.exports = {
  getSummary,
  createExpense,
  updateExpense,
  deleteExpense,
  createAutoExpense,
};
