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
const { canReadFinance, requireOfficeWrite, money, dateOnly, audit, claimIdempotency, availableBalance, BUCKETS } = require('../utils/financeSecurity');

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
    if(!canReadFinance(req.user)) return bad(res,403,'Нет доступа к расходам');
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


const listExpenses = async (req, res) => {
  try {
    if (!canReadFinance(req.user)) return bad(res,403,'Нет доступа к расходам');
    const officeId=Number(req.query.office_id||req.user.office_id);
    if (!officeId || !await checkOfficeAccess(req.user,officeId)) return bad(res,403,'Нет доступа к офису');
    const [rows]=await db.query('SELECT * FROM expenses WHERE office_id=? ORDER BY spent_on DESC,id DESC',[officeId]);
    return ok(res,rows);
  } catch(e){ return bad(res,500,'Ошибка получения расходов',e); }
};

// ─── POST /api/expenses ───
const createExpense = async (req, res) => {
  try {
    const officeId=Number(req.body.office_id); if (!await requireOfficeWrite(req,res,officeId)) return;
    const amount=money(req.body.amount); if (amount===null) return bad(res,400,'Сумма должна быть больше нуля');
    const spentOn=dateOnly(req.body.spent_on||new Date().toISOString().slice(0,10)); if(!spentOn) return bad(res,400,'Некорректная дата');
    if(!req.body.title || String(req.body.title).trim().length>255) return bad(res,400,'Укажите корректное название');
    if(!BUCKETS.has(req.body.payment_method)) return bad(res,400,'Некорректный источник средств');
    const connection=await db.getClient(); try { await connection.beginTransaction();
      await connection.query('SELECT id FROM offices WHERE id=? FOR UPDATE',[officeId]);
      await claimIdempotency(connection,req,'expense:create',officeId);
      const available=await availableBalance(connection,officeId,req.body.payment_method,spentOn);
      if(available+0.000001<amount){await connection.rollback();return bad(res,400,'Недостаточно средств в выбранном источнике');}
      const [r]=await connection.query(`INSERT INTO expenses (office_id,category,amount,expense_type,is_auto,title,description,spent_on,created_by,payment_method) VALUES (?,?,?,?,0,?,?,?,?,?)`,[officeId,req.body.category||'Прочее',amount,req.body.expense_type||'Разовый',String(req.body.title).trim(),req.body.description||null,spentOn,req.user.id||null,req.body.payment_method]);
      await audit(connection,req,'create','expense',r.insertId,officeId,amount,{payment_method:req.body.payment_method}); await connection.commit();
      const [[row]]=await db.query('SELECT * FROM expenses WHERE id=?',[r.insertId]); return ok(res,row);
    } catch(e){try{await connection.rollback()}catch(_){} throw e} finally{connection.release()}
  } catch(e){return bad(res,e.statusCode||500,e.message||'Ошибка создания расхода',e)}
};

// ─── PUT /api/expenses/:id ───
const updateExpense = async (req,res)=>{
  try { const id=Number(req.params.id); const [[row]]=await db.query('SELECT * FROM expenses WHERE id=?',[id]);
    if(!row) return bad(res,404,'Расход не найден'); if(!await requireOfficeWrite(req,res,row.office_id)) return;
    if(row.source_type) return bad(res,409,'Автоматическую финансовую запись нельзя редактировать');
    const fields=[],params=[];
    if(req.body.amount!==undefined){const v=money(req.body.amount);if(v===null)return bad(res,400,'Сумма должна быть больше нуля');fields.push('amount=?');params.push(v)}
    if(req.body.payment_method!==undefined){if(!BUCKETS.has(req.body.payment_method))return bad(res,400,'Некорректный источник');fields.push('payment_method=?');params.push(req.body.payment_method)}
    if(req.body.spent_on!==undefined){const d=dateOnly(req.body.spent_on);if(!d)return bad(res,400,'Некорректная дата');fields.push('spent_on=?');params.push(d)}
    for(const f of ['category','title','description','expense_type'])if(req.body[f]!==undefined){fields.push(`${f}=?`);params.push(req.body[f])}
    if(!fields.length)return bad(res,400,'Нет полей для обновления'); const c=await db.getClient();try{await c.beginTransaction();await c.query('SELECT id FROM offices WHERE id=? FOR UPDATE',[row.office_id]);
    const newAmount=req.body.amount!==undefined?money(req.body.amount):Number(row.amount),newMethod=req.body.payment_method||row.payment_method,newDate=req.body.spent_on?dateOnly(req.body.spent_on):new Date(row.spent_on).toISOString().slice(0,10);
    let available=await availableBalance(c,row.office_id,newMethod,newDate);if(newMethod===row.payment_method&&new Date(row.spent_on).toISOString().slice(0,10)<=newDate)available+=Number(row.amount);if(available+0.000001<newAmount){await c.rollback();return bad(res,400,'Недостаточно средств в выбранном источнике');}
    await c.query(`UPDATE expenses SET ${fields.join(',')} WHERE id=? AND office_id=?`,[...params,id,row.office_id]);await audit(c,req,'update','expense',id,row.office_id,req.body.amount??row.amount,{before:row});await c.commit()}catch(e){try{await c.rollback()}catch(_){}throw e}finally{c.release()};const [[fresh]]=await db.query('SELECT * FROM expenses WHERE id=?',[id]);return ok(res,fresh)
  }catch(e){return bad(res,500,'Ошибка обновления расхода',e)}
};

// ─── DELETE /api/expenses/:id ───
const deleteExpense = async (req,res)=>{
 try{const id=Number(req.params.id);const [[row]]=await db.query('SELECT * FROM expenses WHERE id=?',[id]);if(!row)return bad(res,404,'Расход не найден');if(!await requireOfficeWrite(req,res,row.office_id))return;if(row.source_type)return bad(res,409,'Автоматическую финансовую запись нельзя удалить');const c=await db.getClient();try{await c.beginTransaction();await c.query('DELETE FROM expenses WHERE id=? AND office_id=?',[id,row.office_id]);await audit(c,req,'delete','expense',id,row.office_id,row.amount,{deleted:row});await c.commit()}catch(e){try{await c.rollback()}catch(_){}throw e}finally{c.release()};return ok(res,{id})}catch(e){return bad(res,500,'Ошибка удаления расхода',e)}
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
  listExpenses,
  getSummary,
  createExpense,
  updateExpense,
  deleteExpense,
  createAutoExpense,
};
