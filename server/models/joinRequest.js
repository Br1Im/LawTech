/**
 * Модель для работы с заявками на присоединение к офису
 */
const db = require('../db');

class JoinRequest {
  /**
   * Получить все заявки на присоединение к офису
   * @param {string} officeId - ID офиса
   * @returns {Promise<Array>} - массив заявок
   */
  static async getByOfficeId(officeId) {
    try {
      // В реальном проекте здесь будет запрос к базе данных
      // Пока возвращаем тестовые данные
      return [
        {
          id: 1,
          userId: 101,
          userName: 'Сергей Новиков',
          userEmail: 'novikov@example.com',
          officeId: officeId,
          requestDate: '2023-05-15',
          status: 'pending'
        },
        {
          id: 2,
          userId: 102,
          userName: 'Анна Соколова',
          userEmail: 'sokolova@example.com',
          officeId: officeId,
          requestDate: '2023-05-16',
          status: 'pending'
        }
      ];
    } catch (error) {
      console.error('Ошибка при получении заявок:', error);
      throw error;
    }
  }

  /**
   * Получить заявку по ID
   * @param {number} id - ID заявки
   * @returns {Promise<Object|null>} - данные заявки или null
   */
  static async getById(id) {
    try {
      // В реальном проекте здесь будет запрос к базе данных
      // Пока возвращаем тестовые данные
      const requests = [
        {
          id: 1,
          userId: 101,
          userName: 'Сергей Новиков',
          userEmail: 'novikov@example.com',
          officeId: '1',
          requestDate: '2023-05-15',
          status: 'pending'
        },
        {
          id: 2,
          userId: 102,
          userName: 'Анна Соколова',
          userEmail: 'sokolova@example.com',
          officeId: '1',
          requestDate: '2023-05-16',
          status: 'pending'
        }
      ];
      
      return requests.find(req => req.id === parseInt(id)) || null;
    } catch (error) {
      console.error('Ошибка при получении заявки:', error);
      throw error;
    }
  }

  /**
   * Обновить статус заявки
   * @param {number} id - ID заявки
   * @param {Object} data - Новые данные заявки (status, role)
   * @returns {Promise<Object>} - обновленные данные заявки
   */
  static async updateStatus(id, data) {
    try {
      // В реальном проекте здесь будет запрос к базе данных
      // Пока просто возвращаем объединенные данные
      const request = await this.getById(id);
      if (!request) {
        throw new Error('Заявка не найдена');
      }
      
      return { ...request, ...data };
    } catch (error) {
      console.error('Ошибка при обновлении заявки:', error);
      throw error;
    }
  }

  /**
   * Получить статус заявки пользователя
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object|null>} - данные заявки или null
   */
  static async getByUserId(userId) {
    try {
      // В реальном проекте здесь будет запрос к базе данных
      // Пока возвращаем тестовые данные
      const requests = [
        {
          id: 1,
          userId: 101,
          userName: 'Сергей Новиков',
          userEmail: 'novikov@example.com',
          officeId: '1',
          officeName: 'Главный офис',
          requestDate: '2023-05-15',
          status: 'pending'
        },
        {
          id: 2,
          userId: 102,
          userName: 'Анна Соколова',
          userEmail: 'sokolova@example.com',
          officeId: '1',
          officeName: 'Главный офис',
          requestDate: '2023-05-16',
          status: 'pending'
        }
      ];
      
      return requests.find(req => req.userId === parseInt(userId)) || null;
    } catch (error) {
      console.error('Ошибка при получении статуса заявки:', error);
      throw error;
    }
  }
}

module.exports = JoinRequest;