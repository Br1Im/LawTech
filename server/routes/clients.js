const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authenticateToken } = require('../middleware/auth');
const clientPhonesController = require('../controllers/clientPhonesController');

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Поиск клиентов
router.get('/search', clientController.searchClients);

// Получить всех клиентов офиса
router.get('/', clientController.getAllClients);

// Телефоны клиента
router.get('/:id/phones', clientPhonesController.list);
router.post('/:id/phones', clientPhonesController.create);
router.patch('/:id/phones/:phoneId', clientPhonesController.update);
router.delete('/:id/phones/:phoneId', clientPhonesController.remove);

// Получить клиента по ID
router.get('/:id', clientController.getClientById);

// Создать нового клиента
router.post('/', clientController.createClient);

// Обновить клиента
router.put('/:id', clientController.updateClient);

// Удалить клиента
router.delete('/:id', clientController.deleteClient);

module.exports = router;
