const Contract = require('../models/contract');
const { ensureUserOffice, checkOfficeAccess, getUserOfficeIds } = require('../utils/ensureOffice');
const { REFUND_CONFIRM_ROLES } = require('../constants');
const TERMINATE_ROLES = ['director', 'manager', 'okk'];
const socketEmitter = require('../middleware/socketEmitter');
const { createAutoExpense } = require('./expensesController');
const { userForEmployee } = require('../utils/employeeIdentity');
const { canAccessContract } = require('../utils/contractAccess');

/**
 * Контроллер для работы с договорами
 */
const contractController = {
  /**
   * Получить все договоры офиса
   */
  async getAllContracts(req, res) {
    try {
      const user = req.user;
      
      // Подставляем office_id: сначала из URL/query, потом из пользователя.
      let officeId = req.params.officeId || req.query.office_id || null;
      
      if (officeId) {
        // Конкретный офис запрошен — проверяем доступ
        const allowed = await checkOfficeAccess(user, officeId);
        if (!allowed) {
          return res.status(403).json({ success: false, message: 'Доступ запрещен' });
        }
      } else {
        // Нет конкретного офиса — берём все доступные (мульти-офис)
        const officeIds = await getUserOfficeIds(user);
        if (officeIds.length === 0) {
          officeId = await ensureUserOffice(user);
          if (!officeId) {
            return res.status(403).json({ success: false, message: 'Пользователь не привязан к офису' });
          }
        } else if (officeIds.length === 1) {
          officeId = officeIds[0];
        } else {
          // Мульти-офис: передаём массив
          officeId = officeIds;
        }
      }

      if (["cc_operator", "cc_manager"].includes(user.role)) return res.status(403).json({success:false,message:'Нет доступа к договорам'});
      const page = parseInt(req.query.page, 10);
      const pageSize = Math.min(parseInt(req.query.page_size, 10) || 50, 200);

      if (page > 0 && ['admin','administrator','owner','director','manager','okk'].includes(user.role)) {
        const result = await Contract.getAllByOffice(officeId, { page, pageSize });
        return res.json({
          success: true,
          data: result.contracts,
          total: result.total,
          page,
          page_size: pageSize
        });
      }

      // ACL: call-center роли не имеют доступа к договорам
      if (["cc_operator", "cc_manager"].includes(user.role)) {
        return res.status(403).json({ success: false, message: "Нет доступа к договорам" });
      }

      let contracts = await Contract.getAllByOffice(officeId);

      // ACL: expert работает только с docs контрактами
      if (user.role === 'expert') {
        const visible=[]; for(const c of contracts||[]) if((c.contract_type||'docs')==='docs' && await canAccessContract(user,c.id)) visible.push(c); contracts=visible;
      }

      // ACL: представитель видит только свои договоры (где он назначен представителем)
      if (user.role === 'representative') {
        contracts = (contracts || []).filter(c => Number(c.representative_id) === Number(user.id));
      }
      if (user.role === 'lawyer') { const visible=[]; for(const c of contracts||[]) if(await canAccessContract(user,c.id)) visible.push(c); contracts=visible; }

      res.json({
        success: true,
        data: contracts
      });
    } catch (error) {
      console.error('Error getting contracts:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении договоров'
      });
    }
  },

  /**
   * Получить договор по ID
   */
  async getContractById(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const contract = await Contract.getById(id);
      
      if (!contract) {
        return res.status(404).json({
          success: false,
          message: 'Договор не найден'
        });
      }

      const allowedView = await canAccessContract(user, contract.id);
      if (!allowedView) {
        return res.status(403).json({
          success: false,
          message: 'Доступ запрещен'
        });
      }

      res.json({
        success: true,
        data: contract
      });
    } catch (error) {
      console.error('Error getting contract:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении договора'
      });
    }
  },

  /**
   * Генерация номера договора DDMMYYXX
   */
  async generateNumber(req, res) {
    try {
      const user = req.user;
      const { contract_date } = req.query;
      const officeId = req.query.office_id || user.office_id || (await ensureUserOffice(user));
      if (!contract_date) {
        return res.status(400).json({ success: false, message: 'Укажите contract_date' });
      }
      const number = await Contract.generateContractNumber(officeId, contract_date);
      res.json({ success: true, data: { contract_number: number } });
    } catch (error) {
      console.error('Error generating contract number:', error);
      res.status(500).json({ success: false, message: 'Ошибка генерации номера' });
    }
  },

  /**
   * Создать новый договор
   */
  async createContract(req, res) {
    try {
      const user = req.user;
      const contractData = req.body;

      console.log('Creating contract with data:', JSON.stringify(contractData, null, 2));
      console.log('User office_id:', user.office_id, 'role:', user.role);

      const contractAmount = Number(contractData.amount);
      const allowedPaymentMethods = new Set(['cash', 'noncash', 'bank', 'sbp']);
      if (contractData.payments !== undefined) {
        if (!Array.isArray(contractData.payments)) {
          return res.status(400).json({
            success: false,
            message: 'Некорректный формат списка платежей.',
          });
        }

        if (contractData.payments.length === 0) {
          return res.status(400).json({ success:false, message:'Договор заключается только после подтверждённой оплаты больше 0.' });
        }
        const payments = [];
        for (const payment of contractData.payments) {
          const paymentAmount = Number(payment?.amount);
          if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
            return res.status(400).json({
              success: false,
              message: 'Сумма каждого платежа должна быть больше 0.',
            });
          }
          if (!allowedPaymentMethods.has(payment?.payment_method)) {
            return res.status(400).json({
              success: false,
              message: 'Выберите корректный способ оплаты.',
            });
          }
          payments.push({
            amount: Math.round(paymentAmount * 100) / 100,
            payment_method: payment.payment_method,
            payment_date: payment.payment_date || contractData.contract_date,
            comment: payment.comment || null,
          });
        }

        const totalPaid = Math.round(
          payments.reduce((sum, payment) => sum + payment.amount, 0) * 100
        ) / 100;
        if (Number.isFinite(contractAmount) && totalPaid > contractAmount) {
          return res.status(400).json({
            success: false,
            message: 'Общая сумма платежей превышает сумму договора.',
          });
        }
        contractData.payments = payments;
        contractData.paid_amount = totalPaid;
        const methods = [...new Set(payments.map((payment) => payment.payment_method))];
        contractData.payment_method = methods.length > 1 ? 'mixed' : (methods[0] || 'cash');
      } else {
        const legacyPaid = Number(contractData.paid_amount ?? 0);
        if (!Number.isFinite(legacyPaid) || legacyPaid <= 0) return res.status(400).json({ success:false, message:'Договор заключается только после подтверждённой оплаты больше 0.' });
        if (Number.isFinite(contractAmount) && legacyPaid > contractAmount) {
          return res.status(400).json({
            success: false,
            message: 'Общая сумма платежей превышает сумму договора.',
          });
        }
      }

      // Если пользователь ещё не привязан к офису — создаём для него
      // персональный офис.
      await ensureUserOffice(user);

      // Для упрощённой формы админа: создаём клиента автоматически по ФИО
      if (contractData.admin_register && contractData.client_name) {
        const db = require('../db');
        const clientName = contractData.client_name.trim();
        const clientPhone = (contractData.client_phone || '').toString().trim() || null;

        // Если есть appointment_id и из него можно подтянуть телефон/тему — берём оттуда как fallback
        let apptPhone = null;
        let apptComment = null;
        if (contractData.appointment_id) {
          const [apptRows] = await db.query(
            'SELECT client_phone, comment FROM appointments WHERE id = ? AND office_id = ? LIMIT 1',
            [contractData.appointment_id, user.office_id]
          );
          if (apptRows.length > 0) {
            apptPhone = apptRows[0].client_phone || null;
            apptComment = apptRows[0].comment || null;
          }
        }
        const finalPhone = clientPhone || apptPhone || null;

        // Ищем существующего клиента
        const [existing] = await db.query(
          'SELECT id, phone FROM clients WHERE name = ? AND office_id = ? LIMIT 1',
          [clientName, user.office_id]
        );
        if (existing.length > 0) {
          contractData.id_client = existing[0].id;
          // Если у клиента нет телефона, а у нас есть — допишем
          if (!existing[0].phone && finalPhone) {
            await db.query(
              'UPDATE clients SET phone = ? WHERE id = ?',
              [finalPhone, existing[0].id]
            );
          }
        } else {
          const [result] = await db.query(
            'INSERT INTO clients (name, phone, office_id) VALUES (?, ?, ?)',
            [clientName, finalPhone, user.office_id]
          );
          contractData.id_client = result.insertId;
        }
        contractData.registered_by = user.id;

        // Если title не задан, подставляем тему консультации из appointment
        if ((!contractData.title || !contractData.title.trim()) && apptComment) {
          contractData.title = apptComment;
        }

        // Если указан signed_by - обновляем appointment с кто заключил
        if (contractData.signed_by && contractData.appointment_id) {
          await db.query(
            'UPDATE appointments SET consultation_result = ?, contract_signed_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND office_id = ?',
            ['contract_signed', contractData.signed_by, contractData.appointment_id, user.office_id]
          );
        }
      }

      // Валидация
      if (!contractData.id_employee || !contractData.id_client || !contractData.amount) {
        return res.status(400).json({
          success: false,
          message: 'Необходимо указать сотрудника, клиента и сумму',
          details: {
            id_employee: !!contractData.id_employee,
            id_client: !!contractData.id_client,
            amount: !!contractData.amount
          }
        });
      }

      const linkedLawyer = await userForEmployee(contractData.id_employee);
      if (!linkedLawyer || linkedLawyer.role !== 'lawyer') {
        return res.status(400).json({ success:false, message:'Выбранный исполнитель не связан с активным пользователем роли «Юрист».' });
      }
      if (Number(contractData.paid_amount) < Number(contractData.amount)) {
        const remainder = Math.round((Number(contractData.amount)-Number(contractData.paid_amount))*100)/100;
        if (!contractData.additional_payment_date) return res.status(400).json({success:false,message:'При частичной оплате укажите дату доплаты.'});
        contractData.additional_payment_amount = remainder;
      } else {
        contractData.additional_payment_date = null; contractData.additional_payment_amount = null;
      }

      // Привязываем договор к офису текущего пользователя
      contractData.office_id = user.office_id;

      const contract = await Contract.create(contractData);

      // Real-time: уведомить офис о новом договоре
      socketEmitter.emitContractNew(user.office_id, contract);

      res.status(201).json({
        success: true,
        message: 'Договор зарегистрирован',
        data: contract
      });
    } catch (error) {
      console.error('Error creating contract:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при создании договора'
      });
    }
  },

  /**
   * Обновить договор
   */
  async updateContract(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      // Представитель не может редактировать договор
      if (user.role === 'representative') {
        return res.status(403).json({ success: false, message: 'Представитель не может редактировать договор' });
      }
      const contractData = req.body;

      // Проверяем существование и доступ
      const existingContract = await Contract.getById(id);
      
      if (!existingContract) {
        return res.status(404).json({
          success: false,
          message: 'Договор не найден'
        });
      }

      const allowedUpd = await checkOfficeAccess(user, existingContract.office_id);
      if (!allowedUpd) {
        return res.status(403).json({
          success: false,
          message: 'Доступ запрещен'
        });
      }

      // Состав юристов (совместный договор) могут менять только
      // ГенДиректор, Менеджер, ОКК. Остальные (в т.ч. администратор)
      // не могут изменить состав после регистрации.
      const COMPOSITION_ROLES = ['director', 'manager', 'okk'];
      const wantsCompositionChange = (contractData.is_joint !== undefined
        || contractData.second_employee_id !== undefined);
      if (wantsCompositionChange && !COMPOSITION_ROLES.includes(user.role)) {
        // Запрещено менять состав — убираем эти поля, остальные правки применяем.
        delete contractData.is_joint;
        delete contractData.second_employee_id;
      }

      const actorName = [user.last_name, user.first_name].filter(Boolean).join(' ') || null;
      const contract = await Contract.update(id, contractData, { id: user.id, name: actorName });
      
      res.json({
        success: true,
        message: 'Договор обновлен успешно',
        data: contract
      });
    } catch (error) {
      console.error('Error updating contract:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при обновлении договора'
      });
    }
  },

  /**
   * Получить историю изменений договора
   */
  async getContractHistory(req, res) {
    try {
      const { id } = req.params;
      const existing = await Contract.getById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Договор не найден' });
      }
      const allowed = await checkOfficeAccess(req.user, existing.office_id);
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'Доступ запрещён' });
      }
      const history = await Contract.getHistory(id);
      res.json({ success: true, data: history });
    } catch (error) {
      console.error('Error getting contract history:', error);
      res.status(500).json({ success: false, message: 'Ошибка получения истории договора' });
    }
  },

  /**
   * Удалить договор
   */
  async deleteContract(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      // Проверяем существование и доступ
      const contract = await Contract.getById(id);
      
      if (!contract) {
        return res.status(404).json({
          success: false,
          message: 'Договор не найден'
        });
      }

      const allowedDel = await checkOfficeAccess(user, contract.office_id);
      if (!allowedDel) {
        return res.status(403).json({
          success: false,
          message: 'Доступ запрещен'
        });
      }

      // Удаляем связанные записи из кассы
      const db = require('../db');
      await db.query('DELETE FROM cash_register WHERE contract_number = ?', [contract.contract_number]);

      await Contract.delete(id);
      
      res.json({
        success: true,
        message: 'Договор удален успешно'
      });
    } catch (error) {
      console.error('Error deleting contract:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при удалении договора'
      });
    }
  },

  /**
   * Расторгнуть договор
   */
  async terminateContract(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      const { terminated_at, termination_reason, refund_amount, refund_deadline } = req.body;

      if (!TERMINATE_ROLES.includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Расторгнуть договор может только директор, менеджер или ОКК' });
      }

      const existingContract = await Contract.getById(id);
      if (!existingContract) {
        return res.status(404).json({ success: false, message: 'Договор не найден' });
      }
      const allowedTerm = await checkOfficeAccess(user, existingContract.office_id);
      if (!allowedTerm) {
        return res.status(403).json({ success: false, message: 'Доступ запрещен' });
      }
      if (!terminated_at) {
        return res.status(400).json({ success: false, message: 'Укажите дату расторжения' });
      }

      const contract = await Contract.terminate(id, {
        terminated_at,
        termination_reason,
        refund_amount: refund_amount || 0,
        refund_deadline,
      });

      res.json({ success: true, message: 'Договор расторгнут', data: contract });
    } catch (error) {
      console.error('Error terminating contract:', error);
      res.status(500).json({ success: false, message: error.message || 'Ошибка при расторжении договора' });
    }
  },

  /**
   * Подтвердить возврат денег (только директор, менеджер, ОКК)
   */
  async confirmRefund(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      if (!REFUND_CONFIRM_ROLES.includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Только директор, менеджер или ОКК могут подтвердить возврат' });
      }

      const existingContract = await Contract.getById(id);
      if (!existingContract) {
        return res.status(404).json({ success: false, message: 'Договор не найден' });
      }
      const allowedRefund = await checkOfficeAccess(user, existingContract.office_id);
      if (!allowedRefund) {
        return res.status(403).json({ success: false, message: 'Доступ запрещен' });
      }

      const contract = await Contract.confirmRefund(id, user.id);

      // Автоматически создаем расход «Возвраты»
      const refundAmt = parseFloat(contract.refund_amount || existingContract.refund_amount || 0);
      if (refundAmt > 0) {
        createAutoExpense({
          office_id: existingContract.office_id,
          category: 'Возвраты',
          title: 'Возврат: ' + (existingContract.client_name || 'Клиент') + ' (Договор ' + (existingContract.contract_number || id) + ')',
          amount: refundAmt,
          description: 'Автоматический расход при подтверждении возврата',
          spent_on: new Date().toISOString().slice(0, 10),
          source_type: 'refund',
          source_id: Number(id),
          created_by: user.id,
        }).catch(err => console.error('Auto expense for refund failed:', err));
      }

      res.json({ success: true, message: 'Возврат подтверждён, касса обновлена', data: contract });
    } catch (error) {
      console.error('Error confirming refund:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        code: error.code || 'REFUND_CONFIRM_FAILED',
        message: error.message || 'Ошибка при подтверждении возврата'
      });
    }
  },

  /**
   * Подтвердить оплату остатка (только admin)
   */
  async confirmRemainder(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      if (user.role !== 'admin' && user.role !== 'administrator') {
        return res.status(403).json({ success: false, message: 'Только администратор может подтвердить оплату остатка' });
      }

      const existingContract = await Contract.getById(id);
      if (!existingContract) {
        return res.status(404).json({ success: false, message: 'Договор не найден' });
      }
      const allowed = await checkOfficeAccess(user, existingContract.office_id);
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'Доступ запрещен' });
      }

      const contract = await Contract.confirmRemainder(id, user.id);
      res.json({ success: true, message: 'Оплата остатка подтверждена', data: contract });
    } catch (error) {
      console.error('Error confirming remainder:', error);
      res.status(500).json({ success: false, message: error.message || 'Ошибка при подтверждении оплаты остатка' });
    }
  },

  /**
   * Получить расторгнутые договоры
   */
  async getTerminatedContracts(req, res) {
    try {
      const user = req.user;
      let officeId = req.query.office_id || user.office_id;
      if (!officeId) {
        officeId = await ensureUserOffice(user);
      }
      if (officeId) {
        const allowedTermList = await checkOfficeAccess(user, officeId);
        if (!allowedTermList) {
          return res.status(403).json({ success: false, message: 'Доступ запрещен' });
        }
      }

      const contracts = await Contract.getTerminatedByOffice(officeId);
      res.json({ success: true, data: contracts });
    } catch (error) {
      console.error('Error getting terminated contracts:', error);
      res.status(500).json({ success: false, message: 'Ошибка при получении расторгнутых договоров' });
    }
  },

  /**
   * Получить статистику по договорам
   */
  async getContractStats(req, res) {
    try {
      const user = req.user;
      const { period = 'month' } = req.query;

      const officeId = await ensureUserOffice(user);

      const stats = await Contract.getStatsByOffice(officeId, period);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting contract stats:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении статистики'
      });
    }
  },

  /**
   * Обновить данные расторжения (директор/менеджер/ОКК)
   */
  async updateTerminationData(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      const ALLOWED_ROLES = ['director', 'manager', 'okk'];

      if (!ALLOWED_ROLES.includes(String(user.role || '').toLowerCase())) {
        return res.status(403).json({ success: false, message: 'Только директор, менеджер или ОКК может редактировать данные расторжения' });
      }

      const contract = await Contract.getById(id);
      if (!contract) {
        return res.status(404).json({ success: false, message: 'Договор не найден' });
      }
      if (contract.status !== 'terminated') {
        return res.status(400).json({ success: false, message: 'Договор не расторгнут' });
      }

      const allowed = await checkOfficeAccess(user, contract.office_id);
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'Доступ запрещен' });
      }

      const { terminated_at, termination_reason, refund_amount, refund_deadline } = req.body;
      const db = require('../db');

      const sets = [];
      const params = [];

      if (terminated_at !== undefined) {
        sets.push('terminated_at = ?');
        params.push(terminated_at);
      }
      if (termination_reason !== undefined) {
        sets.push('termination_reason = ?');
        params.push(termination_reason || null);
      }
      if (refund_amount !== undefined) {
        sets.push('refund_amount = ?');
        params.push(refund_amount || 0);
      }
      if (refund_deadline !== undefined) {
        sets.push('refund_deadline = ?');
        params.push(refund_deadline || null);
      }

      if (sets.length === 0) {
        return res.status(400).json({ success: false, message: 'Нет данных для обновления' });
      }

      params.push(id);
      await db.query(
        `UPDATE contracts SET ${sets.join(', ')} WHERE id = ?`,
        params
      );

      res.json({ success: true, message: 'Данные расторжения обновлены' });
    } catch (error) {
      console.error('Error updating termination data:', error);
      res.status(500).json({ success: false, message: 'Ошибка при обновлении данных расторжения' });
    }
  },
};

module.exports = contractController;
