const express = require('express');
const controller = require('../controllers/callCenterConnectionsController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.get('/me', controller.getMine);
router.post('/me/rotate-code', controller.rotateCode);
router.post('/lookup', controller.lookup);
router.get('/offices/:officeId', controller.listForOffice);
router.post('/offices/:officeId/requests', controller.requestConnection);
router.post('/requests/:id/:decision', controller.respond);
router.delete('/offices/:officeId/:callCenterId', controller.disconnect);

module.exports = router;
