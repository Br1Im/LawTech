const Client = require('../models/client');
const { canDelete } = require('../utils/deletePermissions');
const { ensureUserOffice, checkOfficeAccess, getUserOfficeIds } = require('../utils/ensureOffice');
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
      if (['cc_manager','cc_operator'].includes(String(user.role||'').toLowerCase())) return res.status(403).json({success:false,message:'Нет доступа к базе клиентов'});

      // Мульти-офис: получаем все доступные офисы
      const officeIds = await getUserOfficeIds(user);
      let officeId;
      if (officeIds.length === 0) {
        officeId = await ensureUserOffice(user);
        if (!officeId) return res.json({ success: true, data: [] });
      } else if (officeIds.length === 1) {
        officeId = officeIds[0];
      } else {
        officeId = officeIds; // массив для мульти-офиса
      }

      // Опциональная пагинация: ?page=1&page_size=50 (page_size capped at 200)
      const page = parseInt(req.query.page, 10);
      const pageSize = Math.min(parseInt(req.query.page_size, 10) || 50, 200);

      const viewerRole=String(user.role||'').toLowerCase();
      const fullAccess=['admin','administrator','owner','director','manager','okk'].includes(viewerRole);
      if (page > 0 && fullAccess) {
        const result = await Client.getAllByOffice(officeId, { page, pageSize });
        return res.json({
          success: true,
          data: result.items,
          total: result.total,
          page,
          page_size: pageSize,
        });
      }

      let clients = await Client.getAllByOffice(officeId);
      if (!fullAccess) {
        let sql = `SELECT DISTINCT c.id_client FROM contracts c LEFT JOIN contract_assignments ca ON ca.contract_id=c.id LEFT JOIN employees exp ON exp.id=c.expert_id WHERE `;
        const params=[];
        if (viewerRole==='representative') { sql += 'c.representative_id=?'; params.push(user.id); }
        else if (viewerRole==='expert') { sql += '(ca.user_id=? OR exp.user_id=?)'; params.push(user.id,user.id); }
        else { sql += 'ca.user_id=?'; params.push(user.id); }
        const [allowedClients]=await db.query(sql,params);
        const ids=new Set(allowedClients.map(row=>Number(row.id_client)));
        clients=(clients||[]).filter(client=>ids.has(Number(client.id)));
      }

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
      if (['cc_manager','cc_operator'].includes(String(req.user.role||'').toLowerCase())) return res.status(403).json({success:false,message:'Нет доступа к базе клиентов'});

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

      if (!canDelete('clients', req.user && req.user.role)) {
        return res.status(403).json({ success: false, message: 'Недостаточно прав для удаления клиента' });
      }

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

      await Client.delete(id, req.user && req.user.id);
      
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
