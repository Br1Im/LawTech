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
const callCenterRoutes = require('./callCenter');
const callCenterConnectionsRoutes = require('./callCenterConnections');
const crmModulesRoutes = require('./crmModules');
const caseWorkflowRoutes = require('./caseWorkflow');
const employeeManagement = require('../controllers/employeeManagementController');
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
router.post('/auth/refresh', authController.refresh);
router.get('/auth/me', authenticateToken, authController.getCurrentUser);
router.get('/profile', authenticateToken, authController.getCurrentUser); // Добавлен маршрут для совместимости с фронтендом
router.put('/profile', authenticateToken, authController.updateProfile); // Обновление своего профиля (только директор)
router.post('/leads/incoming', callCenterRoutes.receiveIncomingLead);

// Gainnet webhook — no auth required (verified by webhook key inside handler)
const gainnetService = require('../services/gainnetService');
router.post('/gainnet/webhook', gainnetService.handleWebhook);

router.use('/call-center', callCenterRoutes.router);
router.use('/call-center-connections', callCenterConnectionsRoutes);
// CRM модули: materials, cases, expenses, arrivals, employees
router.use(crmModulesRoutes);
router.use(caseWorkflowRoutes);

// Маршруты для записей (appointments) — доступны всем авторизованным
const callCenterController = require('../controllers/callCenterController');
const analyticsController = require('../controllers/analyticsController');
const appointmentSourcesController = require('../controllers/appointmentSourcesController');
router.get('/appointments', authenticateToken, callCenterController.getAppointments);
router.post('/appointments', authenticateToken, callCenterController.createDirectAppointment);
router.patch('/appointments/:id/status', authenticateToken, callCenterController.updateAppointmentStatus);
router.patch('/appointments/:id/consultation-result', authenticateToken, callCenterController.setConsultationResult);
router.patch('/appointments/:id', authenticateToken, callCenterController.updateAppointment);

// Маршруты для Приходов (visits)
router.get('/visits/primary', authenticateToken, callCenterController.getPrimaryVisits);
router.get('/visits/existing', authenticateToken, callCenterController.getExistingClientVisits);
router.post('/visits/existing', authenticateToken, callCenterController.addExistingClientVisit);
router.get('/visits/stats', authenticateToken, callCenterController.getVisitsStats);
router.get('/visits/employees', authenticateToken, callCenterController.getOfficeEmployees);
router.patch('/appointments/:id/assign-lawyer', authenticateToken, callCenterController.assignLawyer);
router.get('/visits/consultation-stats', authenticateToken, callCenterController.getConsultationStats);

// Analytics
router.get('/analytics/call-center', authenticateToken, analyticsController.getCallCenterAnalytics);

// Unified appointment source directory
router.get('/appointment-sources', authenticateToken, appointmentSourcesController.list);
router.post('/appointment-sources', authenticateToken, appointmentSourcesController.create);
router.patch('/appointment-sources/:id', authenticateToken, appointmentSourcesController.update);

// Маршруты для юридических запросов
router.post('/chat', authenticateToken, legalController.handleChatRequest);

// Маршрут для загрузки файлов
router.post('/upload', authenticateToken, upload.single('file'), fileController.handleFileUpload);

// Роуты для офисов
router.get('/offices/my', authenticateToken, officeController.getMyOffices);
router.post('/offices/switch', authenticateToken, officeController.switchOffice);
router.get('/offices', authenticateToken, officeController.getAllOffices);
router.get('/offices/revenue', authenticateToken, officeController.getOfficesRevenue);
router.get('/offices/:officeId', authenticateToken, officeController.getOfficeById);
router.post('/offices', authenticateToken, officeController.createOffice);
router.put('/offices/:officeId', authenticateToken, officeController.updateOffice);
router.delete('/offices/:officeId', authenticateToken, officeController.deleteOffice);

// Подключаем дополнительные маршруты офисов
router.use('/offices', authenticateToken, officeRoutes);

