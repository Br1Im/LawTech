const express = require('express');
const router = express.Router();
const callCenterController = require('../controllers/callCenterController');
const { authenticateToken } = require('../middleware/auth');

// Только КЦ-роли (начальник и оператор) + директор имеют доступ к лидам
const requireCCRole = (req, res, next) => {
  const allowed = ['cc_manager', 'cc_operator', 'director'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Доступ только для сотрудников колл-центра' });
  }
  next();
};

router.get('/meta', authenticateToken, callCenterController.getEnums);
router.get('/dashboard', authenticateToken, callCenterController.getDashboard);
router.get('/operators', authenticateToken, callCenterController.getOperators);
router.get('/sources', authenticateToken, callCenterController.getSources);
router.get('/stats/operators', authenticateToken, callCenterController.getOperatorStats);
router.patch('/operators/me/status', authenticateToken, callCenterController.updateMyOperatorStatus);
router.get('/leads', authenticateToken, requireCCRole, callCenterController.getLeads);
router.get('/leads/:id', authenticateToken, requireCCRole, callCenterController.getLeadById);
router.patch('/leads/:id', authenticateToken, requireCCRole, callCenterController.updateLead);
router.patch('/leads/:id/temperature', authenticateToken, requireCCRole, callCenterController.setLeadTemperature);
router.post('/leads/bulk-assign', authenticateToken, requireCCRole, callCenterController.bulkAssignLeads);
router.post('/calls', authenticateToken, requireCCRole, callCenterController.createCall);
router.post('/test-lead', authenticateToken, requireCCRole, callCenterController.createTestLead);
router.post('/leads/:id/book', authenticateToken, requireCCRole, callCenterController.bookClient);

module.exports = {
  router,
  receiveIncomingLead: callCenterController.receiveIncomingLead
};
