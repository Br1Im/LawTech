const db = require('../db');

/**
 * Модель для работы с личными сообщениями между пользователями
 */
class PrivateMessage {
  /**
   * Получить все сообщения между двумя пользователями
   * @param {number} userId1 - ID первого пользователя
   * @param {number} userId2 - ID второго пользователя
   * @returns {Promise<Array>} - Массив сообщений
   */
  static async getConversation(userId1, userId2) {
    try {
      const query = `
        SELECT * FROM private_messages 
        WHERE (sender_id = ? AND receiver_id = ?) 
           OR (sender_id = ? AND receiver_id = ?) 
        ORDER BY created_at ASC
      `;
      const [messages] = await db.query(query, [userId1, userId2, userId2, userId1]);
      return messages;
    } catch (error) {
      console.error('Error getting private messages:', error);
      throw error;
    }
  }

  /**
   * Получить все диалоги пользователя
   * @param {number} userId - ID пользователя
   * @returns {Promise<Array>} - Массив диалогов
   */
  static async getUserConversations(userId) {
    try {
      const query = `
        SELECT 
          DISTINCT 
          CASE 
            WHEN sender_id = ? THEN receiver_id 
            ELSE sender_id 
          END as conversation_with_id,
          (SELECT MAX(created_at) FROM private_messages 
           WHERE (sender_id = ? AND receiver_id = conversation_with_id) 
              OR (sender_id = conversation_with_id AND receiver_id = ?)) as last_message_time,
          (SELECT COUNT(*) FROM private_messages 
           WHERE receiver_id = ? 
             AND sender_id = conversation_with_id 
             AND is_read = 0) as unread_count
        FROM private_messages
        WHERE sender_id = ? OR receiver_id = ?
        ORDER BY last_message_time DESC
      `;
      const [conversations] = await db.query(query, [userId, userId, userId, userId, userId, userId]);
      return conversations;
    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw error;
    }
  }

  /**
   * Создать новое личное сообщение
   * @param {Object} message - Объект сообщения
   * @param {string} message.text - Текст сообщения
   * @param {number} message.sender_id - ID отправителя
   * @param {number} message.receiver_id - ID получателя
   * @returns {Promise<Object>} - Созданное сообщение
   */
  static async create(message) {
    try {
      const { text, sender_id, receiver_id } = message;
      const query = `
        INSERT INTO private_messages (text, sender_id, receiver_id, is_read, created_at) 
        VALUES (?, ?, ?, 0, NOW())
      `;
      const [result] = await db.query(query, [text, sender_id, receiver_id]);
      
      const newMessage = {
        id: result.insertId,
        text,
        sender_id,
        receiver_id,
        is_read: 0,
        created_at: new Date()
      };
      
      return newMessage;
    } catch (error) {
      console.error('Error creating private message:', error);
      throw error;
    }
  }

  /**
   * Пометить сообщения как прочитанные
   * @param {number} senderId - ID отправителя
   * @param {number} receiverId - ID получателя
   * @returns {Promise<boolean>} - Результат операции
   */
  static async markAsRead(senderId, receiverId) {
    try {
      const query = `
        UPDATE private_messages 
        SET is_read = 1 
        WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
      `;
      await db.query(query, [senderId, receiverId]);
      return true;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Удалить сообщение
   * @param {number} id - ID сообщения
   * @param {number} userId - ID пользователя (для проверки прав)
   * @returns {Promise<boolean>} - Результат операции
   */
  static async delete(id, userId) {
    try {
      const query = `
        DELETE FROM private_messages 
        WHERE id = ? AND sender_id = ?
      `;
      const [result] = await db.query(query, [id, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting private message:', error);
      throw error;
    }
  }
}

module.exports = PrivateMessage; 