// Управление сотрудниками (иерархическая система)
router.get('/staff', authenticateToken, employeeManagement.getEmployees);
router.get('/staff/:id/dismissal-preview', authenticateToken, employeeManagement.getDismissalPreview);
router.post('/staff/:id/dismiss', authenticateToken, employeeManagement.dismissEmployee);
router.delete('/staff/:id', authenticateToken, employeeManagement.deleteEmployee);
router.post('/staff', authenticateToken, employeeManagement.createEmployee);
router.get('/staff/allowed-roles', authenticateToken, employeeManagement.getAllowedRoles);
router.put('/staff/:id', authenticateToken, employeeManagement.updateEmployee);
router.post('/staff/:id/reset-password', authenticateToken, employeeManagement.resetPassword);
router.patch('/staff/:id/active', authenticateToken, employeeManagement.deactivateEmployee);
router.patch('/staff/:id/role', authenticateToken, employeeManagement.changeRole);
router.get('/staff/changeable-roles', authenticateToken, employeeManagement.getChangeableRoles);
router.get('/staff/my-offices', authenticateToken, employeeManagement.getMyOffices);
router.patch('/staff/:id/office', authenticateToken, employeeManagement.transferOffice);
router.post('/staff/change-password', authenticateToken, employeeManagement.changeOwnPassword);

// Мульти-офис: назначение сотрудника на несколько офисов
router.get('/staff/:id/offices', authenticateToken, employeeManagement.getStaffOffices);
router.put('/staff/:id/offices', authenticateToken, employeeManagement.setStaffOffices);

// Назначения договоров (авто-маршрутизация)
const contractAssignmentController = require('../controllers/contractAssignmentController');
router.get('/assignments/my', authenticateToken, contractAssignmentController.getMyAssignments);
router.get('/assignments/contract/:contractId', authenticateToken, contractAssignmentController.getContractAssignments);
router.post('/assignments/contract/:contractId/representative', authenticateToken, contractAssignmentController.assignRepresentative);
router.post('/assignments/contract/:contractId/supplement', authenticateToken, contractAssignmentController.supplementContract);
router.patch('/assignments/:assignmentId/status', authenticateToken, contractAssignmentController.updateAssignmentStatus);

// Представитель — дела и процессуальные действия
const representativeController = require('../controllers/representativeController');
router.get('/representative/cases', authenticateToken, representativeController.getMyCases);
router.get('/representative/cases/:id', authenticateToken, representativeController.getCaseDetail);
router.get('/representative/cases/:id/actions', authenticateToken, representativeController.getCaseActions);
router.post('/representative/cases/:id/actions', authenticateToken, representativeController.addCaseAction);
router.delete('/representative/actions/:actionId', authenticateToken, representativeController.deleteCaseAction);
router.post('/representative/cases/:id/assign', authenticateToken, representativeController.assignCase);
router.get('/representative/list', authenticateToken, representativeController.getRepresentatives);

// Зарплата
const salaryController = require('../controllers/salaryController');
router.get('/salary', authenticateToken, salaryController.calculate);
router.get('/offices/:id/salary-settings', authenticateToken, salaryController.getSettings);
router.put('/offices/:id/salary-settings', authenticateToken, salaryController.updateSettings);
router.get('/employees/:id/salary', authenticateToken, salaryController.getEmployeeSalary);
router.put('/employees/:id/salary', authenticateToken, salaryController.upsertEmployeeSalary);
router.get('/shifts', authenticateToken, salaryController.listShifts);
router.post('/shifts', authenticateToken, salaryController.createShift);
router.delete('/shifts/:id', authenticateToken, salaryController.removeShift);
router.get('/salary-payments', authenticateToken, salaryController.listSalaryPayments);
router.post('/salary-payments', authenticateToken, salaryController.paySalary);
router.post('/salary-payments/:id/cancel', authenticateToken, salaryController.cancelSalaryPayment);

// Акты по договору
const actsController = require('../controllers/actsController');
router.get('/acts', authenticateToken, actsController.list);
router.get('/acts/:id', authenticateToken, actsController.getOne);
router.get('/acts/:id/attachments', authenticateToken, actsController.getAttachments);
router.put('/acts/:id', authenticateToken, actsController.update);
router.post('/acts/:id/confirm', authenticateToken, actsController.confirm);
router.delete('/acts/:id', authenticateToken, actsController.remove);
router.post('/contracts/:id/acts', authenticateToken, actsController.uploadMiddleware, actsController.createForContract);
router.get('/contracts/:id/acts', authenticateToken, (req, res, next) => {
  req.query.contract_id = req.params.id;
  return actsController.list(req, res, next);
});

