/**
 * Контроллер «Акты» — фиксация факта выполненных работ по договорам.
 *
 * Бизнес-правила:
 * - акт создаётся ТОЛЬКО внутри договора (POST /api/contracts/:id/acts);
 * - тип акта наследуется из contract.contract_type ('docs' | 'court_rep');
 * - office_id наследуется из офиса юриста, заключившего договор;
 * - status: 'draft' | 'confirmed'. После confirm — редактирование/удаление запрещено;
 * - доступ: admin/owner — без ограничений; остальные — только акты своего офиса.
 */
const db = require('../db');

const ok = (res, data) => res.json({ success: true, data });
const bad = (res, code, message, err) => {
  if (err) console.error(message, err.message || err);
  return res.status(code).json({ success: false, message });
};

async function resolveUserOfficeId(user) {
  if (user.office_id) return Number(user.office_id);
  const [[u]] = await db.query('SELECT office_id FROM users WHERE id = ?', [user.id]);
  if (u && u.office_id) return Number(u.office_id);
  const [[emp]] = await db.query('SELECT office_id FROM employees WHERE id = ?', [user.id]);
  if (emp && emp.office_id) return Number(emp.office_id);
  return null;
}

function isPrivileged(user) {
  const role = String(user.role || '').toLowerCase();
  return role === 'admin' || role === 'owner';
}

const SELECT_BASE = `
  SELECT a.id,
         a.office_id,
         a.contract_id,
         DATE_FORMAT(a.act_date, '%Y-%m-%d') AS act_date,
         a.amount,
         a.type,
         a.responsible_id,
         a.status,
         a.description,
         a.created_by,
         a.confirmed_at,
         a.created_at,
         a.updated_at,
         o.name AS office_name,
         c.title AS contract_title,
         c.amount AS contract_amount,
         c.id_client AS client_id,
         cl.name AS client_name,
         cl.phone AS client_phone,
         cl.email AS client_email,
         CONCAT_WS(' ', e.last_name, e.first_name, e.middle_name) AS responsible_full_name
    FROM acts a
    LEFT JOIN offices o ON o.id = a.office_id
    LEFT JOIN contracts c ON c.id = a.contract_id
    LEFT JOIN clients cl ON cl.id = c.id_client
    LEFT JOIN employees e ON e.id = a.responsible_id
`;

const list = async (req, res) => {
  try {
    const where = [];
    const params = [];

    if (!isPrivileged(req.user)) {
      const officeId = await resolveUserOfficeId(req.user);
      if (!officeId) return bad(res, 403, 'Нет привязки к офису');
      where.push('a.office_id = ?');
      params.push(officeId);
    } else if (req.query.office_id) {
      where.push('a.office_id = ?');
      params.push(Number(req.query.office_id));
    }

    if (req.query.date_from) {
      where.push('a.act_date >= ?');
      params.push(req.query.date_from);
    }
    if (req.query.date_to) {
      where.push('a.act_date <= ?');
      params.push(req.query.date_to);
    }
    if (req.query.responsible_id) {
      where.push('a.responsible_id = ?');
      params.push(Number(req.query.responsible_id));
    }
    if (req.query.type) {
      where.push('a.type = ?');
      params.push(String(req.query.type));
    }
    if (req.query.status) {
      where.push('a.status = ?');
      params.push(String(req.query.status));
    }
    if (req.query.contract_id) {
      where.push('a.contract_id = ?');
      params.push(Number(req.query.contract_id));
    }
    if (req.query.q) {
      where.push('(cl.name LIKE ? OR CAST(c.id AS CHAR) LIKE ? OR c.title LIKE ?)');
      const q = `%${req.query.q}%`;
      params.push(q, q, q);
    }

    const sql = `${SELECT_BASE}
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY a.act_date DESC, a.id DESC`;
    const [rows] = await db.query(sql, params);
    return ok(res, rows);
  } catch (e) {
    return bad(res, 500, 'Ошибка получения списка актов', e);
  }
};

const getOne = async (req, res) => {
  try {
    const [[row]] = await db.query(`${SELECT_BASE} WHERE a.id = ?`, [req.params.id]);
    if (!row) return bad(res, 404, 'Акт не найден');
    if (!isPrivileged(req.user)) {
      const officeId = await resolveUserOfficeId(req.user);
      if (officeId && Number(row.office_id) !== Number(officeId)) {
        return bad(res, 403, 'Акт другого офиса');
      }
    }
    return ok(res, row);
  } catch (e) {
    return bad(res, 500, 'Ошибка получения акта', e);
  }
};

