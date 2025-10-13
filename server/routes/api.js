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
const calendarController = require('../controllers/calendarController');
const officeRoutes = require('./officeRoutes');
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

// Роуты для клиентов офиса
router.get('/office/:officeId/clients', authenticateToken, async (req, res) => {
  try {
    const { officeId } = req.params;
    const db = require('../db');
    
    // Получаем клиентов из базы данных
    const clients = await db.query(`
      SELECT c.*, 
             CASE 
               WHEN ca.id IS NOT NULL THEN ca.title 
               ELSE 'Без дела' 
             END as theme,
             CASE 
               WHEN e.id IS NOT NULL THEN CONCAT(e.surname, ' ', e.name) 
               ELSE 'Не назначен' 
             END as lawyer
      FROM clients c
      LEFT JOIN cases ca ON c.id = ca.client_id
      LEFT JOIN employees e ON ca.employee_id = e.id
      WHERE c.office_id = ?
    `, [officeId]);
    
    // Преобразуем данные в формат, ожидаемый фронтендом
    const formattedClients = clients.map(client => ({
      id: client.id,
      clientName: `${client.surname} ${client.name}${client.middle_name ? ' ' + client.middle_name : ''}`,
      contractNumber: `DOG-${client.id.toString().padStart(4, '0')}`,
      theme: client.theme,
      lawyer: client.lawyer,
      materials: [], // Пока пустой массив, можно расширить позже
      assignedExpert: null, // Пока null, можно расширить позже
      expertDocuments: [] // Пока пустой массив, можно расширить позже
    }));
    
    res.json(formattedClients);
  } catch (error) {
    console.error('Ошибка получения клиентов:', error);
    res.status(500).json({ error: 'Не удалось получить список клиентов' });
  }
});

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

// Маршруты для работы с договорами (contracts)
router.get('/office/:officeId/contracts', authenticateToken, legalDocumentsController.getOfficeContracts);
router.post('/contracts', authenticateToken, legalDocumentsController.createContract);
router.get('/contracts/:id', authenticateToken, legalDocumentsController.getContractById);

module.exports = router;