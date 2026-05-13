/**
 * Контроллеры для модулей CRM: cases, expenses, arrivals, materials, join_requests, employees
 * Единый стиль: все эндпоинты {success, data|message}
 */
const db = require('../db');

// ========== helpers ==========
function ok(res, data, extra = {}) {
  return res.json({ success: true, data, ...extra });
}
function bad(res, code, message, error) {
  return res.status(code).json({ success: false, message, ...(error && { error: error.message }) });
}
async function assertOffice(user) {
  if (!user?.office_id) {
    const err = new Error('Пользователь не привязан к офису');
    err.statusCode = 403;
    throw err;
  }
  return user.office_id;
}

// ========== CASES ==========
const cases = {
  async list(req, res) {
    try {
      const officeId = req.params.officeId || req.user.office_id;
      const [rows] = await db.query(
        `SELECT ca.*,
                cl.name AS client_name,
                CONCAT(e.first_name, ' ', e.last_name) AS employee_name
         FROM cases ca
         LEFT JOIN clients cl ON cl.id = ca.client_id
         LEFT JOIN employees e ON e.id = ca.employee_id
         WHERE ca.office_id = ?
         ORDER BY ca.created_at DESC`,
        [officeId]
      );
      return ok(res, rows);
    } catch (e) { return bad(res, 500, 'Ошибка получения дел', e); }
  },
  async create(req, res) {
    try {
      const officeId = await assertOffice(req.user);
      const { client_id, employee_id, title, case_number, category, status, priority, description, start_date, deadline } = req.body;
      if (!title) return bad(res, 400, 'Название дела обязательно');
      const [r] = await db.query(
        `INSERT INTO cases (office_id, client_id, employee_id, title, case_number, category, status, priority, description, start_date, deadline)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [officeId, client_id || null, employee_id || null, title, case_number || null, category || null, status || 'new', priority || 'medium', description || null, start_date || null, deadline || null]
      );
      const [[row]] = await db.query('SELECT * FROM cases WHERE id = ?', [r.insertId]);
      return ok(res, row);
    } catch (e) { return bad(res, e.statusCode || 500, e.message || 'Ошибка создания дела', e); }
  },
  async update(req, res) {
    try {
      const { id } = req.params;
      const fields = ['client_id','employee_id','title','case_number','category','status','priority','description','start_date','deadline','closed_at'];
      const updates = fields.filter(f => req.body[f] !== undefined);
      if (updates.length === 0) return bad(res, 400, 'Нет полей для обновления');
      const setSql = updates.map(f => `${f} = ?`).join(', ');
      const values = updates.map(f => req.body[f]);
      await db.query(`UPDATE cases SET ${setSql} WHERE id = ?`, [...values, id]);
      const [[row]] = await db.query('SELECT * FROM cases WHERE id = ?', [id]);
      return ok(res, row);
    } catch (e) { return bad(res, 500, 'Ошибка обновления дела', e); }
  },
  async remove(req, res) {
    try {
      await db.query('DELETE FROM cases WHERE id = ?', [req.params.id]);
      return ok(res, { id: req.params.id });
    } catch (e) { return bad(res, 500, 'Ошибка удаления дела', e); }
  }
};

// ========== EXPENSES ==========
const expenses = {
  async list(req, res) {
    try {
      const officeId = req.params.officeId || req.user.office_id;
      const [rows] = await db.query(
        `SELECT e.*, CONCAT(u.first_name, ' ', u.last_name) AS created_by_name
         FROM expenses e
         LEFT JOIN users u ON u.id = e.created_by
         WHERE e.office_id = ?
         ORDER BY e.spent_on DESC, e.id DESC`,
        [officeId]
      );
      return ok(res, rows);
    } catch (e) { return bad(res, 500, 'Ошибка получения расходов', e); }
  },
  async create(req, res) {
    try {
      const officeId = await assertOffice(req.user);
      const { category, amount, title, description, spent_on } = req.body;
      if (!title || amount == null || !spent_on) return bad(res, 400, 'Нужно: title, amount, spent_on');
      const [r] = await db.query(
        `INSERT INTO expenses (office_id, category, amount, title, description, spent_on, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [officeId, category || 'Прочее', amount, title, description || null, spent_on, req.user.id]
      );
      const [[row]] = await db.query('SELECT * FROM expenses WHERE id = ?', [r.insertId]);
      return ok(res, row);
    } catch (e) { return bad(res, e.statusCode || 500, e.message || 'Ошибка создания расхода', e); }
  },
  async update(req, res) {
    try {
      const { id } = req.params;
      const fields = ['category','amount','title','description','spent_on'];
      const updates = fields.filter(f => req.body[f] !== undefined);
      if (updates.length === 0) return bad(res, 400, 'Нет полей для обновления');
      const setSql = updates.map(f => `${f} = ?`).join(', ');
      const values = updates.map(f => req.body[f]);
      await db.query(`UPDATE expenses SET ${setSql} WHERE id = ?`, [...values, id]);
      const [[row]] = await db.query('SELECT * FROM expenses WHERE id = ?', [id]);
      return ok(res, row);
    } catch (e) { return bad(res, 500, 'Ошибка обновления расхода', e); }
  },
  async remove(req, res) {
    try {
      await db.query('DELETE FROM expenses WHERE id = ?', [req.params.id]);
      return ok(res, { id: req.params.id });
    } catch (e) { return bad(res, 500, 'Ошибка удаления расхода', e); }
  },
  async summary(req, res) {
    try {
      const officeId = req.params.officeId || req.user.office_id;
      const [[row]] = await db.query(
        `SELECT COUNT(*) AS count, COALESCE(SUM(amount),0) AS total_amount
         FROM expenses WHERE office_id = ?`,
        [officeId]
      );
      return ok(res, row);
    } catch (e) { return bad(res, 500, 'Ошибка сводки расходов', e); }
  }
};

// ========== ARRIVALS (приходы/income) ==========
const arrivals = {
  async list(req, res) {
    try {
      const officeId = req.params.officeId || req.user.office_id;
      const [rows] = await db.query(
        `SELECT a.*,
                c.name AS client_name,
                CONCAT(u.first_name, ' ', u.last_name) AS created_by_name
         FROM arrivals a
         LEFT JOIN clients c ON c.id = a.client_id
         LEFT JOIN users u ON u.id = a.created_by
         WHERE a.office_id = ?
         ORDER BY a.received_on DESC, a.id DESC`,
        [officeId]
      );
      return ok(res, rows);
    } catch (e) { return bad(res, 500, 'Ошибка получения приходов', e); }
  },
  async create(req, res) {
    try {
      const officeId = await assertOffice(req.user);
      const { source, amount, title, description, contract_id, client_id, received_on } = req.body;
      if (!title || amount == null || !received_on) return bad(res, 400, 'Нужно: title, amount, received_on');
      const [r] = await db.query(
        `INSERT INTO arrivals (office_id, source, amount, title, description, contract_id, client_id, received_on, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [officeId, source || 'Оплата по договору', amount, title, description || null, contract_id || null, client_id || null, received_on, req.user.id]
      );
      const [[row]] = await db.query('SELECT * FROM arrivals WHERE id = ?', [r.insertId]);
      return ok(res, row);
    } catch (e) { return bad(res, e.statusCode || 500, e.message || 'Ошибка создания прихода', e); }
  },
  async update(req, res) {
    try {
      const { id } = req.params;
      const fields = ['source','amount','title','description','contract_id','client_id','received_on'];
      const updates = fields.filter(f => req.body[f] !== undefined);
      if (updates.length === 0) return bad(res, 400, 'Нет полей для обновления');
      const setSql = updates.map(f => `${f} = ?`).join(', ');
      const values = updates.map(f => req.body[f]);
      await db.query(`UPDATE arrivals SET ${setSql} WHERE id = ?`, [...values, id]);
      const [[row]] = await db.query('SELECT * FROM arrivals WHERE id = ?', [id]);
      return ok(res, row);
    } catch (e) { return bad(res, 500, 'Ошибка обновления прихода', e); }
  },
  async remove(req, res) {
    try {
      await db.query('DELETE FROM arrivals WHERE id = ?', [req.params.id]);
      return ok(res, { id: req.params.id });
    } catch (e) { return bad(res, 500, 'Ошибка удаления прихода', e); }
  },
  async summary(req, res) {
    try {
      const officeId = req.params.officeId || req.user.office_id;
      const [[row]] = await db.query(
        `SELECT COUNT(*) AS count, COALESCE(SUM(amount),0) AS total_amount
         FROM arrivals WHERE office_id = ?`,
        [officeId]
      );
      return ok(res, row);
    } catch (e) { return bad(res, 500, 'Ошибка сводки приходов', e); }
  }
};

// ========== MATERIALS ==========
const materials = {
  async list(req, res) {
    try {
      const officeId = req.params.officeId || req.user.office_id;
      const { contract_id } = req.query || {};
      let sql = `SELECT m.*, ca.title AS case_title
         FROM materials m
         LEFT JOIN cases ca ON ca.id = m.case_id
         WHERE m.office_id = ?`;
      const params = [officeId];
      if (contract_id) {
        sql += ' AND m.contract_id = ?';
        params.push(Number(contract_id));
      }
      sql += ' ORDER BY m.created_at DESC';
      const [rows] = await db.query(sql, params);
      return ok(res, rows);
    } catch (e) { return bad(res, 500, 'Ошибка получения материалов', e); }
  },
  async create(req, res) {
    try {
      const officeId = await assertOffice(req.user);
      const { name, category, description, file_url, mime_type, size_bytes, case_id, contract_id } = req.body;
      if (!name) return bad(res, 400, 'Название обязательно');
      const [r] = await db.query(
        `INSERT INTO materials (office_id, case_id, contract_id, name, category, description, file_url, mime_type, size_bytes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [officeId, case_id || null, contract_id || null, name, category || 'Документ', description || null, file_url || null, mime_type || null, size_bytes || 0, req.user.id]
      );
      const [[row]] = await db.query('SELECT * FROM materials WHERE id = ?', [r.insertId]);
      return ok(res, row);
    } catch (e) { return bad(res, e.statusCode || 500, e.message || 'Ошибка создания материала', e); }
  },
  async update(req, res) {
    try {
      const { id } = req.params;
      const fields = ['name','category','description','file_url','case_id','contract_id'];
      const updates = fields.filter(f => req.body[f] !== undefined);
      if (updates.length === 0) return bad(res, 400, 'Нет полей для обновления');
      const setSql = updates.map(f => `${f} = ?`).join(', ');
      const values = updates.map(f => req.body[f]);
      await db.query(`UPDATE materials SET ${setSql} WHERE id = ?`, [...values, id]);
      const [[row]] = await db.query('SELECT * FROM materials WHERE id = ?', [id]);
      return ok(res, row);
    } catch (e) { return bad(res, 500, 'Ошибка обновления материала', e); }
  },
  async remove(req, res) {
    try {
      await db.query('DELETE FROM materials WHERE id = ?', [req.params.id]);
      return ok(res, { id: req.params.id });
    } catch (e) { return bad(res, 500, 'Ошибка удаления материала', e); }
  }
};

// ========== EMPLOYEES ==========
const employees = {
  async list(req, res) {
    try {
      const officeId = req.params.officeId || req.user.office_id;
      const [rows] = await db.query(
        `SELECT e.*, u.role AS user_role
         FROM employees e
         LEFT JOIN users u ON u.email = e.email
         WHERE e.office_id = ?
         ORDER BY e.created_at DESC`,
        [officeId]
      );
      return ok(res, rows);
    } catch (e) { return bad(res, 500, 'Ошибка получения сотрудников', e); }
  },
  async create(req, res) {
    try {
      const officeId = await assertOffice(req.user);
      const {
        first_name, last_name, middle_name, email, phone, position,
        birth_date, passport_series, passport_number,
        passport_issued_by, passport_issue_date, passport_department_code
      } = req.body;
      if (!first_name || !last_name) return bad(res, 400, 'Нужно: first_name, last_name');
      const [r] = await db.query(
        `INSERT INTO employees (first_name, last_name, middle_name, email, phone, position, office_id,
          birth_date, passport_series, passport_number, passport_issued_by, passport_issue_date, passport_department_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          first_name, last_name, middle_name || null,
          email || null, phone || null, position || 'Юрист', officeId,
          birth_date || null, passport_series || null, passport_number || null,
          passport_issued_by || null, passport_issue_date || null, passport_department_code || null
        ]
      );
      const [[row]] = await db.query('SELECT * FROM employees WHERE id = ?', [r.insertId]);
      return ok(res, row);
    } catch (e) { return bad(res, e.statusCode || 500, e.message || 'Ошибка создания сотрудника', e); }
  },
  async update(req, res) {
    try {
      const { id } = req.params;
      const fields = ['first_name','last_name','middle_name','email','phone','position','office_id',
        'birth_date','passport_series','passport_number','passport_issued_by','passport_issue_date','passport_department_code'];
      const updates = fields.filter(f => req.body[f] !== undefined);
      if (updates.length === 0) return bad(res, 400, 'Нет полей для обновления');
      // Только директор может менять роль (position)
      const userRole = (req.user?.role || '').toLowerCase();
      if (updates.includes('position') && userRole !== 'director') {
        return bad(res, 403, 'Только директор может менять роль сотрудника');
      }
      const setSql = updates.map(f => `${f} = ?`).join(', ');
      const values = updates.map(f => req.body[f]);
      await db.query(`UPDATE employees SET ${setSql} WHERE id = ?`, [...values, id]);
      const [[row]] = await db.query('SELECT * FROM employees WHERE id = ?', [id]);
      return ok(res, row);
    } catch (e) { return bad(res, 500, 'Ошибка обновления сотрудника', e); }
  },
  async remove(req, res) {
    try {
      const userRole = (req.user?.role || '').toLowerCase();
      if (!['director', 'manager'].includes(userRole)) {
        return bad(res, 403, 'Только директор или менеджер может удалить сотрудника');
      }
      await db.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
      return ok(res, { id: req.params.id });
    } catch (e) { return bad(res, 500, 'Ошибка удаления сотрудника', e); }
  }
};

// ========== JOIN REQUESTS ==========
const joinRequests = {
  async list(req, res) {
    try {
      const officeId = req.params.officeId || req.user.office_id;
      const [rows] = await db.query(
        `SELECT jr.*, CONCAT(u.first_name, ' ', u.last_name) AS user_name, u.email AS user_email
         FROM join_requests jr
         LEFT JOIN users u ON u.id = jr.user_id
         WHERE jr.office_id = ?
         ORDER BY jr.created_at DESC`,
        [officeId]
      );
      return ok(res, rows);
    } catch (e) { return bad(res, 500, 'Ошибка получения заявок', e); }
  },
  async create(req, res) {
    try {
      const { office_id, role, message } = req.body;
      if (!office_id) return bad(res, 400, 'office_id обязателен');
      const [r] = await db.query(
        `INSERT INTO join_requests (user_id, office_id, role, message) VALUES (?, ?, ?, ?)`,
        [req.user.id, office_id, role || 'lawyer', message || null]
      );
      const [[row]] = await db.query('SELECT * FROM join_requests WHERE id = ?', [r.insertId]);
      return ok(res, row);
    } catch (e) { return bad(res, 500, 'Ошибка создания заявки', e); }
  },
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!['approved','rejected','pending'].includes(status)) return bad(res, 400, 'Недопустимый статус');
      await db.query(`UPDATE join_requests SET status = ? WHERE id = ?`, [status, id]);
      const [[row]] = await db.query('SELECT * FROM join_requests WHERE id = ?', [id]);
      if (status === 'approved' && row) {
        await db.query(`UPDATE users SET office_id = ?, role = ? WHERE id = ?`, [row.office_id, row.role, row.user_id]);
      }
      return ok(res, row);
    } catch (e) { return bad(res, 500, 'Ошибка обновления заявки', e); }
  },
  async myStatus(req, res) {
    try {
      const [rows] = await db.query(
        `SELECT jr.*, o.name AS office_name
         FROM join_requests jr
         LEFT JOIN offices o ON o.id = jr.office_id
         WHERE jr.user_id = ?
         ORDER BY jr.created_at DESC LIMIT 1`,
        [req.user.id]
      );
      return ok(res, rows[0] || null);
    } catch (e) { return bad(res, 500, 'Ошибка получения статуса заявки', e); }
  }
};

module.exports = { cases, expenses, arrivals, materials, employees, joinRequests };
