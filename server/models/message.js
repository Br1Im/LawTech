const db = require('../db');

/**
 * Модель для работы с сообщениями чата
 */
class Message {
  /**
   * Получить все сообщения для указанного офиса
   * @param {string} officeId - ID офиса
   * @returns {Promise<Array>} - Массив сообщений
   */
  static async getByOfficeId(officeId) {
    try {
      const query = `
        SELECT * FROM messages 
        WHERE office_id = ? 
        ORDER BY created_at ASC
      `;
      const [messages] = await db.query(query, [officeId]);
      return messages;
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  /**
   * Создать новое сообщение
   * @param {Object} message - Объект сообщения
   * @param {string} message.text - Текст сообщения
   * @param {string} message.sender - Имя отправителя
   * @param {string} message.office_id - ID офиса
   * @param {number} message.user_id - ID пользователя, отправившего сообщение
   * @returns {Promise<Object>} - Созданное сообщение
   */
  static async create(message) {
    try {
      const { text, sender, office_id, user_id } = message;
      const query = `
        INSERT INTO messages (text, sender, office_id, user_id, is_read, created_at) 
        VALUES (?, ?, ?, ?, 0, NOW())
      `;
      const [result] = await db.query(query, [text, sender, office_id, user_id]);
      
      const newMessage = {
        id: result.insertId,
        text,
        sender,
        office_id,
        user_id,
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
   * @returns {Promise<boolean>} - Результат операции
   */
  static async markAsRead(id) {
    try {
      const query = `
        UPDATE messages 
        SET is_read = 1 
        WHERE id = ?
      `;
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
   * @returns {Promise<boolean>} - Результат операции
   */
  static async delete(id) {
    try {
      const query = `
        DELETE FROM messages 
        WHERE id = ?
      `;
      await db.query(query, [id]);
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
}

module.exports = Message; 