// Документы по договору (.doc/.docx)
const contractDocsController = require('../controllers/contractDocsController');
router.get('/contracts/:id/documents', authenticateToken, contractDocsController.list);
router.post(
  '/contracts/:id/documents',
  authenticateToken,
  contractDocsController.uploadMiddleware,
  contractDocsController.create
);
router.get(
  '/contracts/:id/documents/:docId/download',
  authenticateToken,
  contractDocsController.download
);
router.delete(
  '/contracts/:id/documents/:docId',
  authenticateToken,
  contractDocsController.remove
);

// Подключаем маршруты для договоров и клиентов
router.use('/notifications', require('./notifications'));
router.use('/contracts', contractRoutes);
router.use('/clients', clientRoutes);

// Дополнительные маршруты для совместимости
const contractController = require('../controllers/contractController');
router.get('/office/:officeId/contracts', authenticateToken, contractController.getAllContracts);

// Office dashboard: per-office plan/fact + lawyers cash
const officeDashboardController = require('../controllers/officeDashboardController');
router.get('/office/:officeId/dashboard', authenticateToken, officeDashboardController.getDashboard);
router.get('/office/:officeId/plan', authenticateToken, officeDashboardController.getPlan);
router.put('/office/:officeId/plan', authenticateToken, officeDashboardController.upsertPlan);

// Роуты для чата
router.get('/chat/channels', authenticateToken, chatController.getAvailableChannels);
router.post('/chat/channels', authenticateToken, chatController.createChannel);
router.patch('/chat/channels/:channel', authenticateToken, chatController.renameChannel);
router.delete('/chat/channels/:channel', authenticateToken, chatController.archiveChannel);
router.get('/chat/participants', authenticateToken, chatController.getChannelParticipants);
router.get('/chat/candidates', authenticateToken, chatController.getChannelCandidates);
router.post('/chat/members', authenticateToken, chatController.addChannelMember);
router.delete('/chat/members', authenticateToken, chatController.removeChannelMember);
router.get('/offices/:officeId/messages', authenticateToken, chatController.getOfficeMessages);
router.get('/offices/:officeId/messages/unread', authenticateToken, chatController.getUnreadCounts);
router.get('/offices/:officeId/messages/search', authenticateToken, chatController.searchMessages);
router.post('/offices/:officeId/messages', authenticateToken, chatController.chatUploadMiddleware, chatController.sendMessage);
router.post('/offices/:officeId/messages/read-all', authenticateToken, chatController.markAllAsRead);
router.put('/messages/:messageId/read', authenticateToken, chatController.markMessageAsRead);
router.delete('/messages/:messageId', authenticateToken, chatController.deleteMessage);

// Роуты для документов офиса
router.get('/office/:officeId/documents', authenticateToken, legalDocumentsController.getOfficeDocuments);
router.post('/documents', authenticateToken, legalDocumentsController.createDocument);

// Материалы офиса — через crmModules

// Дела офиса — через crmModules

// Роуты для клиентов офиса - используем новый контроллер
const clientController = require('../controllers/clientController');
router.get('/office/:officeId/clients', authenticateToken, clientController.getAllClients);

// Роуты для расходов офиса
const expensesController = require('../controllers/expensesController');
router.get('/office/:officeId/expenses-summary', authenticateToken, expensesController.getSummary);
router.post('/expenses', authenticateToken, expensesController.createExpense);
router.put('/expenses/:id', authenticateToken, expensesController.updateExpense);
router.delete('/expenses/:id', authenticateToken, expensesController.deleteExpense);

// Роуты для «Баланс денежных средств»
const balanceController = require('../controllers/balanceController');
router.get('/office/:officeId/balance', authenticateToken, balanceController.getBalance);
router.get('/office/:officeId/balance/opening', authenticateToken, balanceController.getOpening);
router.put('/office/:officeId/balance/opening', authenticateToken, balanceController.setOpening);
router.get('/office/:officeId/balance/day', authenticateToken, balanceController.getDayDetail);
router.post('/office/:officeId/income', authenticateToken, balanceController.createIncome);
router.delete('/office/:officeId/income/:id', authenticateToken, balanceController.deleteIncome);
router.post('/office/:officeId/transfers', authenticateToken, balanceController.createTransfer);

// Роуты для приходов офиса
router.get('/office/:officeId/arrivals', authenticateToken, (req, res) => {
  res.json([]);
});

