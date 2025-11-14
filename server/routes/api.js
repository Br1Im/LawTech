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
const officeController = require('../controllers/officeController');
const chatController = require('../controllers/chatController');
const calendarController = require('../controllers/calendarController');
const officeRoutes = require('./officeRoutes');
const contractRoutes = require('./contracts');
const clientRoutes = require('./clients');
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
router.get('/offices', authenticateToken, officeController.getAllOffices);
router.get('/offices/revenue', authenticateToken, officeController.getOfficesRevenue);
router.get('/offices/:officeId', authenticateToken, officeController.getOfficeById);
router.post('/offices', authenticateToken, officeController.createOffice);
router.put('/offices/:officeId', authenticateToken, officeController.updateOffice);
router.delete('/offices/:officeId', authenticateToken, officeController.deleteOffice);

// Подключаем дополнительные маршруты офисов
router.use('/offices', authenticateToken, officeRoutes);

// Подключаем маршруты для договоров и клиентов
router.use('/contracts', contractRoutes);
router.use('/clients', clientRoutes);

// Дополнительные маршруты для совместимости
const contractController = require('../controllers/contractController');
router.get('/office/:officeId/contracts', authenticateToken, contractController.getAllContracts);

// Роуты для чата
router.get('/offices/:officeId/messages', authenticateToken, chatController.getOfficeMessages);
router.post('/offices/:officeId/messages', authenticateToken, chatController.sendMessage);
router.put('/messages/:messageId/read', authenticateToken, chatController.markMessageAsRead);
router.delete('/messages/:messageId', authenticateToken, chatController.deleteMessage);

// Роуты для документов офиса
router.get('/office/:officeId/documents', authenticateToken, legalDocumentsController.getOfficeDocuments);
router.post('/documents', authenticateToken, legalDocumentsController.createDocument);

// Роуты для материалов офиса
router.get('/office/:officeId/materials', authenticateToken, (req, res) => {
  res.json({ materials: [] });
});

// Роуты для дел офиса (cases)
router.get('/office/:officeId/cases', authenticateToken, (req, res) => {
  res.json([]);
});

// Роуты для клиентов офиса - используем новый контроллер
const clientController = require('../controllers/clientController');
router.get('/office/:officeId/clients', authenticateToken, clientController.getAllClients);

// Роуты для расходов офиса
router.get('/office/:officeId/expenses', authenticateToken, (req, res) => {
  res.json([]);
});

// Роуты для приходов офиса
router.get('/office/:officeId/arrivals', authenticateToken, (req, res) => {
  res.json([]);
});

// Роуты для сотрудников офиса
router.get('/office/:officeId/employees', authenticateToken, (req, res) => {
  res.json([]);
});

// Роуты для заявок на присоединение к офису
router.get('/office/:officeId/join-requests', authenticateToken, (req, res) => {
  res.json([]);
});

// Роуты для календарных событий
router.get('/office/:officeId/calendar-events', authenticateToken, calendarController.getOfficeCalendarEvents);
router.get('/office/:officeId/calendar-events/range', authenticateToken, calendarController.getCalendarEventsByDateRange);
router.post('/calendar-events', authenticateToken, calendarController.createCalendarEvent);
router.put('/calendar-events/:id', authenticateToken, calendarController.updateCalendarEvent);
router.delete('/calendar-events/:id', authenticateToken, calendarController.deleteCalendarEvent);

// Роут для получения всех событий календаря для всех офисов пользователя
router.get('/calendar-events/all', authenticateToken, calendarController.getAllCalendarEvents);

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

// Маршруты для работы с договорами (contracts) - используем новый контроллер через contractRoutes
// Старые маршруты удалены, используются новые из ./contracts.js

module.exports = router;