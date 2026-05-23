const Contract = require('../models/contract');
const { ensureUserOffice, checkOfficeAccess, getUserOfficeIds } = require('../utils/ensureOffice');
const { REFUND_CONFIRM_ROLES } = require('../constants');
const TERMINATE_ROLES = ['director', 'manager', 'okk'];
const socketEmitter = require('../middleware/socketEmitter');
const { createAutoExpense } = require('./expensesController');

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
      // Если у пользователя офиса нет — создаём персональный.
      let officeId = req.params.officeId || req.query.office_id || user.office_id;
      if (!officeId) {
        officeId = await ensureUserOffice(user);
      }

      if (!officeId) {
        return res.status(403).json({
          success: false,
          message: 'Пользователь не привязан к офису'
        });
      }

      const allowed = await checkOfficeAccess(user, officeId);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: 'Доступ запрещен'
        });
      }

      const page = parseInt(req.query.page, 10);
      const pageSize = Math.min(parseInt(req.query.page_size, 10) || 50, 200);

      if (page > 0) {
        const result = await Contract.getAllByOffice(officeId, { page, pageSize });
        return res.json({
          success: true,
          data: result.contracts,
          total: result.total,
          page,
          page_size: pageSize
        });
      }

      const contracts = await Contract.getAllByOffice(officeId);
      
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

      const allowedView = await checkOfficeAccess(user, contract.office_id);
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

      const contract = await Contract.update(id, contractData);
      
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
      await db.query('DELETE FROM cash_register WHERE contract_id = ?', [id]);

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
      res.status(500).json({ success: false, message: error.message || 'Ошибка при подтверждении возврата' });
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
  }
};

module.exports = contractController;
