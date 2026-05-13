const Client = require('../models/client');
const { ensureUserOffice, checkOfficeAccess } = require('../utils/ensureOffice');
const db = require('../db');

/**
 * Контроллер для работы с клиентами
 */
const clientController = {
  /**
   * Получить всех клиентов офиса
   */
  async getAllClients(req, res) {
    try {
      const user = req.user;

      const officeId = await ensureUserOffice(user);
      if (!officeId) {
        return res.json({ success: true, data: [] });
      }

      const clients = await Client.getAllByOffice(officeId);
      
      res.json({
        success: true,
        data: clients
      });
    } catch (error) {
      console.error('Error getting clients:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении клиентов'
      });
    }
  },

  /**
   * Получить клиента по ID
   */
  async getClientById(req, res) {
    try {
      const { id } = req.params;

      const client = await Client.getById(id);
      
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Клиент не найден'
        });
      }

      if (client.office_id) {
        const allowed = await checkOfficeAccess(req.user, client.office_id);
        if (!allowed) {
          return res.status(403).json({ success: false, message: 'Доступ запрещен' });
        }
      }

      res.json({
        success: true,
        data: client
      });
    } catch (error) {
      console.error('Error getting client:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении клиента'
      });
    }
  },

  /**
   * Создать нового клиента
   */
  async createClient(req, res) {
    try {
      const user = req.user;
      const clientData = req.body;

      console.log('📝 Creating client with data:', JSON.stringify(clientData, null, 2));
      console.log('👤 User office_id:', user.office_id);

      // Если пользователь ещё не привязан к офису — создаём для него
      // персональный офис, чтобы он мог сохранять клиентов и договоры.
      await ensureUserOffice(user);

      // Валидация - принимаем name, first_name или company
      if (!clientData.name && !clientData.first_name && !clientData.company) {
        return res.status(400).json({
          success: false,
          message: 'Необходимо указать имя или название компании'
        });
      }

      // Привязываем клиента к офису пользователя
      clientData.office_id = user.office_id;

      const client = await Client.create(clientData);
      
      console.log('✅ Client created successfully:', client);
      
      res.status(201).json({
        success: true,
        message: 'Клиент создан успешно',
        data: client
      });
    } catch (error) {
      console.error('❌ Error creating client:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при создании клиента',
        error: error.message
      });
    }
  },

  /**
   * Обновить клиента
   */
  async updateClient(req, res) {
    try {
      const { id } = req.params;
      const clientData = req.body;

      const existingClient = await Client.getById(id);
      
      if (!existingClient) {
        return res.status(404).json({
          success: false,
          message: 'Клиент не найден'
        });
      }

      if (existingClient.office_id) {
        const allowed = await checkOfficeAccess(req.user, existingClient.office_id);
        if (!allowed) {
          return res.status(403).json({ success: false, message: 'Доступ запрещен' });
        }
      }

      const client = await Client.update(id, clientData);
      
      res.json({
        success: true,
        message: 'Клиент обновлен успешно',
        data: client
      });
    } catch (error) {
      console.error('Error updating client:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при обновлении клиента'
      });
    }
  },

  /**
   * Удалить клиента
   */
  async deleteClient(req, res) {
    try {
      const { id } = req.params;

      const client = await Client.getById(id);
      
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Клиент не найден'
        });
      }

      if (client.office_id) {
        const allowed = await checkOfficeAccess(req.user, client.office_id);
        if (!allowed) {
          return res.status(403).json({ success: false, message: 'Доступ запрещен' });
        }
      }

      await Client.delete(id);
      
      res.json({
        success: true,
        message: 'Клиент удален успешно'
      });
    } catch (error) {
      console.error('Error deleting client:', error);
      
      if (error.message === 'Cannot delete client with active contracts') {
        return res.status(400).json({
          success: false,
          message: 'Невозможно удалить клиента с активными договорами'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Ошибка при удалении клиента'
      });
    }
  },

  /**
   * Поиск клиентов
   */
  async searchClients(req, res) {
    try {
      const user = req.user;
      const { q } = req.query;

      if (!user.office_id) {
        return res.status(403).json({
          success: false,
          message: 'Пользователь не привязан к офису'
        });
      }

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Необходимо указать поисковый запрос'
        });
      }

      const clients = await Client.search(user.office_id, q);
      
      res.json({
        success: true,
        data: clients
      });
    } catch (error) {
      console.error('Error searching clients:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при поиске клиентов'
      });
    }
  }
};

module.exports = clientController;
