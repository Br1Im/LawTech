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

      const [events] = await db.query(
        `SELECT * FROM calendar_events 
         WHERE office_id = ? 
         ORDER BY date ASC, time ASC`,
        [officeId]
      );

      res.json({
        success: true,
        events: events
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
        date,
        time,
        type,
        priority,
        participants,
        location,
        officeId
      } = req.body;
      const userId = req.user.id;

      // Проверяем обязательные поля
      if (!title || !date || !time || !type || !priority) {
        return res.status(400).json({
          success: false,
          message: 'Название, дата, время, тип и приоритет обязательны'
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
         (title, description, date, time, type, priority, participants, location, created_by, office_id, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          title,
          description || null,
          date,
          time,
          type,
          priority,
          participants || null,
          location || null,
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
        date,
        time,
        type,
        priority,
        participants,
        location
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
         SET title = ?, description = ?, date = ?, time = ?, type = ?, 
             priority = ?, participants = ?, location = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [title, description, date, time, type, priority, participants, location, id]
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
        query += ` AND date BETWEEN ? AND ?`;
        params.push(startDate, endDate);
      } else if (startDate) {
        query += ` AND date >= ?`;
        params.push(startDate);
      } else if (endDate) {
        query += ` AND date <= ?`;
        params.push(endDate);
      }

      query += ` ORDER BY date ASC, time ASC`;

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