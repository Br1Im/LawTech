/**
 * Case workflow routes: manager inbox, expert assignment, status updates,
 * case detail with attached materials and additional TZ, additional TZ CRUD,
 * and multipart material upload.
 *
 * Wired into /api/ via server/routes/api.js.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');
const { normalizeEmployeeId } = require('../utils/employeeIdentity');
const { checkOfficeAccess } = require('../utils/ensureOffice');
const config = require('../config');
const { decodeUploadedFilename, decodeMultipartText } = require('../utils/filename');

router.use(authenticateToken);

function ok(res, data, extra = {}) {
  return res.json({ success: true, data, ...extra });
}
function bad(res, code, message, error) {
  return res.status(code).json({ success: false, message, ...(error && { error: error.message }) });
}

// ----- multipart upload for materials -----
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(config.paths.uploads, 'materials');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    file.originalname = decodeUploadedFilename(file.originalname);
    const safe = String(file.originalname || 'file')
      .replace(/[^\w.\-]+/g, '_')
      .slice(0, 200);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

function removeUploadedFile(file) {
  if (!file || !file.path) return;
  try { fs.unlinkSync(file.path); } catch (e) {
    if (e.code !== 'ENOENT') console.error('material cleanup err', e.message);
  }
}

/**
 * POST /api/materials/upload
 * multipart form-data. fields: case_id?, contract_id?, category?, description?
 * file: file
 * returns created material row.
 */
