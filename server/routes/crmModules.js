/**
 * CRM модули: cases, expenses, arrivals, materials, employees, join_requests
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const c = require('../controllers/crmModules');

router.use(authenticateToken);

// CASES
router.get('/office/:officeId/cases', c.cases.list);
router.get('/cases', c.cases.list);
router.post('/cases', c.cases.create);
router.put('/cases/:id', c.cases.update);
router.delete('/cases/:id', c.cases.remove);

// EXPENSES

// ARRIVALS
router.get('/office/:officeId/arrivals', c.arrivals.list);
router.get('/office/:officeId/arrivals/summary', c.arrivals.summary);
router.get('/arrivals', c.arrivals.list);
router.post('/arrivals', c.arrivals.create);
router.put('/arrivals/:id', c.arrivals.update);
router.delete('/arrivals/:id', c.arrivals.remove);

// MATERIALS
router.get('/office/:officeId/materials', c.materials.list);
router.get('/materials', c.materials.list);
router.post('/materials', c.materials.create);
router.put('/materials/:id', c.materials.update);
router.delete('/materials/:id', c.materials.remove);

// Material download with proper headers
router.get('/materials/:id/download', async (req, res) => {
  const path = require('path');
  const fs = require('fs');
  const db = require('../db');
  const config = require('../config');
  try {
    const [[row]] = await db.query('SELECT * FROM materials WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Материал не найден' });
    if (!row.file_url) return res.status(410).json({ success: false, message: 'У материала нет файла' });
    const rel = row.file_url.replace(/^\/uploads\//, '').replace(/^\/+/, '');
    const filePath = path.join(config.paths.uploads, rel);
    if (!fs.existsSync(filePath)) return res.status(410).json({ success: false, message: 'Файл удалён с диска' });
    const mimeType = row.mime_type || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'attachment; filename*=UTF-8' + "'" + "'" + encodeURIComponent(row.name || path.basename(filePath)));
    return fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    console.error('material download err', e);
    return res.status(500).json({ success: false, message: 'Ошибка скачивания' });
  }
});

// EMPLOYEES
router.get('/office/:officeId/employees', c.employees.list);
router.get('/employees', c.employees.list);
router.post('/employees', c.employees.create);
router.put('/employees/:id', c.employees.update);
router.delete('/employees/:id', c.employees.remove);

// JOIN REQUESTS
router.get('/office/:officeId/join-requests', c.joinRequests.list);
router.get('/join-requests/status', c.joinRequests.myStatus);
router.post('/join-requests', c.joinRequests.create);
router.put('/join-requests/:id', c.joinRequests.updateStatus);

module.exports = router;
