const Contract = require('../models/contract');
const { ensureUserOffice } = require('../utils/ensureOffice');

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

      // Проверяем доступ пользователя к офису
      if (user.office_id && user.office_id != officeId) {
        return res.status(403).json({
          success: false,
          message: 'Доступ запрещен'
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

      // Проверяем доступ
      if (contract.office_id !== user.office_id) {
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
   * Создать новый договор
   */
  async createContract(req, res) {
    try {
      const user = req.user;
      const contractData = req.body;

      console.log('📝 Creating contract with data:', JSON.stringify(contractData, null, 2));
      console.log('👤 User office_id:', user.office_id);

      // Если пользователь ещё не привязан к офису — создаём для него
      // персональный офис.
      await ensureUserOffice(user);

      // Валидация
      if (!contractData.id_employee || !contractData.id_client || !contractData.amount) {
        console.log('❌ Validation failed:', {
          id_employee: contractData.id_employee,
          id_client: contractData.id_client,
          amount: contractData.amount
        });
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
      
      res.status(201).json({
        success: true,
        message: 'Договор создан успешно',
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

      if (existingContract.office_id !== user.office_id) {
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

      if (contract.office_id !== user.office_id) {
        return res.status(403).json({
          success: false,
          message: 'Доступ запрещен'
        });
      }

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
