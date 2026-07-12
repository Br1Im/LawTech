/**
 * Контроллер актов LawTech — фиксация факта выполнения работ по договору.
 *
 * Бизнес-правила:
 *  - акт создаётся в контексте договора (POST /api/contracts/:id/acts);
 *  - при создании ОБЯЗАТЕЛЬНО прикладываются фотографии документов (сам акт);
 *  - тип акта наследуется от contract_type ('docs' | 'court_rep');
 *  - office_id берётся у офиса юриста, заключившего договор;
 *  - статус: 'draft' | 'confirmed'. После подтверждения правка/удаление запрещены;
 *  - подтверждать акт может только директор, менеджер, ОКК, admin или owner;
 *  - по умолчанию список актов показывается за текущий период офиса.
 */
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const config = require('../config');
const db = require('../db');
const socketEmitter = require('../middleware/socketEmitter');
const { checkOfficeAccess, getUserOfficeIds } = require('../utils/ensureOffice');
const { resolveRollingWindow, todayIsoInTz } = require('../utils/planPeriod');

const ok = (res, data) => res.json({ success: true, data });
const bad = (res, code, message, err) => {
  if (err) console.error(message, err.message || err);
  return res.status(code).json({ success: false, message });
};

// --- Хранилище фотографий актов (изображения / PDF) ---
const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.pdf']);
const actStorage = multer.diskStorage({
  destination(req, _file, cb) {
    const dir = path.join(config.paths.uploads, 'acts', `contract_${req.params.id}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const safe = (file.originalname || 'file').replace(/[^A-Za-z0-9._-]+/g, '_');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`);
  },
});
const actUpload = multer({
  storage: actStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!IMG_EXT.has(ext)) return cb(new Error('Только фото (jpg, png, webp, heic) или PDF'));
    cb(null, true);
  },
});

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
         c.contract_number AS contract_number,
         c.amount AS contract_amount,
         c.id_client AS client_id,
         cl.name AS client_name,
         cl.phone AS client_phone,
         cl.email AS client_email,
         CONCAT_WS(' ', e.last_name, e.first_name, e.middle_name) AS responsible_full_name,
         (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', at.id, 'file_url', at.file_url, 'name', at.original_name, 'mime_type', at.mime_type, 'size_bytes', at.size_bytes))
            FROM act_attachments at WHERE at.act_id = a.id) AS attachments
    FROM acts a
    LEFT JOIN offices o ON o.id = a.office_id
    LEFT JOIN contracts c ON c.id = a.contract_id
    LEFT JOIN clients cl ON cl.id = c.id_client
    LEFT JOIN employees e ON e.id = a.responsible_id
