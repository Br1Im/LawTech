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
const userStatusController = require('../controllers/userStatus');
const privateMessageController = require('../controllers/privateMessageController');
const profileController = require('../controllers/profileController');

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

// Фильтр для загрузки только изображений
const imageFilter = function (req, file, cb) {
  // Проверяем тип файла
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return cb(new Error('Разрешены только изображения!'), false);
  }
  cb(null, true);
};

const upload = multer({ 
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

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

// Роуты для статуса пользователей
router.post('/users/status', authenticateToken, userStatusController.updateUserStatus);
router.get('/users/status', authenticateToken, userStatusController.getUsersStatus);

// Роуты для личных сообщений
router.get('/conversations', authenticateToken, privateMessageController.getUserConversations);
router.get('/conversations/:otherUserId', authenticateToken, privateMessageController.getConversation);
router.post('/conversations/:receiverId', authenticateToken, privateMessageController.sendMessage);
router.put('/conversations/:senderId/read', authenticateToken, privateMessageController.markMessagesAsRead);
router.delete('/messages/private/:messageId', authenticateToken, privateMessageController.deleteMessage);
router.get('/users/:userId/info', authenticateToken, privateMessageController.getUserInfo);

// Роуты для управления профилем пользователя
router.get('/profile', authenticateToken, profileController.getProfile);
router.put('/profile', authenticateToken, profileController.updateProfile);
router.post('/profile/avatar', authenticateToken, upload.single('avatar'), profileController.uploadAvatar);
router.delete('/profile/avatar', authenticateToken, profileController.deleteAvatar);

module.exports = router; 