/**
 * Маршруты API для приложения
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { authenticateToken } = require('../middleware/auth');
const authController = require('../controllers/auth');
const legalController = require('../controllers/legal');
const fileController = require('../controllers/file');
const authMiddleware = require('../middleware/authMiddleware');
const officeController = require('../controllers/officeController');
const chatController = require('../controllers/chatController');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Проверяем существование директории uploads
    if (!fs.existsSync(config.paths.uploads)) {
      fs.mkdirSync(config.paths.uploads, { recursive: true });
    }
    cb(null, config.paths.uploads);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Маршруты аутентификации
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticateToken, authController.getCurrentUser);

// Маршруты для юридических запросов
router.post('/chat', authenticateToken, legalController.handleChatRequest);

// Маршрут для загрузки файлов
router.post('/upload', authenticateToken, upload.single('file'), fileController.handleFileUpload);

// Роуты для офисов
router.get('/offices', authMiddleware, officeController.getAllOffices);
router.get('/offices/:officeId', authMiddleware, officeController.getOfficeById);
router.post('/offices', authMiddleware, officeController.createOffice);
router.put('/offices/:officeId', authMiddleware, officeController.updateOffice);
router.delete('/offices/:officeId', authMiddleware, officeController.deleteOffice);

// Роуты для чата
router.get('/offices/:officeId/messages', authMiddleware, chatController.getOfficeMessages);
router.post('/offices/:officeId/messages', authMiddleware, chatController.sendMessage);
router.put('/messages/:messageId/read', authMiddleware, chatController.markMessageAsRead);
router.delete('/messages/:messageId', authMiddleware, chatController.deleteMessage);

module.exports = router; 