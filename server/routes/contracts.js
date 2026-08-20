const express = require('express');
const rateLimit = require('express-rate-limit');
const contractPaymentLimiter=rateLimit({windowMs:60*1000,limit:30,standardHeaders:'draft-7',legacyHeaders:false,message:{success:false,message:'Слишком много платёжных операций. Повторите позже.'}});
const router = express.Router();
const contractController = require('../controllers/contractController');
const paymentController = require('../controllers/paymentController');
const installmentController = require('../controllers/installmentController');
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

router.get('/:id/installments', installmentController.list);
router.post('/:id/installments', installmentController.create);
router.put('/:id/installments/:installmentId', installmentController.update);
router.delete('/:id/installments/:installmentId', installmentController.remove);

// Изменить плановую дату следующей доплаты.
router.patch('/:id/payment-schedule', async (req, res) => {
  const db = require('../db');
  const { checkOfficeAccess } = require('../utils/ensureOffice');
  const { employeeIdForUser } = require('../utils/employeeIdentity');
  try {
    const id = Number(req.params.id);
    const [[contract]] = await db.query('SELECT id, office_id, id_employee, second_employee_id, amount, paid_amount, status FROM contracts WHERE id = ?', [id]);
    if (!contract) return res.status(404).json({ success: false, message: 'Договор не найден' });
    if (!await checkOfficeAccess(req.user, contract.office_id)) return res.status(403).json({ success: false, message: 'Доступ запрещён' });
    if (contract.status === 'terminated') return res.status(409).json({ success: false, message: 'Договор расторгнут' });
    if (Number(contract.paid_amount) >= Number(contract.amount)) return res.status(400).json({ success: false, message: 'Договор уже оплачен полностью' });
    const role = String(req.user.role || '').toLowerCase();
    const employeeId = await employeeIdForUser(req.user.id, db, contract.office_id);
    const allowed = ['admin', 'administrator', 'director', 'manager', 'okk'].includes(role)
      || [Number(contract.id_employee), Number(contract.second_employee_id)].includes(Number(employeeId));
    if (!allowed) return res.status(403).json({ success: false, message: 'Нет права менять дату доплаты' });
    const value = String(req.body.additional_payment_date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
      return res.status(400).json({ success: false, message: 'Укажите корректную дату доплаты' });
    }
    await db.query('UPDATE contracts SET additional_payment_date = ?, additional_payment_amount = ROUND(amount-paid_amount,2), updated_at = CURRENT_TIMESTAMP WHERE id = ?', [value, id]);
    return res.json({ success: true, data: { id, additional_payment_date: value, additional_payment_amount: Number(contract.amount)-Number(contract.paid_amount) } });
  } catch (error) {
    console.error('payment schedule update:', error);
    return res.status(500).json({ success: false, message: 'Не удалось сохранить дату доплаты' });
  }
});

// Обновить данные расторжения (директор/менеджер/ОКК)
router.patch('/:id/terminate-data', contractController.updateTerminationData);

// Создать новый договор
router.post('/', contractController.createContract);

// Обновить данные карточки клиента (документы, обстоятельства, эксперт, тема)
router.patch('/:id/card-data', async (req, res) => {
  const db = require('../db');
  const { employeeIdForUser } = require('../utils/employeeIdentity');
  const { applyExpertDeadline, publicMessage } = require('../services/expertDeadlineService');
  const connection = await db.getClient();
  try {
    const contractId = Number(req.params.id);
    const [[contract]] = await connection.query('SELECT id,office_id,contract_type,id_employee,second_employee_id FROM contracts WHERE id=? LIMIT 1',[contractId]);
    if (!contract) return res.status(404).json({success:false,message:'Договор не найден'});
    const { checkOfficeAccess } = require('../utils/ensureOffice');
    if (!await checkOfficeAccess(req.user, contract.office_id)) {
      // Do not reveal that a foreign-office contract exists.
      return res.status(404).json({success:false,message:'Договор не найден'});
    }
    const role=String(req.user.role||'').toLowerCase();
    const ownEmployeeId=await employeeIdForUser(req.user.id,connection,contract.office_id);
    const leadership=['director','manager','okk'].includes(role);
    const assignedLawyer=role==='lawyer' && ownEmployeeId
      && [Number(contract.id_employee),Number(contract.second_employee_id)].includes(Number(ownEmployeeId));
    if (!leadership && !assignedLawyer) {
      return res.status(403).json({success:false,message:'Изменять карточку может руководство или назначенный юрист'});
    }
    const body=req.body||{};
    if ((contract.contract_type||'docs')==='docs' && (body.expert_id!==undefined || body.expert_deadline_days!==undefined) && (body.expert_id==null || body.expert_deadline_days==null)) return res.status(400).json({success:false,message:'Expert and deadline days are required'});
    await connection.beginTransaction();
    const sets=[],params=[];
    for(const f of ['document_types','custom_documents']) if(body[f]!==undefined){sets.push(`${f}=?`);params.push(JSON.stringify(body[f]));}
    for(const f of ['circumstances','title','customer_goal','expert_deadline_comment']) if(body[f]!==undefined){sets.push(`${f}=?`);params.push(body[f]||null);}
    for(const f of ['legal_cost_comp','moral_comp']) if(body[f]!==undefined){sets.push(`${f}=?`);params.push(body[f]===''||body[f]===null?null:Number(body[f]));}
    if(sets.length){params.push(contractId);await connection.query(`UPDATE contracts SET ${sets.join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`,params);}
    if(body.expert_id!==undefined || body.expert_deadline_days!==undefined) await applyExpertDeadline(connection,contractId,body.expert_id,body.expert_deadline_days);
    const [[fresh]]=await connection.query('SELECT contract_type,customer_goal,circumstances,document_types,custom_documents,expert_id,expert_deadline_days FROM contracts WHERE id=?',[contractId]);
    if(fresh){let docs=[];try{docs=[...(JSON.parse(fresh.document_types||'[]')),...(JSON.parse(fresh.custom_documents||'[]'))]}catch{};const filled=(fresh.contract_type==='court_rep'&&String(fresh.circumstances||'').trim())||(fresh.contract_type!=='court_rep'&&String(fresh.customer_goal||'').trim()&&String(fresh.circumstances||'').trim()&&docs.length&&fresh.expert_id&&fresh.expert_deadline_days);if(filled)await connection.query('UPDATE contracts SET needs_lawyer_input=0 WHERE id=?',[contractId]);}
    await connection.commit();
    if(body.expert_id!==undefined || body.expert_deadline_days!==undefined) await require('../services/deadlineNotifications').onDeadlineSet(contractId);
    res.json({success:true});
  } catch(error) {
    try{await connection.rollback()}catch{}
    res.status(error.status||500).json({success:false,message:publicMessage(error)});
  } finally { connection.release(); }
});

// Update contract
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
    if (role === 'expert' && user.id) {
      const [[employee]] = await db.query(
        'SELECT id FROM employees WHERE user_id = ? LIMIT 1',
        [user.id]
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