// POST /api/contracts/:id/acts — создаёт акт в контексте договора.
const createForContract = async (req, res) => {
  try {
    const contractId = Number(req.params.id);
    const [[contract]] = await db.query(
      `SELECT c.*, e.office_id AS lawyer_office_id
         FROM contracts c
         LEFT JOIN employees e ON e.id = c.id_employee
        WHERE c.id = ?`,
      [contractId]
    );
    if (!contract) return bad(res, 404, 'Договор не найден');

    const officeId = contract.lawyer_office_id || null;
    if (!isPrivileged(req.user)) {
      const userOfficeId = await resolveUserOfficeId(req.user);
      if (officeId && userOfficeId && Number(officeId) !== Number(userOfficeId)) {
        return bad(res, 403, 'Договор находится в другом офисе');
      }
    }

    const { amount, act_date, responsible_id, description } = req.body;
    if (amount == null || Number.isNaN(Number(amount))) {
      return bad(res, 400, 'Сумма акта обязательна');
    }
    if (Number(amount) <= 0) {
      return bad(res, 400, 'Сумма акта должна быть больше нуля');
    }
    if (!description || !String(description).trim()) {
      return bad(res, 400, 'Описание акта обязательно');
    }

    const type = contract.contract_type || 'docs';
    let respId = responsible_id ? Number(responsible_id) : null;
    if (!respId) {
      // Подставляем по типу: docs → expert_id, court_rep → id_employee (юрист) как заглушка.
      if (type === 'docs' && contract.expert_id) respId = Number(contract.expert_id);
    }

    const date = act_date || new Date().toISOString().slice(0, 10);
    const [r] = await db.query(
      `INSERT INTO acts
         (office_id, contract_id, act_date, amount, type, responsible_id, status, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
      [
        officeId,
        contractId,
        date,
        Number(amount),
        type,
        respId,
        description || null,
        req.user.id || null,
      ]
    );
    const [[row]] = await db.query(`${SELECT_BASE} WHERE a.id = ?`, [r.insertId]);
    return ok(res, row);
  } catch (e) {
    return bad(res, 500, 'Ошибка создания акта', e);
  }
};

const update = async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM acts WHERE id = ?', [req.params.id]);
    if (!row) return bad(res, 404, 'Акт не найден');
    if (row.status === 'confirmed') {
      return bad(res, 409, 'Подтверждённый акт нельзя редактировать');
    }
    if (!isPrivileged(req.user)) {
      const officeId = await resolveUserOfficeId(req.user);
      if (officeId && Number(row.office_id) !== Number(officeId)) {
        return bad(res, 403, 'Акт другого офиса');
      }
    }
    const fields = ['act_date', 'amount', 'responsible_id', 'description'];
    const updates = [];
    const params = [];
    if (req.body.description !== undefined && !String(req.body.description || '').trim()) {
      return bad(res, 400, 'Описание акта не может быть пустым');
    }
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(f === 'amount' ? Number(req.body[f]) : req.body[f]);
      }
    }
    if (!updates.length) return bad(res, 400, 'Нет полей для обновления');
    params.push(row.id);
    await db.query(`UPDATE acts SET ${updates.join(', ')} WHERE id = ?`, params);
    const [[updated]] = await db.query(`${SELECT_BASE} WHERE a.id = ?`, [row.id]);
    return ok(res, updated);
  } catch (e) {
    return bad(res, 500, 'Ошибка обновления акта', e);
  }
};

const confirm = async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM acts WHERE id = ?', [req.params.id]);
    if (!row) return bad(res, 404, 'Акт не найден');
    if (row.status === 'confirmed') return bad(res, 409, 'Акт уже подтверждён');
    if (!isPrivileged(req.user)) {
      const officeId = await resolveUserOfficeId(req.user);
      if (officeId && Number(row.office_id) !== Number(officeId)) {
        return bad(res, 403, 'Акт другого офиса');
      }
    }
    await db.query(
      "UPDATE acts SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP WHERE id = ?",
      [row.id]
    );
    const [[updated]] = await db.query(`${SELECT_BASE} WHERE a.id = ?`, [row.id]);
    return ok(res, updated);
  } catch (e) {
    return bad(res, 500, 'Ошибка подтверждения акта', e);
  }
};

const remove = async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM acts WHERE id = ?', [req.params.id]);
    if (!row) return bad(res, 404, 'Акт не найден');
    if (row.status === 'confirmed') {
      return bad(res, 409, 'Подтверждённый акт нельзя удалить');
    }
    if (!isPrivileged(req.user)) {
      const officeId = await resolveUserOfficeId(req.user);
      if (officeId && Number(row.office_id) !== Number(officeId)) {
        return bad(res, 403, 'Акт другого офиса');
      }
    }
    await db.query('DELETE FROM acts WHERE id = ?', [row.id]);
    return ok(res, { id: row.id });
  } catch (e) {
    return bad(res, 500, 'Ошибка удаления акта', e);
  }
};

module.exports = { list, getOne, createForContract, update, confirm, remove };
