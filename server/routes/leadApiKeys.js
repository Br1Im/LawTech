const express = require('express');
const controller = require('../controllers/leadApiKeysController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.get('/', controller.list);
router.post('/', controller.create);
router.post('/:id/verify', controller.verify);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
