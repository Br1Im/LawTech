/**
 * Документы по договору (тип 1 — «Подготовка документов»).
 *
 * Файлы хранятся через таблицу materials (поля contract_id, file_url,
 * mime_type, size_bytes, name). Физические файлы — в uploads/.
 *
 * Экспортирует обработчики и multer-middleware для роутов.
 */
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const config = require('../config');

const ok = (res, data) => res.json({ success: true, data });
const bad = (res, code, message, err) => {
  if (err) console.error(message, err.message || err);
  return res.status(code).json({ success: false, message });
};

const ALLOWED_EXT = new Set(['.doc', '.docx']);
const ALLOWED_MIME = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // некоторые ОС шлют octet-stream для .doc/.docx
  'application/octet-stream',
]);

// multer storage: uploads/contract-docs/contract_<id>/<timestamp>-<orig>
const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const dir = path.join(config.paths.uploads, 'contract-docs', `contract_${req.params.id}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[^\p{L}\p{N}._-]+/gu, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return cb(new Error('Только файлы .doc или .docx'));
    }
    if (file.mimetype && !ALLOWED_MIME.has(file.mimetype)) {
      // ругаемся только если mime явный и не из списка
      console.warn('Necоответствующий mime, но расширение допустимое:', file.mimetype);
    }
    cb(null, true);
  },
});

async function fetchContractAndAssertAccess(contractId, user) {
  const [[row]] = await db.query(
    `SELECT c.*, e.office_id AS lawyer_office_id
       FROM contracts c
       LEFT JOIN employees e ON e.id = c.id_employee
      WHERE c.id = ?`,
    [contractId]
  );
  if (!row) {
    const e = new Error('Договор не найден');
    e.statusCode = 404;
    throw e;
  }
  const role = String(user.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'owner') {
    let userOfficeId = user.office_id;
    if (!userOfficeId) {
      const [[u]] = await db.query('SELECT office_id FROM users WHERE id = ?', [user.id]);
      if (u && u.office_id) userOfficeId = u.office_id;
    }
    if (!userOfficeId) {
      const [[emp]] = await db.query('SELECT office_id FROM employees WHERE id = ?', [user.id]);
      if (emp && emp.office_id) userOfficeId = emp.office_id;
    }
    if (userOfficeId && row.lawyer_office_id && Number(userOfficeId) !== Number(row.lawyer_office_id)) {
      const e = new Error('Договор находится в другом офисе');
      e.statusCode = 403;
      throw e;
    }
  }
  return row;
}

async function recomputeDocsStatus(contractId) {
  const [[{ cnt }]] = await db.query(
    'SELECT COUNT(*) AS cnt FROM materials WHERE contract_id = ?',
    [contractId]
  );
  const status = cnt > 0 ? 'ready' : 'pending';
  await db.query('UPDATE contracts SET docs_status = ? WHERE id = ?', [status, contractId]);
  return status;
}

const list = async (req, res) => {
  try {
    await fetchContractAndAssertAccess(req.params.id, req.user);
    const [rows] = await db.query(
      `SELECT id, contract_id, name, file_url, mime_type, size_bytes, created_at, created_by
         FROM materials
        WHERE contract_id = ?
        ORDER BY created_at DESC`,
      [req.params.id]
    );
    return ok(res, rows);
  } catch (e) {
    return bad(res, e.statusCode || 500, e.message || 'Ошибка загрузки документов', e);
  }
};

const create = async (req, res) => {
  try {
    if (!req.file) return bad(res, 400, 'Файл не загружен');
    const contract = await fetchContractAndAssertAccess(req.params.id, req.user);
    const officeId = contract.lawyer_office_id || null;
    const relPath = path
      .relative(config.paths.uploads, req.file.path)
      .replace(/\\/g, '/');
    const fileUrl = `/uploads/${relPath}`;
    const [r] = await db.query(
      `INSERT INTO materials
         (office_id, contract_id, name, category, file_url, mime_type, size_bytes, created_by)
       VALUES (?, ?, ?, 'Документ', ?, ?, ?, ?)`,
      [
        officeId,
        contract.id,
        req.file.originalname,
        fileUrl,
        req.file.mimetype || null,
        req.file.size || 0,
        req.user.id || null,
      ]
    );
    await recomputeDocsStatus(contract.id);
    const [[row]] = await db.query('SELECT * FROM materials WHERE id = ?', [r.insertId]);
    return ok(res, row);
  } catch (e) {
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) { /* noop */ }
    }
    return bad(res, e.statusCode || 500, e.message || 'Ошибка загрузки документа', e);
  }
};

const download = async (req, res) => {
  try {
    await fetchContractAndAssertAccess(req.params.id, req.user);
    const [[row]] = await db.query(
      'SELECT * FROM materials WHERE id = ? AND contract_id = ?',
      [req.params.docId, req.params.id]
    );
    if (!row) return bad(res, 404, 'Документ не найден');
    if (!row.file_url) return bad(res, 410, 'У документа нет файла');
    const rel = row.file_url.replace(/^\/uploads\//, '').replace(/^\/+/, '');
    const filePath = path.join(config.paths.uploads, rel);
    if (!fs.existsSync(filePath)) return bad(res, 410, 'Файл удалён с диска');
    res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(row.name || path.basename(filePath))}`
    );
    return fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    return bad(res, e.statusCode || 500, e.message || 'Ошибка скачивания документа', e);
  }
};

const remove = async (req, res) => {
  try {
    await fetchContractAndAssertAccess(req.params.id, req.user);
    const [[row]] = await db.query(
      'SELECT * FROM materials WHERE id = ? AND contract_id = ?',
      [req.params.docId, req.params.id]
    );
    if (!row) return bad(res, 404, 'Документ не найден');
    await db.query('DELETE FROM materials WHERE id = ?', [row.id]);
    if (row.file_url) {
      const rel = row.file_url.replace(/^\/uploads\//, '').replace(/^\/+/, '');
      const filePath = path.join(config.paths.uploads, rel);
      try { fs.existsSync(filePath) && fs.unlinkSync(filePath); } catch (_) { /* noop */ }
    }
    const status = await recomputeDocsStatus(req.params.id);
    return ok(res, { id: Number(req.params.docId), docs_status: status });
  } catch (e) {
    return bad(res, e.statusCode || 500, e.message || 'Ошибка удаления документа', e);
  }
};

module.exports = {
  list,
  create,
  download,
  remove,
  uploadMiddleware: upload.single('file'),
};
