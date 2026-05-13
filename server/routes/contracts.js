const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { authenticateToken } = require('../middleware/auth');

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Получить все договоры офиса
router.get('/', contractController.getAllContracts);

// Получить договоры конкретного офиса
router.get('/office/:officeId', contractController.getAllContracts);

// Получить расторгнутые договоры
router.get('/terminated', contractController.getTerminatedContracts);

// Получить статистику по договорам
router.get('/stats', contractController.getContractStats);

// Генерация номера договора DDMMYYXX
router.get('/generate-number', contractController.generateNumber);

// Получить договор по ID
router.get('/:id', contractController.getContractById);

// Расторгнуть договор
router.post('/:id/terminate', contractController.terminateContract);

// Подтвердить возврат денег
router.post('/:id/confirm-refund', contractController.confirmRefund);

// Создать новый договор
router.post('/', contractController.createContract);

// Обновить договор
router.put('/:id', contractController.updateContract);

// Удалить договор
router.delete('/:id', contractController.deleteContract);

module.exports = router;
