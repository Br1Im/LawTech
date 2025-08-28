/**
 * Контроллер для работы с заявками на присоединение к офису
 */
const JoinRequest = require('../models/joinRequest');

const joinRequestController = {
  /**
   * Получить все заявки на присоединение к офису
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async getOfficeJoinRequests(req, res) {
    try {
      const { officeId } = req.params;
      
      if (!officeId) {
        return res.status(400).json({ error: 'ID офиса обязателен' });
      }
      
      const requests = await JoinRequest.getByOfficeId(officeId);
      
      return res.json({ requests });
    } catch (error) {
      console.error('Ошибка при получении заявок:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Получить статус заявки пользователя
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async getUserRequestStatus(req, res) {
    try {
      // Получаем ID пользователя из токена авторизации
      const userId = req.user.id;
      
      const request = await JoinRequest.getByUserId(userId);
      
      return res.json({ request: request || null });
    } catch (error) {
      console.error('Ошибка при получении статуса заявки:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Обновить статус заявки на присоединение
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async updateRequestStatus(req, res) {
    try {
      const { requestId } = req.params;
      const { status, role } = req.body;
      
      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Некорректный статус' });
      }
      
      const updatedRequest = await JoinRequest.updateStatus(requestId, { status, role });
      
      return res.json({ request: updatedRequest });
    } catch (error) {
      console.error('Ошибка при обновлении статуса заявки:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Создать заявку на присоединение к офису
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async joinOffice(req, res) {
    try {
      const { officeId } = req.body;
      const userId = req.user.id;
      const userName = req.user.name;
      const userEmail = req.user.email;
      
      if (!officeId) {
        return res.status(400).json({ error: 'ID офиса обязателен' });
      }
      
      // В реальном проекте здесь будет создание заявки в базе данных
      // Пока просто возвращаем успешный результат
      
      return res.status(201).json({ 
        success: true,
        message: 'Заявка на присоединение отправлена'
      });
    } catch (error) {
      console.error('Ошибка при создании заявки:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }
};

module.exports = joinRequestController;