`;

function normalizeAttachments(row) {
  if (!row) return row;
  if (typeof row.attachments === 'string') {
    try { row.attachments = JSON.parse(row.attachments); } catch (e) { row.attachments = []; }
  }
  if (!Array.isArray(row.attachments)) row.attachments = [];
  return row;
}

const list = async (req, res) => {
  try {
    const where = [];
    const params = [];
    let primaryOfficeId = null;
    let periodMeta = null;

    if (req.query.office_id) {
      const qOffice = Number(req.query.office_id);
      const allowed = await checkOfficeAccess(req.user, qOffice);
      if (!allowed) return bad(res, 403, 'Нет доступа к этому офису');
      where.push('a.office_id = ?');
      params.push(qOffice);
      primaryOfficeId = qOffice;
    } else {
      const officeIds = await getUserOfficeIds(req.user);
      if (!officeIds.length) return bad(res, 403, 'Нет привязки к офису');
      where.push(`a.office_id IN (${officeIds.map(() => '?').join(',')})`);
      params.push(...officeIds);
      primaryOfficeId = officeIds[0] || null;
    }

    // Представитель видит акты только по своим договорам.
    const userRole = String(req.user.role || '').toLowerCase();
    if (userRole === 'representative') {
      where.push('a.contract_id IN (SELECT id FROM contracts WHERE representative_id = ?)');
      params.push(req.user.id);
    }

    if (req.query.date_from) { where.push('a.act_date >= ?'); params.push(req.query.date_from); }
    if (req.query.date_to) { where.push('a.act_date <= ?'); params.push(req.query.date_to); }
    if (req.query.responsible_id) { where.push('a.responsible_id = ?'); params.push(Number(req.query.responsible_id)); }
    if (req.query.type) { where.push('a.type = ?'); params.push(String(req.query.type)); }
    if (req.query.status) { where.push('a.status = ?'); params.push(String(req.query.status)); }
    if (req.query.contract_id) { where.push('a.contract_id = ?'); params.push(Number(req.query.contract_id)); }
    if (req.query.q) {
      where.push('(cl.name LIKE ? OR CAST(c.id AS CHAR) LIKE ? OR c.contract_number LIKE ? OR c.title LIKE ?)');
      const q = `%${req.query.q}%`;
      params.push(q, q, q, q);
    }

    // По умолчанию (без явного диапазона и не по конкретному договору) —
    // окно плана офиса с учётом cycle_offset (0 = текущий, -1 = предыдущий), иначе текущий месяц.
    if (!req.query.contract_id && !req.query.date_from && !req.query.date_to && primaryOfficeId) {
      try {
        const cycleOffset = parseInt(req.query.cycle_offset, 10) || 0;
        const [[off]] = await db.query('SELECT timezone FROM offices WHERE id = ? LIMIT 1', [primaryOfficeId]);
        const todayIso = off && off.timezone ? todayIsoInTz(off.timezone) : new Date().toISOString().slice(0, 10);
        const [[plan]] = await db.query(
          `SELECT DATE_FORMAT(period_start, '%Y-%m-%d') AS period_start,
                  DATE_FORMAT(period_end, '%Y-%m-%d') AS period_end
             FROM office_plans WHERE office_id = ?
            ORDER BY (period_start <= ?) DESC, period_start DESC, updated_at DESC LIMIT 1`,
          [primaryOfficeId, todayIso]
        );
        let pFrom, pTo;
        if (plan && plan.period_start && plan.period_end) {
          const win = resolveRollingWindow(plan.period_start, plan.period_end, todayIso, cycleOffset);
          pFrom = win.from; pTo = win.to;
          periodMeta = {
            from: win.from,
            to: win.to,
            cycle_index: win.cycle_index,
            current_cycle_index: win.current_cycle_index,
            duration_days: win.duration_days,
            has_prev: win.cycle_index > 0,
            has_next: win.cycle_index < win.current_cycle_index,
          };
        } else {
          pFrom = todayIso.slice(0, 8) + '01'; pTo = todayIso;
          periodMeta = { from: pFrom, to: pTo, cycle_index: 0, current_cycle_index: 0, has_prev: false, has_next: false };
        }
        where.push('a.act_date >= ?'); params.push(pFrom);
        where.push('a.act_date <= ?'); params.push(pTo);
      } catch (e) { /* ignore -> показать всё */ }
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const page = parseInt(req.query.page, 10);
    const pageSize = Math.min(parseInt(req.query.page_size, 10) || 50, 200);

    if (page > 0) {
      const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total FROM acts a
         LEFT JOIN contracts c ON c.id = a.contract_id
         LEFT JOIN clients cl ON cl.id = c.id_client
         ${whereClause}`, params
      );
      const offset = (page - 1) * pageSize;
      const sql = `${SELECT_BASE} ${whereClause} ORDER BY a.act_date DESC, a.id DESC LIMIT ? OFFSET ?`;
      const [rows] = await db.query(sql, [...params, pageSize, offset]);
      rows.forEach(normalizeAttachments);
      return res.json({ success: true, data: rows, total, page, page_size: pageSize, period: periodMeta });
    }

    const sql = `${SELECT_BASE} ${whereClause} ORDER BY a.act_date DESC, a.id DESC`;
    const [rows] = await db.query(sql, params);
    rows.forEach(normalizeAttachments);
    return res.json({ success: true, data: rows, period: periodMeta });
  } catch (e) {
    return bad(res, 500, 'Ошибка получения списка актов', e);
  }
};

