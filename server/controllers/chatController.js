const Message = require('../models/message');
const Office = require('../models/office');
const { formatMessageResponse } = require('../utils/formatters');

/**
 * Контроллер для работы с чатом офисов
 */
const chatController = {
  /**
   * Получить все сообщения для офиса
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async getOfficeMessages(req, res) {
    try {
      const { officeId } = req.params;
      
      // Проверяем, существует ли офис
      const office = await Office.getById(officeId);
      if (!office) {
        return res.status(404).json({ error: 'Офис не найден' });
      }
      
      const messages = await Message.getByOfficeId(officeId);
      
      // Форматируем ответ
      const formattedMessages = messages.map(message => formatMessageResponse(message, req.user.id));
      
      return res.json(formattedMessages);
    } catch (error) {
      console.error('Ошибка при получении сообщений:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Отправить сообщение в чат офиса
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async sendMessage(req, res) {
    try {
      const { officeId } = req.params;
      const { text } = req.body;
      
      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Текст сообщения не может быть пустым' });
      }
      
      // Проверяем, существует ли офис
      const office = await Office.getById(officeId);
      if (!office) {
        return res.status(404).json({ error: 'Офис не найден' });
      }
      
      const messageData = {
        text: text.trim(),
        sender: req.user.username,
        office_id: officeId,
        user_id: req.user.id
      };
      
      const message = await Message.create(messageData);
      
      // Форматируем ответ
      const formattedMessage = formatMessageResponse(message, req.user.id);
      
      return res.status(201).json(formattedMessage);
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Пометить сообщение как прочитанное
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
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
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      
      // Удаляем сообщение
      await Message.delete(messageId);
      
      return res.json({ success: true });
    } catch (error) {
      console.error('Ошибка при удалении сообщения:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }
};

module.exports = chatController; 