const express = require('express');
const router = express.Router();
const controller = require('../controllers/representativeController');
const { authenticateToken } = require('../middleware/auth');

// Мои дела (court_rep contracts)
router.get('/cases',              authenticateToken, controller.getMyCases);
router.get('/cases/:id',          authenticateToken, controller.getCaseDetail);

// Процессуальные действия
router.get('/cases/:id/actions',  authenticateToken, controller.getCaseActions);
router.post('/cases/:id/actions', authenticateToken, controller.addCaseAction);
router.delete('/actions/:actionId', authenticateToken, controller.deleteCaseAction);

// Назначение дел (для руководства)
router.post('/cases/:id/assign',  authenticateToken, controller.assignCase);

// Список представителей
router.get('/representatives',    authenticateToken, controller.getRepresentatives);

module.exports = router;
