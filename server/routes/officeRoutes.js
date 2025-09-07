const express = require('express');
const router = express.Router();
const officeController = require('../controllers/officeController');

// Получить данные о выручке офисов
router.get('/revenue', officeController.getOfficesRevenue);

// Получить все офисы с полными данными
router.get('/', officeController.getAllOffices);

// Получить офис по ID
router.get('/:id', officeController.getOfficeById);

// Создать новый офис
router.post('/', officeController.createOffice);

// Обновить статистику офиса
router.put('/:id/stats', officeController.updateOfficeStats);

module.exports = router;