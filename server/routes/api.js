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
const legalDocumentsController = require('../controllers/legalDocuments');
const fileController = require('../controllers/file');
const authMiddleware = require('../middleware/authMiddleware');
const officeController = require('../controllers/officeController');
const chatController = require('../controllers/chatController');
// Эти контроллеры пока не реализованы
// const employeeController = require('../controllers/employeeController');
// const joinRequestController = require('../controllers/joinRequestController');

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

// Health check endpoint для Render
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Маршруты аутентификации
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);
router.get('/auth/me', authenticateToken, authController.getCurrentUser);
router.get('/profile', authenticateToken, authController.getCurrentUser); // Добавлен маршрут для совместимости с фронтендом

// Маршруты для юридических запросов
router.post('/chat', authenticateToken, legalController.handleChatRequest);

// Маршрут для загрузки файлов
router.post('/upload', authenticateToken, upload.single('file'), fileController.handleFileUpload);

// Роуты для офисов
router.get('/offices', authMiddleware, officeController.getAllOffices);
router.get('/offices/revenue', authMiddleware, officeController.getOfficesRevenue);
router.get('/offices/:officeId', authMiddleware, officeController.getOfficeById);
router.post('/offices', authMiddleware, officeController.createOffice);
router.put('/offices/:officeId', authMiddleware, officeController.updateOffice);
router.delete('/offices/:officeId', authMiddleware, officeController.deleteOffice);

// Роуты для чата
router.get('/offices/:officeId/messages', authMiddleware, chatController.getOfficeMessages);
router.post('/offices/:officeId/messages', authMiddleware, chatController.sendMessage);
router.put('/messages/:messageId/read', authMiddleware, chatController.markMessageAsRead);
router.delete('/messages/:messageId', authMiddleware, chatController.deleteMessage);

// Роуты для документов офиса
router.get('/office/:officeId/documents', authenticateToken, legalDocumentsController.getOfficeDocuments);
router.post('/documents', authenticateToken, legalDocumentsController.createDocument);

// Роуты для сотрудников офиса - временно отключены
// router.get('/office/:officeId/employees', authenticateToken, employeeController.getOfficeEmployees);
// router.get('/employees/:employeeId', authenticateToken, employeeController.getEmployeeById);
// router.put('/employees/:employeeId', authenticateToken, employeeController.updateEmployee);
// router.delete('/employees/:employeeId', authenticateToken, employeeController.deleteEmployee);

// Роуты для заявок на присоединение к офису - временно отключены
// router.get('/office/:officeId/join-requests', authenticateToken, joinRequestController.getOfficeJoinRequests);
// router.get('/join-requests/status', authenticateToken, joinRequestController.getUserRequestStatus);
// router.put('/join-requests/:requestId', authenticateToken, joinRequestController.updateRequestStatus);
// router.post('/join-office', authenticateToken, joinRequestController.joinOffice);

// Маршруты для работы с юридическими документами и FAISS
router.get('/legal-documents', authenticateToken, legalDocumentsController.getAllDocuments);
router.get('/legal-documents/:id', authenticateToken, legalDocumentsController.getDocumentById);
router.post('/legal-documents', authenticateToken, legalDocumentsController.createDocument);
router.put('/legal-documents/:id', authenticateToken, legalDocumentsController.updateDocument);
router.delete('/legal-documents/:id', authenticateToken, legalDocumentsController.deleteDocument);

// Векторный поиск по документам
router.get('/legal-documents/search', authenticateToken, legalDocumentsController.searchDocuments);
router.get('/legal-documents/:id/similar', authenticateToken, legalDocumentsController.getSimilarDocuments);

module.exports = router;