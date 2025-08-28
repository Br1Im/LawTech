/**
 * Модель для работы с сотрудниками
 */
const db = require('../db');

class Employee {
  /**
   * Получить всех сотрудников офиса
   * @param {string} officeId - ID офиса
   * @returns {Promise<Array>} - массив сотрудников
   */
  static async getByOfficeId(officeId) {
    try {
      // В реальном проекте здесь будет запрос к базе данных
      // Пока возвращаем тестовые данные
      return [
        {
          id: 1,
          name: 'Иванов Иван',
          email: 'ivanov@example.com',
          role: 'lawyer',
          status: 'active',
          position: 'Старший юрист',
          avatar: null,
          officeId: officeId,
          officeName: 'Главный офис',
          joinDate: '2023-01-15'
        },
        {
          id: 2,
          name: 'Петрова Анна',
          email: 'petrova@example.com',
          role: 'expert',
          status: 'active',
          position: 'Эксперт по налогам',
          avatar: null,
          officeId: officeId,
          officeName: 'Главный офис',
          joinDate: '2023-02-20'
        },
        {
          id: 3,
          name: 'Сидоров Алексей',
          email: 'sidorov@example.com',
          role: 'lawyer',
          status: 'active',
          position: 'Юрист',
          avatar: null,
          officeId: officeId,
          officeName: 'Главный офис',
          joinDate: '2023-03-10'
        }
      ];
    } catch (error) {
      console.error('Ошибка при получении сотрудников:', error);
      throw error;
    }
  }

  /**
   * Получить сотрудника по ID
   * @param {number} id - ID сотрудника
   * @returns {Promise<Object|null>} - данные сотрудника или null
   */
  static async getById(id) {
    try {
      // В реальном проекте здесь будет запрос к базе данных
      // Пока возвращаем тестовые данные
      const employees = [
        {
          id: 1,
          name: 'Иванов Иван',
          email: 'ivanov@example.com',
          role: 'lawyer',
          status: 'active',
          position: 'Старший юрист',
          avatar: null,
          officeId: '1',
          officeName: 'Главный офис',
          joinDate: '2023-01-15'
        },
        {
          id: 2,
          name: 'Петрова Анна',
          email: 'petrova@example.com',
          role: 'expert',
          status: 'active',
          position: 'Эксперт по налогам',
          avatar: null,
          officeId: '1',
          officeName: 'Главный офис',
          joinDate: '2023-02-20'
        }
      ];
      
      return employees.find(emp => emp.id === parseInt(id)) || null;
    } catch (error) {
      console.error('Ошибка при получении сотрудника:', error);
      throw error;
    }
  }

  /**
   * Обновить данные сотрудника
   * @param {number} id - ID сотрудника
   * @param {Object} data - Новые данные сотрудника
   * @returns {Promise<Object>} - обновленные данные сотрудника
   */
  static async update(id, data) {
    try {
      // В реальном проекте здесь будет запрос к базе данных
      // Пока просто возвращаем объединенные данные
      const employee = await this.getById(id);
      if (!employee) {
        throw new Error('Сотрудник не найден');
      }
      
      return { ...employee, ...data };
    } catch (error) {
      console.error('Ошибка при обновлении сотрудника:', error);
      throw error;
    }
  }

  /**
   * Удалить сотрудника
   * @param {number} id - ID сотрудника
   * @returns {Promise<boolean>} - результат операции
   */
  static async delete(id) {
    try {
      // В реальном проекте здесь будет запрос к базе данных
      return true;
    } catch (error) {
      console.error('Ошибка при удалении сотрудника:', error);
      throw error;
    }
  }
}

module.exports = Employee;