const express = require('express');
const router = express.Router();
const callCenterController = require('../controllers/callCenterController');
const { authenticateToken } = require('../middleware/auth');

router.get('/meta', authenticateToken, callCenterController.getEnums);
router.get('/dashboard', authenticateToken, callCenterController.getDashboard);
router.get('/operators', authenticateToken, callCenterController.getOperators);
router.patch('/operators/me/status', authenticateToken, callCenterController.updateMyOperatorStatus);
router.get('/leads', authenticateToken, callCenterController.getLeads);
router.get('/leads/:id', authenticateToken, callCenterController.getLeadById);
router.patch('/leads/:id', authenticateToken, callCenterController.updateLead);
router.post('/calls', authenticateToken, callCenterController.createCall);

module.exports = {
  router,
  receiveIncomingLead: callCenterController.receiveIncomingLead
};