router.post('/materials/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return bad(res, 400, 'Файл не получен');
    const officeId = req.user.office_id;
    if (!officeId) return bad(res, 403, 'Пользователь не привязан к офису');
    const { case_id, contract_id } = req.body;
    const caseId = case_id ? Number(case_id) : null;
    const contractId = contract_id ? Number(contract_id) : null;
    if ((case_id && (!Number.isInteger(caseId) || caseId <= 0)) ||
        (contract_id && (!Number.isInteger(contractId) || contractId <= 0))) {
      removeUploadedFile(req.file);
      return bad(res, 400, 'Некорректная ссылка на дело или договор');
    }

    if (caseId) {
      const [[caseRow]] = await db.query('SELECT office_id FROM cases WHERE id = ? LIMIT 1', [caseId]);
      if (!caseRow || !(await checkOfficeAccess(req.user, caseRow.office_id))) {
        removeUploadedFile(req.file);
        return bad(res, 404, 'Дело не найдено');
      }
    }
    if (contractId) {
      const [[contractRow]] = await db.query(
        `SELECT COALESCE(c.office_id, cl.office_id) AS office_id
           FROM contracts c
           LEFT JOIN clients cl ON cl.id = c.id_client
          WHERE c.id = ? LIMIT 1`,
        [contractId]
      );
      if (!contractRow || !(await checkOfficeAccess(req.user, contractRow.office_id))) {
        removeUploadedFile(req.file);
        return bad(res, 404, 'Договор не найден');
      }
    }

    const category = decodeMultipartText(req.body.category) || 'Документ';
    const description = decodeMultipartText(req.body.description) || null;
    const fileUrl = `/uploads/materials/${req.file.filename}`;
    const [r] = await db.query(
      `INSERT INTO materials (office_id, case_id, contract_id, name, category, description, file_url, mime_type, size_bytes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        officeId,
        caseId,
        contractId,
        req.file.originalname || req.file.filename,
        category,
        description,
        fileUrl,
        req.file.mimetype || null,
        req.file.size || 0,
        req.user.id,
      ]
    );
    const [[row]] = await db.query('SELECT * FROM materials WHERE id = ?', [r.insertId]);
    return ok(res, row);
  } catch (e) {
    removeUploadedFile(req.file);
    console.error('material upload err', e);
    return bad(res, 500, 'Ошибка загрузки файла');
  }
});

// ----- case workflow -----

/**
 * GET /api/cases/inbox
 * Менеджер видит новые дела офиса (workflow_status = with_manager).
 */
router.get('/cases/inbox', async (req, res) => {
  try {
    const user = req.user;
    if (!['manager', 'okk', 'director', 'admin'].includes(user.role)) {
      return bad(res, 403, 'Недостаточно прав');
    }
    const officeId = user.office_id;
    if (!officeId) return bad(res, 403, 'Нет офиса');
    const [rows] = await db.query(
      `SELECT ca.*,
              TRIM(CONCAT_WS(' ', cl.last_name, cl.first_name, cl.middle_name)) AS client_fio,
              cl.name AS client_name,
              cl.phone AS client_phone,
              CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
              co.title AS contract_title,
              co.amount AS contract_amount,
              co.customer_goal AS contract_goal,
              co.expert_deadline_days AS contract_deadline
       FROM cases ca
       LEFT JOIN clients cl ON cl.id = ca.client_id
       LEFT JOIN employees e ON e.id = ca.employee_id
       LEFT JOIN contracts co ON co.id = ca.contract_id
       WHERE ca.office_id = ? AND ca.workflow_status = 'with_manager'
       ORDER BY ca.created_at DESC`,
      [officeId]
    );
    return ok(res, rows);
  } catch (e) { return bad(res, 500, 'Ошибка загрузки входящих дел', e); }
});

/**
 * GET /api/cases/inbox-representation
 * Менеджер видит договоры на представление интересов (contract_type = 'court_rep') своего офиса.
 */
router.get('/cases/inbox-representation', async (req, res) => {
  try {
    const user = req.user;
    if (!['manager', 'okk', 'director', 'admin'].includes(user.role)) {
      return bad(res, 403, 'Недостаточно прав');
    }
    const officeId = user.office_id;
    if (!officeId) return bad(res, 403, 'Нет офиса');
    const [rows] = await db.query(
      `SELECT
          c.id,
          c.id_client,
          c.id_employee,
          c.contract_type,
          c.amount,
          c.paid_amount,
          c.status,
          c.title,
          c.description,
          c.customer_goal,
          c.situation_description,
          DATE_FORMAT(c.contract_date, '%Y-%m-%d') AS contract_date,
          DATE_FORMAT(c.start_date, '%Y-%m-%d') AS start_date,
          DATE_FORMAT(c.end_date, '%Y-%m-%d') AS end_date,
          c.created_at,
          cl.name AS client_name,
          TRIM(CONCAT_WS(' ', cl.last_name, cl.first_name, cl.middle_name)) AS client_fio,
          cl.phone AS client_phone,
          cl.email AS client_email,
          CONCAT(emp_e.first_name, ' ', emp_e.last_name) AS employee_name,
          (SELECT COUNT(*) FROM case_actions ca WHERE ca.contract_id = c.id) AS actions_count
       FROM contracts c
       LEFT JOIN clients cl ON cl.id = c.id_client
       LEFT JOIN employees emp_e ON emp_e.id = c.id_employee
       WHERE c.contract_type = 'court_rep'
         AND cl.office_id = ?
       ORDER BY c.created_at DESC`,
      [officeId]
    );
    return ok(res, rows);
  } catch (e) { return bad(res, 500, 'Ошибка загрузки дел на представление интересов', e); }
});

/**
 * PUT /api/cases/assign-representative/:contractId
 * Менеджер назначает представителя на договор court_rep.
 */
router.put('/cases/assign-representative/:contractId', async (req, res) => {
  try {
    const user = req.user;
    if (!['manager', 'okk', 'director', 'admin'].includes(user.role)) {
      return bad(res, 403, 'Недостаточно прав');
    }
    const contractId = Number(req.params.contractId);
    const representativeId = Number(req.body.representative_id);
    if (!representativeId) return bad(res, 400, 'Нужно указать representative_id');

    // Проверяем, что контракт court_rep
    const [[contract]] = await db.query(
      "SELECT id, contract_type FROM contracts WHERE id = ?",
      [contractId]
    );
    if (!contract) return bad(res, 404, 'Договор не найден');
    if (contract.contract_type !== 'court_rep') {
      return bad(res, 400, 'Договор не является представительством в суде');
    }

    // Проверяем, что представитель существует
    const [[rep]] = await db.query(
      "SELECT e.id FROM employees e JOIN users u ON u.email = e.email WHERE e.id = ? AND u.role = 'representative'",
      [representativeId]
    );
    if (!rep) return bad(res, 404, 'Представитель не найден');

    await db.query(
      'UPDATE contracts SET id_employee = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [representativeId, contractId]
    );

    const [[updated]] = await db.query(
      `SELECT c.*, CONCAT(emp.first_name, ' ', emp.last_name) AS employee_name
       FROM contracts c
       LEFT JOIN employees emp ON emp.id = c.id_employee
       WHERE c.id = ?`,
      [contractId]
    );
    return ok(res, updated);
  } catch (e) { return bad(res, 500, 'Ошибка назначения представителя', e); }
});

/**
 * GET /api/cases/my-assigned
 * Эксперт видит все дела, назначенные на него.
 */
router.get('/cases/my-assigned', async (req, res) => {
  try {
    const user = req.user;
    // Находим employee id по user.email
    const [[emp]] = await db.query('SELECT id FROM employees WHERE email = ? LIMIT 1', [user.email]);
    if (!emp) return ok(res, []);
    const [rows] = await db.query(
      `SELECT ca.*,
              cl.name AS client_name,
              cl.phone AS client_phone,
              co.title AS contract_title,
              co.customer_goal AS contract_goal,
              co.situation_description AS contract_situation,
              co.expert_deadline_days AS contract_deadline
       FROM cases ca
       LEFT JOIN clients cl ON cl.id = ca.client_id
       LEFT JOIN contracts co ON co.id = ca.contract_id
       WHERE ca.expert_id = ?
       ORDER BY ca.created_at DESC`,
      [emp.id]
    );
    return ok(res, rows);
  } catch (e) { return bad(res, 500, 'Ошибка загрузки дел эксперта', e); }
});

/**
 * GET /api/cases/:id
 * Полные данные дела + договор + клиент + materials + additional_tz.
 */
router.get('/cases/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [[c]] = await db.query(
      `SELECT ca.*,
              TRIM(CONCAT_WS(' ', cl.last_name, cl.first_name, cl.middle_name)) AS client_fio,
              cl.name AS client_name,
              cl.phone AS client_phone,
              cl.email AS client_email,
              cl.acting_for AS client_acting_for,
              CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
              CONCAT(exp.first_name, ' ', exp.last_name) AS expert_name,
              CONCAT(mgr.first_name, ' ', mgr.last_name) AS manager_name,
              co.title AS contract_title,
              co.contract_type AS contract_type,
              co.amount AS contract_amount,
              co.paid_amount AS contract_paid,
              co.legal_cost_comp AS contract_legal_cost_comp,
              co.moral_comp AS contract_moral_comp,
              co.payment_date AS contract_payment_date,
              co.customer_goal AS contract_goal,
              co.situation_description AS contract_situation,
              co.expert_deadline_days AS contract_deadline
       FROM cases ca
       LEFT JOIN clients cl ON cl.id = ca.client_id
       LEFT JOIN employees e ON e.id = ca.employee_id
       LEFT JOIN employees exp ON exp.id = ca.expert_id
       LEFT JOIN employees mgr ON mgr.id = ca.manager_id
       LEFT JOIN contracts co ON co.id = ca.contract_id
       WHERE ca.id = ?`,
      [id]
    );
    if (!c) return bad(res, 404, 'Дело не найдено');
    if (!(await checkOfficeAccess(req.user, c.office_id))) {
      return bad(res, 404, 'Дело не найдено');
    }
    const [materials] = await db.query(
      'SELECT * FROM materials WHERE case_id = ? ORDER BY created_at DESC',
      [id]
    );
    const [additionalTz] = await db.query(
      `SELECT atz.*,
              CONCAT(exp.first_name, ' ', exp.last_name) AS expert_name
       FROM additional_tz atz
       LEFT JOIN employees exp ON exp.id = atz.expert_id
       WHERE atz.case_id = ?
       ORDER BY atz.created_at DESC`,
      [id]
    );
    return ok(res, { ...c, materials, additional_tz: additionalTz });
  } catch (e) { return bad(res, 500, 'Ошибка загрузки дела', e); }
});

/**
 * PUT /api/cases/:id/assign-expert
 * body: { expert_id }
 * manager берёт дело на себя и назначает эксперта.
 */
router.put('/cases/:id/assign-expert', async (req, res) => {
  try {
    const user = req.user;
    if (!['manager', 'okk', 'director', 'admin'].includes(user.role)) {
      return bad(res, 403, 'Недостаточно прав');
    }
    const id = Number(req.params.id);
    const rawExpertId = Number(req.body.expert_id);
    if (!rawExpertId) return bad(res,400,'expert_id required');
    const [[caseRow]] = await db.query('SELECT office_id FROM cases WHERE id=? LIMIT 1',[id]);
    if (!caseRow) return bad(res,404,'case not found');
    const expertId = await normalizeEmployeeId(rawExpertId,{role:'expert',officeId:caseRow.office_id});
    if (!expertId) return bad(res,400,'expert not found in office');
    const [[emp]] = await db.query('SELECT id FROM employees WHERE email = ? LIMIT 1', [user.email]);
    const managerEmpId = emp ? emp.id : null;

    await db.query(
      `UPDATE cases
       SET expert_id = ?, manager_id = ?, workflow_status = 'assigned_to_expert'
       WHERE id = ?`,
      [expertId, managerEmpId, id]
    );
    // Также в contract выставим expert_id, если ещё не задан
    const [[cs]] = await db.query('SELECT contract_id FROM cases WHERE id = ?', [id]);
    if (cs && cs.contract_id) {
      await db.query(
        'UPDATE contracts SET expert_id = COALESCE(expert_id, ?) WHERE id = ?',
        [expertId, cs.contract_id]
      );
    }
    const [[row]] = await db.query('SELECT * FROM cases WHERE id = ?', [id]);
    return ok(res, row);
  } catch (e) { return bad(res, 500, 'Ошибка назначения эксперта', e); }
});

/**
 * PUT /api/cases/:id/workflow-status
 * body: { workflow_status: 'in_progress' | 'done' | 'closed' }
 */
router.put('/cases/:id/workflow-status', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const s = String(req.body.workflow_status || '');
    const allowed = ['with_manager', 'assigned_to_expert', 'in_progress', 'done', 'closed'];
    if (!allowed.includes(s)) return bad(res, 400, 'Некорректный статус');
    await db.query('UPDATE cases SET workflow_status = ? WHERE id = ?', [s, id]);
    const [[row]] = await db.query('SELECT * FROM cases WHERE id = ?', [id]);
    return ok(res, row);
  } catch (e) { return bad(res, 500, 'Ошибка обновления статуса', e); }
});

// ----- additional TZ -----

/**
 * POST /api/additional-tz
 * body: { case_id, document_type, description, purpose, expert_id?, deadline_days?, deadline_date? }
 */
router.post('/additional-tz', async (req, res) => {
  try {
    const user = req.user;
    const officeId = user.office_id;
    if (!officeId) return bad(res, 403, 'Нет офиса');
    const { case_id, document_type, description, purpose, expert_id, deadline_days, deadline_date } = req.body || {};
    if (!case_id) return bad(res, 400, 'case_id обязателен');
    if (!document_type || !document_type.toString().trim()) return bad(res, 400, 'document_type обязателен');

    // Проверяем, что case из того же офиса
    const [[cs]] = await db.query('SELECT office_id, expert_id FROM cases WHERE id = ?', [Number(case_id)]);
    if (!cs) return bad(res, 404, 'Дело не найдено');
    if (cs.office_id !== officeId && !['admin'].includes(user.role)) {
      return bad(res, 403, 'Дело чужого офиса');
    }
    const expVal = expert_id ? Number(expert_id) : (cs.expert_id || null);
    const status = expVal ? 'assigned_to_expert' : 'with_manager';
    const [r] = await db.query(
      `INSERT INTO additional_tz (office_id, case_id, document_type, description, purpose,
                                   expert_id, deadline_days, deadline_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        officeId,
        Number(case_id),
        String(document_type).slice(0, 255),
        description || null,
        purpose ? String(purpose).slice(0, 500) : null,
        expVal,
        deadline_days ? Number(deadline_days) : null,
        deadline_date || null,
        status,
        user.id,
      ]
    );
    const [[row]] = await db.query('SELECT * FROM additional_tz WHERE id = ?', [r.insertId]);
    return ok(res, row);
  } catch (e) { return bad(res, 500, 'Ошибка создания доп. ТЗ', e); }
});

