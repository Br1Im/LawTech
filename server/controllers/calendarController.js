/**
 * Контроллер для работы с календарными событиями
 */
const db = require('../db');

const calendarController = {
  // Получить все события календаря для офиса
  getOfficeCalendarEvents: async (req, res) => {
    try {
      const { officeId } = req.params;
      const userId = req.user.id;

      console.log(`🔍 Запрос календарных событий для офиса ${officeId} от пользователя ${userId}`);

      // Проверяем, что пользователь принадлежит к этому офису
      const [userCheck] = await db.query(
        'SELECT office_id FROM users WHERE id = ?',
        [userId]
      );

      if (!userCheck.length || userCheck[0].office_id != officeId) {
        console.log(`❌ Доступ запрещен для пользователя ${userId} к офису ${officeId}`);
        return res.status(403).json({
          success: false,
          message: 'Доступ запрещен'
        });
      }

      console.log(`✅ Пользователь ${userId} имеет доступ к офису ${officeId}`);

      // Получаем обычные календарные события
      const [events] = await db.query(
        `SELECT * FROM calendar_events 
         WHERE office_id = ? 
         ORDER BY start_date ASC`,
        [officeId]
      );

      console.log(`📅 Найдено обычных событий: ${events.length}`);

      // Получаем договоры для создания событий
      console.log(`🔍 Запрашиваем договоры для офиса ${officeId}`);
      
      // Проверяем наличие таблицы contracts
      const [tables] = await db.query(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='contracts'`
      );
      
      console.log(`📊 Таблица contracts существует: ${tables.length > 0}`);
      
      // Если таблица существует, запрашиваем договоры
      let contracts = [];
      if (tables.length > 0) {
        // Запрашиваем договоры для конкретного офиса - используем текстовое сравнение для SQLite
        [contracts] = await db.query(
          `SELECT c.id, 
               COALESCE(cl.first_name || ' ' || cl.last_name, cl.company, 'Неизвестный клиент') as client_name,
               c.title as contract_number, 
               'consultation' as contract_type, 
               c.status, 
               c.start_date as contract_date
        FROM contracts c
        LEFT JOIN clients cl ON c.client_id = cl.id
        WHERE c.office_id = ? AND c.start_date IS NOT NULL
        ORDER BY c.start_date ASC`,
          [officeId]
        );
        
        console.log(`🔍 Найдено договоров для офиса ${officeId}: ${contracts.length}`);
      }

      console.log(`📝 Найдено договоров с датами: ${contracts.length}`);

      // Преобразуем договоры в формат для фронтенда
      const contractEvents = contracts.map(contract => {
        // Используем дату договора как start_date
        const startDate = contract.contract_date;
        
        return {
          id: `contract-${contract.id}`,
          title: `${contract.contract_type}: ${contract.client_name}`,
          description: `Договор №${contract.contract_number}, статус: ${contract.status}`,
          start_date: startDate,
          end_date: null,
          event_type: 'contract',
          office_id: parseInt(officeId),
          user_id: null,
          contract_id: contract.id,
          contract_number: contract.contract_number,
          status: contract.status
        };
      });

      console.log(`🎯 Создано событий договоров: ${contractEvents.length}`);

      // Объединяем обычные события и события договоров
      const allEvents = [...events, ...contractEvents];

      console.log(`📋 Всего событий для отправки: ${allEvents.length}`);

      res.json({
        success: true,
        events: allEvents
      });
    } catch (error) {
      console.error('Error getting calendar events:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении событий календаря'
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
         (title, description, start_date, end_date, event_type, user_id, office_id, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          title,
          description || null,
          start_date,
          end_date || null,
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
         SET title = ?, description = ?, start_date = ?, end_date = ?, event_type = ?
         WHERE id = ?`,
        [title, description, start_date, end_date, event_type, id]
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

      let query = `SELECT * FROM calendar_events WHERE office_id = ?`;
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
  }
};

module.exports = calendarController;