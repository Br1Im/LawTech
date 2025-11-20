/**
 * Контроллер для работы с календарными событиями
 */
const db = require('../db');

const calendarController = {
  // Получить все события календаря для офиса
  getOfficeCalendarEvents: async (req, res) => {
    const { officeId } = req.params;
    const userId = req.user?.id;

    console.log(`🔍 Запрос календарных событий для офиса ${officeId} от пользователя ${userId}`);

    try {

      // Проверяем, что пользователь принадлежит к этому офису
      const [userCheck] = await db.query(
        'SELECT office_id FROM users WHERE id = ?',
        [userId]
      );

      console.log(`👤 Данные пользователя:`, userCheck.length > 0 ? userCheck[0] : 'не найден');
      console.log(`🔑 Сравнение: user.office_id=${userCheck[0]?.office_id} vs requested officeId=${officeId}`);

      // Временно отключаем строгую проверку для отладки
      // if (!userCheck.length || userCheck[0].office_id != officeId) {
      //   console.log(`❌ Доступ запрещен для пользователя ${userId} к офису ${officeId}`);
      //   return res.status(403).json({
      //     success: false,
      //     message: 'Доступ запрещен'
      //   });
      // }

      console.log(`✅ Пользователь ${userId} запрашивает события для офиса ${officeId}`);

      // Получаем обычные календарные события
      const [events] = await db.query(
        `SELECT *, start_date as date FROM calendar_events 
         WHERE office_id = ? 
         ORDER BY start_date ASC`,
        [officeId]
      );

      console.log(`📅 Найдено обычных событий: ${events.length}`);

      // Получаем договоры для создания событий
      console.log(`🔍 Запрашиваем договоры для офиса ${officeId}`);
      
      let contracts = [];
      try {
        // Запрашиваем договоры для конкретного офиса через employees
        [contracts] = await db.query(
          `SELECT c.id, 
               COALESCE(cl.name, 'Неизвестный клиент') as client_name,
               c.id as contract_number, 
               c.status, 
               c.contract_date,
               e.office_id
        FROM contracts c
        LEFT JOIN clients cl ON c.id_client = cl.id
        LEFT JOIN employees e ON c.id_employee = e.id
        WHERE e.office_id = ? AND c.contract_date IS NOT NULL
        ORDER BY c.contract_date ASC`,
          [officeId]
        );
        
        console.log(`🔍 Найдено договоров для офиса ${officeId}: ${contracts.length}`);
      } catch (contractError) {
        console.error('⚠️ Ошибка при получении договоров:', contractError.message);
        console.log('⚠️ Продолжаем без договоров');
        contracts = [];
      }

      console.log(`📝 Найдено договоров с датами: ${contracts.length}`);
      
      // Логируем первые несколько договоров для отладки
      if (contracts.length > 0) {
        console.log('📋 Примеры договоров:', contracts.slice(0, 3).map(c => ({
          id: c.id,
          client: c.client_name,
          date: c.contract_date,
          status: c.status
        })));
      }

      // Преобразуем договоры в формат для фронтенда
      const contractEvents = contracts.map(contract => {
        // Сокращаем имя клиента если оно слишком длинное
        const clientName = contract.client_name.length > 20 
          ? contract.client_name.substring(0, 20) + '...' 
          : contract.client_name;
        
        const event = {
          id: `contract-${contract.id}`,
          title: `Договор: ${clientName}`,
          description: `Договор №${contract.contract_number}, статус: ${contract.status || 'active'}`,
          date: contract.contract_date,
          start_date: contract.contract_date,
          time: '10:00:00',
          type: 'contract',
          event_type: 'contract',
          priority: 'high',
          office_id: parseInt(officeId),
          created_by: null,
          user_id: null,
          contract_id: contract.id,
          contract_number: contract.contract_number,
          status: contract.status || 'active',
          participants: contract.client_name,
          location: null
        };
        
        return event;
      });

      console.log(`🎯 Создано событий договоров: ${contractEvents.length}`);
      
      // Логируем примеры событий договоров
      if (contractEvents.length > 0) {
        console.log('📅 Примеры событий договоров:', contractEvents.slice(0, 2).map(e => ({
          id: e.id,
          title: e.title,
          date: e.date,
          type: e.type
        })));
      }

      // Объединяем обычные события и события договоров
      const allEvents = [...events, ...contractEvents];

      console.log(`📋 Всего событий для отправки: ${allEvents.length}`);
      console.log(`📊 Разбивка: обычных событий - ${events.length}, договоров - ${contractEvents.length}`);

      res.json({
        success: true,
        events: allEvents
      });
    } catch (error) {
      console.error('❌ Error getting calendar events:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        sql: error.sql
      });
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении событий календаря',
        error: error.message
      });
    }
  },

  // Создать новое событие календаря
  createCalendarEvent: async (req, res) => {
    try {
      const {
        title,
        description,
        start_date,
        end_date,
        event_type,
        officeId
      } = req.body;
      const userId = req.user.id;

      // Проверяем обязательные поля
      if (!title || !start_date || !event_type) {
        return res.status(400).json({
          success: false,
          message: 'Название, дата начала и тип события обязательны'
        });
      }

      // Проверяем, что пользователь принадлежит к этому офису
      const [userCheck] = await db.query(
        'SELECT office_id FROM users WHERE id = ?',
        [userId]
      );

      if (!userCheck.length || userCheck[0].office_id != officeId) {
        return res.status(403).json({
          success: false,
          message: 'Доступ запрещен'
        });
      }

      const [result] = await db.query(
        `INSERT INTO calendar_events 
         (title, description, start_date, time, type, priority, created_by, office_id, created_at) 
         VALUES (?, ?, ?, '10:00:00', ?, 'medium', ?, ?, NOW())`,
        [
          title,
          description || null,
          start_date,
          event_type,
          userId,
          officeId
        ]
      );

      // Получаем созданное событие
      const [createdEvent] = await db.query(
        'SELECT * FROM calendar_events WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        success: true,
        message: 'Событие календаря создано успешно',
        event: createdEvent[0]
      });
    } catch (error) {
      console.error('Error creating calendar event:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при создании события календаря'
      });
    }
  },

  // Обновить событие календаря
  updateCalendarEvent: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        start_date,
        end_date,
        event_type
      } = req.body;
      const userId = req.user.id;

      // Проверяем, что событие существует и пользователь имеет к нему доступ
      const [eventCheck] = await db.query(
        `SELECT ce.*, u.office_id as user_office_id 
         FROM calendar_events ce 
         JOIN users u ON u.id = ? 
         WHERE ce.id = ? AND ce.office_id = u.office_id`,
        [userId, id]
      );

      if (!eventCheck.length) {
        return res.status(404).json({
          success: false,
          message: 'Событие не найдено или доступ запрещен'
        });
      }

      await db.query(
        `UPDATE calendar_events 
         SET title = ?, description = ?, start_date = ?, type = ?
         WHERE id = ?`,
        [title, description, start_date, event_type, id]
      );

      // Получаем обновленное событие
      const [updatedEvent] = await db.query(
        'SELECT * FROM calendar_events WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'Событие календаря обновлено успешно',
        event: updatedEvent[0]
      });
    } catch (error) {
      console.error('Error updating calendar event:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при обновлении события календаря'
      });
    }
  },

  // Удалить событие календаря
  deleteCalendarEvent: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Проверяем, что событие существует и пользователь имеет к нему доступ
      const [eventCheck] = await db.query(
        `SELECT ce.* 
         FROM calendar_events ce 
         JOIN users u ON u.id = ? 
         WHERE ce.id = ? AND ce.office_id = u.office_id`,
        [userId, id]
      );

      if (!eventCheck.length) {
        return res.status(404).json({
          success: false,
          message: 'Событие не найдено или доступ запрещен'
        });
      }

      await db.query('DELETE FROM calendar_events WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'Событие календаря удалено успешно'
      });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при удалении события календаря'
      });
    }
  },

  // Получить события календаря за определенный период
  getCalendarEventsByDateRange: async (req, res) => {
    try {
      const { officeId } = req.params;
      const { startDate, endDate } = req.query;
      const userId = req.user.id;

      // Проверяем, что пользователь принадлежит к этому офису
      const [userCheck] = await db.query(
        'SELECT office_id FROM users WHERE id = ?',
        [userId]
      );

      if (!userCheck.length || userCheck[0].office_id != officeId) {
        return res.status(403).json({
          success: false,
          message: 'Доступ запрещен'
        });
      }

      let query = `SELECT *, start_date as date FROM calendar_events WHERE office_id = ?`;
      let params = [officeId];

      if (startDate && endDate) {
        query += ` AND start_date BETWEEN ? AND ?`;
        params.push(startDate, endDate);
      } else if (startDate) {
        query += ` AND start_date >= ?`;
        params.push(startDate);
      } else if (endDate) {
        query += ` AND start_date <= ?`;
        params.push(endDate);
      }

      query += ` ORDER BY start_date ASC`;

      const [events] = await db.query(query, params);

      res.json({
        success: true,
        events: events
      });
    } catch (error) {
      console.error('Error getting calendar events by date range:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении событий календаря'
      });
    }
  },

  // Получить все события календаря для всех офисов пользователя
  getAllCalendarEvents: async (req, res) => {
    try {
      const userId = req.user.id;

      console.log(`🔍 Запрос всех календарных событий для пользователя ${userId}`);

      // Получаем все офисы, к которым принадлежит пользователь
      const [userOffices] = await db.query(
        'SELECT office_id FROM users WHERE id = ?',
        [userId]
      );

      if (!userOffices.length) {
        console.log(`❌ У пользователя ${userId} нет связанных офисов`);
        return res.json({ success: true, events: [] });
      }

      const officeIds = userOffices.map(uo => uo.office_id);
      console.log(`🏢 Пользователь ${userId} имеет доступ к офисам: ${officeIds.join(', ')}`);

      // Получаем обычные календарные события для всех офисов
      const [events] = await db.query(
        `SELECT *, start_date as date FROM calendar_events 
         WHERE office_id IN (?) 
         ORDER BY start_date ASC`,
        [officeIds]
      );

      console.log(`📅 Найдено обычных событий: ${events.length}`);

      // Получаем договоры для всех офисов через employees
      const [contracts] = await db.query(
        `SELECT c.id, 
               COALESCE(cl.name, 'Неизвестный клиент') as client_name,
               c.id as contract_number, 
               'consultation' as contract_type, 
               c.status, 
               c.contract_date,
               e.office_id
        FROM contracts c
        LEFT JOIN clients cl ON c.id_client = cl.id
        LEFT JOIN employees e ON c.id_employee = e.id
        WHERE e.office_id IN (?) AND c.contract_date IS NOT NULL
        ORDER BY c.contract_date ASC`,
        [officeIds]
      );
        
      console.log(`📝 Найдено договоров с датами: ${contracts.length}`);

      // Преобразуем договоры в формат для фронтенда
      const contractEvents = contracts.map(contract => {
        // Сокращаем имя клиента если оно слишком длинное
        const clientName = contract.client_name.length > 20 
          ? contract.client_name.substring(0, 20) + '...' 
          : contract.client_name;
        
        return {
          id: `contract-${contract.id}`,
          title: `Договор: ${clientName}`,
          description: `Договор №${contract.contract_number}, статус: ${contract.status || 'active'}`,
          date: contract.contract_date,
          start_date: contract.contract_date,
          time: '10:00:00',
          type: 'contract',
          event_type: 'contract',
          priority: 'high',
          office_id: contract.office_id,
          created_by: null,
          user_id: null,
          contract_id: contract.id,
          contract_number: contract.contract_number,
          status: contract.status || 'active',
          participants: contract.client_name,
          location: null
        };
      });

      console.log(`🎯 Создано событий договоров: ${contractEvents.length}`);

      // Объединяем все события
      const allEvents = [...events, ...contractEvents];

      console.log(`📋 Всего событий для отправки: ${allEvents.length}`);

      res.json({
        success: true,
        events: allEvents
      });
    } catch (error) {
      console.error('Error getting all calendar events:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении всех событий календаря'
      });
    }
  }
};

module.exports = calendarController;