/**
 * GET /api/additional-tz?case_id=...
 */
router.get('/additional-tz', async (req, res) => {
  try {
    const officeId = req.user.office_id;
    if (!officeId) return bad(res, 403, 'Нет офиса');
    const caseId = req.query.case_id ? Number(req.query.case_id) : null;
    const where = caseId
      ? 'WHERE atz.office_id = ? AND atz.case_id = ?'
      : 'WHERE atz.office_id = ?';
    const params = caseId ? [officeId, caseId] : [officeId];
    const [rows] = await db.query(
      `SELECT atz.*,
              CONCAT(exp.first_name, ' ', exp.last_name) AS expert_name,
              ca.title AS case_title
       FROM additional_tz atz
       LEFT JOIN employees exp ON exp.id = atz.expert_id
       LEFT JOIN cases ca ON ca.id = atz.case_id
       ${where}
       ORDER BY atz.created_at DESC`,
      params
    );
    return ok(res, rows);
  } catch (e) { return bad(res, 500, 'Ошибка получения доп. ТЗ', e); }
});

/**
 * PUT /api/additional-tz/:id/assign-expert
 * body: { expert_id }
 */
router.put('/additional-tz/:id/assign-expert', async (req, res) => {
  try {
    const user = req.user;
    if (!['manager', 'okk', 'director', 'admin'].includes(user.role)) {
      return bad(res, 403, 'Недостаточно прав');
    }
    const id = Number(req.params.id);
    const rawExpertId = Number(req.body.expert_id);
    if (!rawExpertId) return bad(res,400,'expert_id required');
    const [[tzRow]] = await db.query('SELECT office_id FROM additional_tz WHERE id=? LIMIT 1',[id]);
    if (!tzRow) return bad(res,404,'task not found');
    const expertId = await normalizeEmployeeId(rawExpertId,{role:'expert',officeId:tzRow.office_id});
    if (!expertId) return bad(res,400,'expert not found in office');
    const [[emp]] = await db.query('SELECT id FROM employees WHERE email = ? LIMIT 1', [user.email]);
    const managerEmpId = emp ? emp.id : null;
    await db.query(
      `UPDATE additional_tz
       SET expert_id = ?, manager_id = ?, status = 'assigned_to_expert'
       WHERE id = ?`,
      [expertId, managerEmpId, id]
    );
    const [[row]] = await db.query('SELECT * FROM additional_tz WHERE id = ?', [id]);
    return ok(res, row);
  } catch (e) { return bad(res, 500, 'Ошибка назначения эксперта', e); }
});

/**
 * PUT /api/additional-tz/:id/status
 */
router.put('/additional-tz/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const s = String(req.body.status || '');
    const allowed = ['created', 'with_manager', 'assigned_to_expert', 'in_progress', 'done', 'closed'];
    if (!allowed.includes(s)) return bad(res, 400, 'Некорректный статус');
    await db.query('UPDATE additional_tz SET status = ? WHERE id = ?', [s, id]);
    const [[row]] = await db.query('SELECT * FROM additional_tz WHERE id = ?', [id]);
    return ok(res, row);
  } catch (e) { return bad(res, 500, 'Ошибка обновления статуса', e); }
});

router.delete('/additional-tz/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM additional_tz WHERE id = ?', [Number(req.params.id)]);
    return ok(res, { id: Number(req.params.id) });
  } catch (e) { return bad(res, 500, 'Ошибка удаления доп. ТЗ', e); }
});

module.exports = router;