const getOne = async (req, res) => {
  try {
    const [[row]] = await db.query(`${SELECT_BASE} WHERE a.id = ?`, [req.params.id]);
    if (!row) return bad(res, 404, 'Акт не найден');
    const allowed = await checkOfficeAccess(req.user, row.office_id);
    if (!allowed) return bad(res, 403, 'Акт другого офиса');
    normalizeAttachments(row);
    return ok(res, row);
  } catch (e) {
    return bad(res, 500, 'Ошибка получения акта', e);
  }
};

const getAttachments = async (req, res) => {
  try {
    const [[act]] = await db.query('SELECT office_id FROM acts WHERE id = ?', [req.params.id]);
    if (!act) return bad(res, 404, 'Акт не найден');
    const allowed = await checkOfficeAccess(req.user, act.office_id);
    if (!allowed) return bad(res, 403, 'Акт другого офиса');
    const [rows] = await db.query(
      `SELECT id, act_id, file_url, original_name AS name, mime_type, size_bytes, created_at
         FROM act_attachments WHERE act_id = ? ORDER BY id`,
      [req.params.id]
    );
    return ok(res, rows);
  } catch (e) {
    return bad(res, 500, 'Ошибка получения вложений', e);
  }
};

// POST /api/contracts/:id/acts — создать акт с обязательными фото.
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
    if (officeId) {
      const allowed = await checkOfficeAccess(req.user, officeId);
      if (!allowed) return bad(res, 403, 'Договор находится в другом офисе');
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      return bad(res, 400, 'Необходимо приложить фотографии документов (сам акт)');
    }

    const { amount, act_date, description } = req.body;
    if (amount == null || Number.isNaN(Number(amount))) return bad(res, 400, 'Сумма акта обязательна');
    if (Number(amount) <= 0) return bad(res, 400, 'Сумма акта должна быть больше нуля');
    if (!description || !String(description).trim()) return bad(res, 400, 'Описание акта обязательно');

    const type = contract.contract_type || 'docs';
    // Ответственный определяется автоматически: создатель акта (user.id = employee.id).
    const respId = req.user.id ? Number(req.user.id) : null;

    // Контроль баланса: сумма всех актов по договору не должна превышать стоимость договора.
    const contractAmount = Number(contract.amount) || 0;
    if (contractAmount > 0) {
      const [[{ acts_total }]] = await db.query(
        'SELECT COALESCE(SUM(amount), 0) AS acts_total FROM acts WHERE contract_id = ?',
        [contractId]
      );
      const available = contractAmount - Number(acts_total);
      if (Number(amount) > available) {
        if (available <= 0) {
          return bad(res, 400, 'Договор исполнен полностью. Добавление новых актов невозможно.');
        }
        return bad(res, 400,
          `Невозможно создать акт. Сумма акта превышает остаток по договору. Доступный остаток: ${available.toLocaleString('ru-RU')} ₽.`);
      }
    }

    const date = act_date || new Date().toISOString().slice(0, 10);
    const [r] = await db.query(
      `INSERT INTO acts
         (office_id, contract_id, act_date, amount, type, responsible_id, status, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
      [officeId, contractId, date, Number(amount), type, respId, description || null, req.user.id || null]
    );

    // Сохраняем приложенные фотографии.
    const attRows = files.map((f) => [
      r.insertId,
      `/uploads/acts/contract_${contractId}/${f.filename}`,
      f.originalname,
      f.mimetype,
      f.size,
      req.user.id || null,
    ]);
    await db.query(
      'INSERT INTO act_attachments (act_id, file_url, original_name, mime_type, size_bytes, created_by) VALUES ?',
      [attRows]
    );

    const [[row]] = await db.query(`${SELECT_BASE} WHERE a.id = ?`, [r.insertId]);
    normalizeAttachments(row);

    // Real-time: уведомить офис о новом акте.
    socketEmitter.emitActNew(officeId, { ...row, amount: Number(amount) });

    return ok(res, row);
  } catch (e) {
    return bad(res, 500, 'Ошибка создания акта', e);
  }
};

const update = async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM acts WHERE id = ?', [req.params.id]);
    if (!row) return bad(res, 404, 'Акт не найден');
    if (row.status === 'confirmed') return bad(res, 409, 'Подтверждённый акт нельзя редактировать');
    const allowedUpdate = await checkOfficeAccess(req.user, row.office_id);
    if (!allowedUpdate) return bad(res, 403, 'Акт другого офиса');

    if (req.body.description !== undefined && !String(req.body.description || '').trim()) {
      return bad(res, 400, 'Описание акта не может быть пустым');
    }

    if (req.body.amount !== undefined) {
      const newAmount = Number(req.body.amount);
      const [[contract]] = await db.query('SELECT amount FROM contracts WHERE id = ?', [row.contract_id]);
      const contractAmount = Number(contract && contract.amount || 0);
      if (contractAmount > 0) {
        const [[{ acts_total }]] = await db.query(
          'SELECT COALESCE(SUM(amount), 0) AS acts_total FROM acts WHERE contract_id = ? AND id != ?',
          [row.contract_id, row.id]
        );
        const available = contractAmount - Number(acts_total);
        if (newAmount > available) {
          return bad(res, 400,
            `Невозможно изменить акт. Сумма превышает остаток по договору. Доступный остаток: ${available.toLocaleString('ru-RU')} ₽.`);
        }
      }
    }

    const fields = ['act_date', 'amount', 'description'];
    const updates = [];
    const params = [];
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
    normalizeAttachments(updated);
    return ok(res, updated);
  } catch (e) {
    return bad(res, 500, 'Ошибка обновления акта', e);
  }
};

const confirm = async (req, res) => {
  try {
    // Подтвердить акт могут только: директор, менеджер, ОКК, admin, owner.
    const confirmRole = String(req.user.role || '').toLowerCase();
    const canConfirm = ['admin', 'owner', 'director', 'manager', 'okk'].includes(confirmRole);
    if (!canConfirm) return bad(res, 403, 'Подтвердить акт может только директор, менеджер или сотрудник ОКК');
    const [[row]] = await db.query('SELECT * FROM acts WHERE id = ?', [req.params.id]);
    if (!row) return bad(res, 404, 'Акт не найден');
    if (row.status === 'confirmed') return bad(res, 409, 'Акт уже подтверждён');
    const allowedConfirm = await checkOfficeAccess(req.user, row.office_id);
    if (!allowedConfirm) return bad(res, 403, 'Акт другого офиса');
    await db.query(
      "UPDATE acts SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP WHERE id = ?",
      [row.id]
    );
    const [[updated]] = await db.query(`${SELECT_BASE} WHERE a.id = ?`, [row.id]);
    normalizeAttachments(updated);
    socketEmitter.emitActConfirmed(row.office_id, updated);
    return ok(res, updated);
  } catch (e) {
    return bad(res, 500, 'Ошибка подтверждения акта', e);
  }
};

const remove = async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM acts WHERE id = ?', [req.params.id]);
    if (!row) return bad(res, 404, 'Акт не найден');
    if (row.status === 'confirmed') return bad(res, 409, 'Подтверждённый акт нельзя удалить');
    const allowedRemove = await checkOfficeAccess(req.user, row.office_id);
    if (!allowedRemove) return bad(res, 403, 'Акт другого офиса');
    await db.query('DELETE FROM act_attachments WHERE act_id = ?', [row.id]);
    await db.query('DELETE FROM acts WHERE id = ?', [row.id]);
    return ok(res, { id: row.id });
  } catch (e) {
    return bad(res, 500, 'Ошибка удаления акта', e);
  }
};

module.exports = {
  list,
  getOne,
  getAttachments,
  createForContract,
  update,
  confirm,
  remove,
  uploadMiddleware: actUpload.array('photos', 20),
};
