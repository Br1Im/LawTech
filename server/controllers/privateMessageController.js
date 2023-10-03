const PrivateMessage = require('../models/privateMessage');
const User = require('../models/user');

/**
 * Контроллер для работы с личными сообщениями
 */
const privateMessageController = {
  /**
   * Получить все диалоги пользователя
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async getUserConversations(req, res) {
    try {
      const userId = req.user.id;
      
      const conversations = await PrivateMessage.getUserConversations(userId);
      
      // Получаем информацию о пользователях для каждого диалога
      const conversationsWithUserInfo = [];
      
      for (const conversation of conversations) {
        // В реальном приложении здесь был бы запрос к базе данных
        // для получения информации о пользователе
        const otherUserId = conversation.conversation_with_id;
        
        // Временное решение для демонстрации
        const userInfo = {
          id: otherUserId,
          username: `User ${otherUserId}`,
          avatar: null
        };
        
        conversationsWithUserInfo.push({
          ...conversation,
          user: userInfo
        });
      }
      
      return res.json(conversationsWithUserInfo);
    } catch (error) {
      console.error('Ошибка при получении диалогов:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Получить сообщения между текущим пользователем и другим пользователем
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async getConversation(req, res) {
    try {
      const userId = req.user.id;
      const { otherUserId } = req.params;
      
      // Проверяем, существует ли пользователь
      // В реальном приложении здесь был бы запрос к базе данных
      
      const messages = await PrivateMessage.getConversation(userId, otherUserId);
      
      // Помечаем все сообщения от другого пользователя как прочитанные
      await PrivateMessage.markAsRead(otherUserId, userId);
      
      return res.json(messages);
    } catch (error) {
      console.error('Ошибка при получении сообщений:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Отправить личное сообщение
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async sendMessage(req, res) {
    try {
      const senderId = req.user.id;
      const { receiverId } = req.params;
      const { text } = req.body;
      
      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Текст сообщения не может быть пустым' });
      }
      
      // Проверяем, существует ли получатель
      // В реальном приложении здесь был бы запрос к базе данных
      
      const messageData = {
        text: text.trim(),
        sender_id: senderId,
        receiver_id: receiverId
      };
      
      const message = await PrivateMessage.create(messageData);
      
      return res.status(201).json(message);
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Пометить сообщения как прочитанные
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async markMessagesAsRead(req, res) {
    try {
      const receiverId = req.user.id;
      const { senderId } = req.params;
      
      await PrivateMessage.markAsRead(senderId, receiverId);
      
      return res.json({ success: true });
    } catch (error) {
      console.error('Ошибка при обновлении статуса сообщений:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Удалить сообщение
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async deleteMessage(req, res) {
    try {
      const userId = req.user.id;
      const { messageId } = req.params;
      
      const success = await PrivateMessage.delete(messageId, userId);
      
      if (!success) {
        return res.status(403).json({ error: 'У вас нет прав на удаление этого сообщения' });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error('Ошибка при удалении сообщения:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Получить информацию о пользователе для чата
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async getUserInfo(req, res) {
    try {
      const { userId } = req.params;
      
      // В реальном приложении здесь был бы запрос к базе данных
      // для получения информации о пользователе
      
      // Временное решение для демонстрации
      const userInfo = {
        id: userId,
        username: `User ${userId}`,
        avatar: null,
        status: {
          isOnline: Math.random() > 0.5, // Случайный статус для демонстрации
          lastActive: new Date().toISOString()
        }
      };
      
      return res.json(userInfo);
    } catch (error) {
      console.error('Ошибка при получении информации о пользователе:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }
};

module.exports = privateMessageController; 