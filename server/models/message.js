const db = require('../db');

class Message {
  static async getByOfficeAndChannel(officeId, channel = 'reception') {
    try {
      const query = `
        SELECT m.id, m.office_id, m.channel, m.sender_id, m.content, m.is_read, m.status,
               m.file_url, m.file_name, m.file_type, m.created_at,
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

  static async getByOfficeId(officeId) {
    return this.getByOfficeAndChannel(officeId, 'reception');
  }

  static async create(message) {
    try {
      const { content, sender_name, office_id, sender_id, channel = 'reception', file_url = null, file_name = null, file_type = null } = message;
      const query = `
        INSERT INTO messages (content, office_id, channel, sender_id, is_read, status, file_url, file_name, file_type, created_at)
        VALUES (?, ?, ?, ?, 0, 'sent', ?, ?, ?, NOW())
      `;
      const [result] = await db.query(query, [content, office_id, channel, sender_id, file_url, file_name, file_type]);

      return {
        id: result.insertId,
        content,
        sender_name,
        office_id,
        channel,
        sender_id,
        is_read: 0,
        status: 'sent',
        file_url,
        file_name,
        file_type,
        created_at: new Date()
      };
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  static async markAsRead(id) {
    try {
      await db.query(`UPDATE messages SET is_read = 1, status = 'read' WHERE id = ?`, [id]);
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await db.query(`DELETE FROM messages WHERE id = ?`, [id]);
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
}

module.exports = Message;
