const Message = require('../models/message');
const Office = require('../models/office');
const { formatMessageResponse } = require('../utils/formatters');

/**
 * Контроллер для работы с чатом офисов
 * Поддерживает 2 канала:
 *   'reception'    — Администратор + Менеджер + ОКК
 *   'call_center'  — Начальник КЦ + Менеджер + ОКК
 */
const chatController = {
  /**
   * Получить сообщения для офиса (с поддержкой канала)
   * GET /api/offices/:officeId/messages?channel=reception|call_center
   */
  async getOfficeMessages(req, res) {
    try {
      const { officeId } = req.params;
      const channel = req.query.channel || 'reception';
      
      const office = await Office.getById(officeId);
      if (!office) {
        return res.status(404).json({ error: 'Офис не найден' });
      }
      
      const messages = await Message.getByOfficeAndChannel(officeId, channel);
      const formattedMessages = messages.map(message => formatMessageResponse(message, req.user.id));
      
      return res.json(formattedMessages);
    } catch (error) {
      console.error('Ошибка при получении сообщений:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Отправить сообщение в чат офиса
   * POST /api/offices/:officeId/messages  body: { text, channel }
   */
  async sendMessage(req, res) {
    try {
      const { officeId } = req.params;
      const { text, channel = 'reception' } = req.body;
      
      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Текст сообщения не может быть пустым' });
      }
      
      const office = await Office.getById(officeId);
      if (!office) {
        return res.status(404).json({ error: 'Офис не найден' });
      }
      
      const db = require('../db');
      const [userRows] = await db.query('SELECT first_name, last_name, email, role FROM users WHERE id = ?', [req.user.id]);
      const userData = userRows[0] || {};

      const senderName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email || req.user.email;

      const messageData = {
        content: text.trim(),
        sender_name: senderName,
        office_id: officeId,
        sender_id: req.user.id,
        channel
      };
      
      const message = await Message.create(messageData);

      message.user_role = userData.role;
      message.first_name = userData.first_name;
      message.last_name = userData.last_name;
      message.user_email = userData.email;
      
      const formattedMessage = formatMessageResponse(message, req.user.id);
      
      return res.status(201).json(formattedMessage);
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Пометить сообщение как прочитанное
   */
  async markMessageAsRead(req, res) {
    try {
      const { messageId } = req.params;
      await Message.markAsRead(messageId);
      return res.json({ success: true });
    } catch (error) {
      console.error('Ошибка при обновлении статуса сообщения:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Удалить сообщение из чата
   */
  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      await Message.delete(messageId);
      return res.json({ success: true });
    } catch (error) {
      console.error('Ошибка при удалении сообщения:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }
};

module.exports = chatController;
