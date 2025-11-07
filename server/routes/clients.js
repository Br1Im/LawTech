const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authenticateToken } = require('../middleware/auth');

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Поиск клиентов
router.get('/search', clientController.searchClients);

// Получить всех клиентов офиса
router.get('/', clientController.getAllClients);

// Получить клиента по ID
router.get('/:id', clientController.getClientById);

// Создать нового клиента
router.post('/', clientController.createClient);

// Обновить клиента
router.put('/:id', clientController.updateClient);

// Удалить клиента
router.delete('/:id', clientController.deleteClient);

module.exports = router;
