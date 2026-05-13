const db = require('../db');

/**
 * Модель для работы с сообщениями чата
 * Схема таблицы messages:
 *   id, office_id, channel, sender_id, content, is_read, created_at
 * 
 * Каналы (channel):
 *   'reception'    — чат Администратор + Менеджер + ОКК
 *   'call_center'  — чат Начальник КЦ + Менеджер + ОКК
 */
class Message {
  /**
   * Получить сообщения для офиса по каналу
   * @param {string} officeId - ID офиса
   * @param {string} channel - Канал чата ('reception' | 'call_center')
   * @returns {Promise<Array>}
   */
  static async getByOfficeAndChannel(officeId, channel = 'reception') {
    try {
      const query = `
        SELECT m.id, m.office_id, m.channel, m.sender_id, m.content, m.is_read, m.created_at,
               u.role AS user_role, u.first_name, u.last_name, u.email AS user_email
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.office_id = ? AND m.channel = ?
        ORDER BY m.created_at ASC
      `;
      const [messages] = await db.query(query, [officeId, channel]);
      return messages;
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  /**
   * Получить все сообщения для офиса (обратная совместимость)
   * @param {string} officeId - ID офиса
   * @returns {Promise<Array>}
   */
  static async getByOfficeId(officeId) {
    return this.getByOfficeAndChannel(officeId, 'reception');
  }

  /**
   * Создать новое сообщение
   * @param {Object} message - Объект сообщения
   * @param {string} message.content - Текст сообщения
   * @param {string} message.sender_name - Имя отправителя
   * @param {string} message.office_id - ID офиса
   * @param {number} message.sender_id - ID пользователя
   * @param {string} [message.channel='reception'] - Канал чата
   * @returns {Promise<Object>}
   */
  static async create(message) {
    try {
      const { content, sender_name, office_id, sender_id, channel = 'reception' } = message;
      const query = `
        INSERT INTO messages (content, office_id, channel, sender_id, is_read, created_at) 
        VALUES (?, ?, ?, ?, 0, NOW())
      `;
      const [result] = await db.query(query, [content, office_id, channel, sender_id]);
      
      const newMessage = {
        id: result.insertId,
        content,
        sender_name,
        office_id,
        channel,
        sender_id,
        is_read: 0,
        created_at: new Date()
      };
      
      return newMessage;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  /**
   * Пометить сообщение как прочитанное
   * @param {number} id - ID сообщения
   * @returns {Promise<boolean>}
   */
  static async markAsRead(id) {
    try {
      const query = `UPDATE messages SET is_read = 1 WHERE id = ?`;
      await db.query(query, [id]);
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  /**
   * Удалить сообщение
   * @param {number} id - ID сообщения
   * @returns {Promise<boolean>}
   */
  static async delete(id) {
    try {
      const query = `DELETE FROM messages WHERE id = ?`;
      await db.query(query, [id]);
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
}

module.exports = Message;
