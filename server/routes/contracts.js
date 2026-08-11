const express = require('express');
const rateLimit = require('express-rate-limit');
const contractPaymentLimiter=rateLimit({windowMs:60*1000,limit:30,standardHeaders:'draft-7',legacyHeaders:false,message:{success:false,message:'Слишком много платёжных операций. Повторите позже.'}});
const router = express.Router();
const contractController = require('../controllers/contractController');
const paymentController = require('../controllers/paymentController');
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

// История изменений договора (состав юристов и т.п.)
router.get('/:id/history', contractController.getContractHistory);

// Расторгнуть договор
router.post('/:id/terminate', contractController.terminateContract);

// Подтвердить возврат денег
router.post('/:id/confirm-refund', contractController.confirmRefund);

// Подтвердить оплату остатка
router.post('/:id/confirm-remainder', contractController.confirmRemainder);

// Обновить данные расторжения (директор/менеджер/ОКК)
router.patch('/:id/terminate-data', contractController.updateTerminationData);

// Создать новый договор
router.post('/', contractController.createContract);

// Обновить данные карточки клиента (документы, обстоятельства, эксперт, тема)
router.patch('/:id/card-data', async (req, res) => {
  try {
    // Представитель не может редактировать карточку договора
    const userRole = String(req.user.role || '').toLowerCase();
    if (userRole === 'representative') {
      return res.status(403).json({ success: false, message: 'Представитель не может редактировать карточку договора' });
    }

    const contractId = req.params.id;
    const { document_types, custom_documents, circumstances, expert_id, title, customer_goal, legal_cost_comp, moral_comp, expert_deadline, expert_deadline_time, expert_deadline_comment } = req.body;
    const db = require('../db');

    const sets = [];
    const params = [];

    if (document_types !== undefined) {
      sets.push('document_types = ?');
      params.push(JSON.stringify(document_types));
    }
    if (custom_documents !== undefined) {
      sets.push('custom_documents = ?');
      params.push(JSON.stringify(custom_documents));
    }
    if (circumstances !== undefined) {
      sets.push('circumstances = ?');
      params.push(circumstances);
    }
    if (expert_id !== undefined) {
      sets.push('expert_id = ?');
      params.push(expert_id ? Number(expert_id) : null);
    }
    if (title !== undefined) {
      sets.push('title = ?');
      params.push(title);
    }
    if (customer_goal !== undefined) {
      sets.push('customer_goal = ?');
      params.push(customer_goal || null);
    }
    if (legal_cost_comp !== undefined) {
      sets.push('legal_cost_comp = ?');
      params.push(legal_cost_comp === null || legal_cost_comp === '' ? null : Number(legal_cost_comp));
    }
    if (moral_comp !== undefined) {
      sets.push('moral_comp = ?');
      params.push(moral_comp === null || moral_comp === '' ? null : Number(moral_comp));
    }
    if (expert_deadline !== undefined) {
      sets.push('expert_deadline = ?');
      params.push(expert_deadline ? expert_deadline : null);
    }
    if (expert_deadline_time !== undefined) {
      sets.push('expert_deadline_time = ?');
      params.push(expert_deadline_time ? expert_deadline_time : null);
    }
    if (expert_deadline_comment !== undefined) {
      sets.push('expert_deadline_comment = ?');
      params.push(expert_deadline_comment ? expert_deadline_comment : null);
    }

    if (sets.length === 0) {
      return res.status(400).json({ message: 'Нет данных для обновления' });
    }

    params.push(contractId);
    await db.query(
      `UPDATE contracts SET ${sets.join(', ')} WHERE id = ?`,
      params
    );

    // Авто-снятие needs_lawyer_input если ТЗ заполнено
    try {
      const [rows] = await db.query(
        'SELECT contract_type, customer_goal, circumstances, document_types, custom_documents FROM contracts WHERE id = ?',
        [contractId]
      );
      const c = rows && rows[0];
      if (c) {
        const isCourtRep = (c.contract_type || 'docs') === 'court_rep';
        const hasCircum = c.circumstances && String(c.circumstances).trim().length > 0;
        let isFilled = false;
        if (isCourtRep) {
          isFilled = hasCircum;
        } else {
          const hasGoal = c.customer_goal && String(c.customer_goal).trim().length > 0;
          const hasDocs = (() => {
            try {
              const dt = typeof c.document_types === 'string' ? JSON.parse(c.document_types) : c.document_types;
              const cd = typeof c.custom_documents === 'string' ? JSON.parse(c.custom_documents) : c.custom_documents;
              return (Array.isArray(dt) && dt.length > 0) || (Array.isArray(cd) && cd.length > 0);
            } catch { return false; }
          })();
          isFilled = hasGoal && hasCircum && hasDocs;
        }
        if (isFilled) {
          await db.query('UPDATE contracts SET needs_lawyer_input = 0 WHERE id = ?', [contractId]);
        }
      }
    } catch (e) {
      console.error('needs_lawyer_input auto-clear failed:', e.message);
    }

    if (expert_deadline !== undefined || expert_deadline_time !== undefined || expert_deadline_comment !== undefined) {
      try { await require('../services/deadlineNotifications').onDeadlineSet(contractId); } catch (e) { console.error('onDeadlineSet:', e.message); }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating card data:', error);
    res.status(500).json({ message: 'Ошибка при сохранении данных карточки' });
  }
});

// Обновить договор
router.put('/:id', contractController.updateContract);

// Удалить договор
router.delete('/:id', contractController.deleteContract);

// Платежи по договору
router.get('/:id/payments', paymentController.getPayments);
router.post('/:id/payments', contractPaymentLimiter, paymentController.addPayment);
router.patch('/:id/payments/:paymentId/confirm', contractPaymentLimiter, paymentController.confirmPayment);
router.delete('/:id/payments/:paymentId', contractPaymentLimiter, paymentController.deletePayment);

// Цепочка документов: эксперт Ожидание ↔ Готово; руководство Готово → Исполнено.
router.patch('/:id/docs-status', async (req, res) => {
  try {
    const db = require('../db');
    const { checkOfficeAccess } = require('../utils/ensureOffice');
    const user = req.user;
    const contractId = req.params.id;
    const next = String(req.body.docs_status || '').toLowerCase();
    if (!['pending', 'ready', 'completed'].includes(next)) {
      return res.status(400).json({ success: false, message: 'Неверный статус документов' });
    }
    const [[c]] = await db.query('SELECT id, office_id, expert_id, id_employee, registered_by, docs_status FROM contracts WHERE id = ?', [contractId]);
    if (!c) return res.status(404).json({ success: false, message: 'Договор не найден' });
    const allowed = await checkOfficeAccess(user, c.office_id);
    if (!allowed) return res.status(403).json({ success: false, message: 'Доступ запрещен' });
    const role = String(user.role || '').toLowerCase();
    // Только назначенный эксперт меняет статус документов.
    let expertEmployeeId = null;
    if (role === 'expert' && user.email) {
      const [[employee]] = await db.query(
        'SELECT id FROM employees WHERE email = ? LIMIT 1',
        [user.email]
      );
      expertEmployeeId = employee ? Number(employee.id) : null;
    }
    const isAssignedToCurrentExpert = c.expert_id != null && (
      Number(c.expert_id) === Number(user.id) ||
      (expertEmployeeId != null && Number(c.expert_id) === expertEmployeeId)
    );
    const current = String(c.docs_status || 'pending').toLowerCase();
    const isManagement = ['director', 'manager', 'okk'].includes(role);
    const expertCanEdit = role === 'expert'
      && current !== 'completed'
      && ['pending', 'ready'].includes(next)
      && (c.expert_id == null || isAssignedToCurrentExpert);
    const managementCanComplete = isManagement && current === 'ready' && next === 'completed';
    if (!expertCanEdit && !managementCanComplete) {
      return res.status(403).json({
        success: false,
        message: isManagement
          ? 'Руководство может изменить только статус «Готово» на «Исполнено»'
          : 'Статусы «Ожидание» и «Готово» может менять только назначенный эксперт',
      });
    }
    await db.query('UPDATE contracts SET docs_status = ? WHERE id = ?', [next, contractId]);
    if (next === 'ready') { try { require('../services/workflowEngine').handleEvent('docs_ready', Number(contractId), user.id); } catch (e) { console.error('wf docs_ready:', e.message); } }
    res.json({ success: true, id: Number(contractId), docs_status: next });
  } catch (error) {
    console.error('Error updating docs_status:', error);
    res.status(500).json({ success: false, message: 'Ошибка при обновлении статуса документов' });
  }
});

module.exports = router;