// Роуты для сотрудников офиса
router.get('/employees', authenticateToken, async (req, res) => {
  try {
    const db = require('../db');
    const officeId = req.query.office_id || req.user.office_id;
    console.log('[DEBUG /employees] officeId=', officeId, 'user.office_id=', req.user.office_id);
    if (!officeId) return res.json({ success: true, data: [] });
    const [rows] = await db.query(
      `SELECT DISTINCT e.*, u.role AS user_role, u.is_active
       FROM employees e
       LEFT JOIN users u ON u.email = e.email
       LEFT JOIN user_offices uo ON uo.user_id = u.id AND uo.office_id = ?
       WHERE (e.office_id = ? OR uo.office_id IS NOT NULL)
         AND (u.is_active = 1 OR u.is_active IS NULL)
         AND (u.role IS NULL OR u.role NOT IN ('cc_manager', 'cc_operator'))
       ORDER BY e.last_name, e.first_name`,
      [officeId, officeId]
    );
    console.log('[DEBUG /employees] returned', rows.length, 'rows, ids:', rows.map(r => r.id));
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ success: false, message: 'Ошибка получения сотрудников' });
  }
});
router.get('/office/:officeId/employees', authenticateToken, async (req, res) => {
  try {
    const db = require('../db');
    const officeId = req.params.officeId;
    const [rows] = await db.query(
      `SELECT DISTINCT e.*, u.role AS user_role, u.is_active
       FROM employees e
       LEFT JOIN users u ON u.email = e.email
       LEFT JOIN user_offices uo ON uo.user_id = u.id AND uo.office_id = ?
       WHERE (e.office_id = ? OR uo.office_id IS NOT NULL)
         AND (u.is_active = 1 OR u.is_active IS NULL)
         AND (u.role IS NULL OR u.role NOT IN ('cc_manager', 'cc_operator'))
       ORDER BY e.last_name, e.first_name`,
      [officeId, officeId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ success: false, message: 'Ошибка получения сотрудников' });
  }
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

// Роуты для сотрудников офиса
router.post('/employees/ensure', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const userId = (req.body && req.body.user_id) || user.id;
    const db = require('../db');
    const { ensureUserOffice } = require('../utils/ensureOffice');

    // Гарантируем наличие офиса у текущего пользователя (создаст при необходимости).
    const officeId = await ensureUserOffice(user);

    // Проверяем, существует ли уже employee с этим id.
    const [existing] = await db.query(
      'SELECT id, office_id FROM employees WHERE id = ?',
      [userId]
    );

    if (existing.length > 0) {
      // Если employee существует, но без офиса — допривязываем.
      if (!existing[0].office_id) {
        await db.query('UPDATE employees SET office_id = ? WHERE id = ?', [officeId, userId]);
      }
      return res.json({ success: true, data: { id: existing[0].id } });
    }

    // Создаем нового employee на основе данных пользователя
    const [userResult] = await db.query(
      'SELECT first_name, last_name, email FROM users WHERE id = ?',
      [userId]
    );

    if (userResult.length === 0) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    const userData = userResult[0];

    // Вставляем employee с тем же ID что и user
    await db.query(
      `INSERT INTO employees (id, first_name, last_name, email, office_id, position)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, userData.first_name, userData.last_name, userData.email, officeId, 'Юрист']
    );

    res.json({ success: true, data: { id: userId } });
  } catch (error) {
    console.error('Error ensuring employee:', error);
    res.status(500).json({ success: false, message: 'Ошибка при создании сотрудника' });
  }
});

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

// Заявления
const applicationsController = require('../controllers/applicationsController');
router.get('/applications', authenticateToken, applicationsController.list);
router.post('/applications', authenticateToken, applicationsController.create);
router.put('/applications/:id', authenticateToken, applicationsController.update);
router.delete('/applications/:id', authenticateToken, applicationsController.remove);

// Касса (журнал финансовых операций)
const cashRegisterController = require('../controllers/cashRegisterController');
router.get('/cash-register', authenticateToken, cashRegisterController.list);
router.get('/cash-register/totals', authenticateToken, cashRegisterController.totals);
router.get('/cash-register/stats', authenticateToken, cashRegisterController.stats);
router.post('/cash-register', authenticateToken, cashRegisterController.create);
router.put('/cash-register/:id', authenticateToken, cashRegisterController.update);
router.delete('/cash-register/:id', authenticateToken, cashRegisterController.remove);

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
