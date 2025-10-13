const db = require('../db');

/**
 * Модель для работы с офисами
 */
class Office {
  /**
   * Получить все офисы с сотрудниками и статистикой
   * @returns {Promise<Array>} - Массив офисов
   */
  static async getAll() {
    try {
      const query = `
        SELECT o.*, 
               COUNT(DISTINCT u.id) as employees_count,
               CASE 
                 WHEN MAX(u.last_active) > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1 
                 ELSE 0 
               END as online,
               MAX(u.last_active) as last_activity
        FROM offices o
        LEFT JOIN users u ON u.office_id = o.id
        GROUP BY o.id
        ORDER BY o.name ASC
      `;
      const [offices] = await db.query(query);
      
      // Для каждого офиса получаем сотрудников и статистику
      for (let office of offices) {
        office.employees = await this.getEmployeesByOfficeId(office.id);
        office.stats = await this.getStatsByOfficeId(office.id, 'day');
        office.chartData = await this.getChartDataByOfficeId(office.id);
        
        // Определяем онлайн-статус на основе last_activity
        office.online = office.last_activity && 
          new Date(office.last_activity) > new Date(Date.now() - 5 * 60 * 1000) ? 1 : 0;
      }
      
      return offices;
    } catch (error) {
      console.error('Error getting offices:', error);
      throw error;
    }
  }

  /**
   * Получить офис по ID
   * @param {number} id - ID офиса
   * @returns {Promise<Object|null>} - Объект офиса или null
   */
  static async getById(id) {
    try {
      const query = `
        SELECT o.*, 
               COUNT(u.id) as employees_count,
               CASE 
                 WHEN MAX(u.last_active) > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1 
                 ELSE 0 
               END as online,
               MAX(u.last_active) as last_activity
        FROM offices o
        LEFT JOIN users u ON u.office_id = o.id
        WHERE o.id = ?
        GROUP BY o.id
      `;
      const [offices] = await db.query(query, [id]);
      
      if (offices.length > 0) {
        const office = offices[0];
        
        // Определяем онлайн-статус на основе last_activity
        office.online = office.last_activity && 
          new Date(office.last_activity) > new Date(Date.now() - 5 * 60 * 1000) ? 1 : 0;
          
        return office;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting office by ID:', error);
      throw error;
    }
  }

  /**
   * Создать новый офис
   * @param {Object} office - Объект офиса
   * @returns {Promise<Object>} - Созданный офис
   */
  static async create(office) {
    try {
      const { name, address, contact_phone, website } = office;
      const query = `
        INSERT INTO offices (name, address, contact_phone, website, created_at) 
        VALUES (?, ?, ?, ?, NOW())
      `;
      const [result] = await db.query(query, [name, address, contact_phone, website]);
      
      const newOffice = {
        id: result.insertId,
        name,
        address,
        contact_phone,
        website,
        created_at: new Date()
      };
      
      return newOffice;
    } catch (error) {
      console.error('Error creating office:', error);
      throw error;
    }
  }

  /**
   * Обновить офис
   * @param {number} id - ID офиса
   * @param {Object} office - Объект офиса
   * @returns {Promise<boolean>} - Результат операции
   */
  static async update(id, office) {
    try {
      const { name, address, contact_phone, website } = office;
      const query = `
        UPDATE offices 
        SET name = ?, 
            address = ?, 
            contact_phone = ?, 
            website = ?,
            updated_at = NOW()
        WHERE id = ?
      `;
      await db.query(query, [name, address, contact_phone, website, id]);
      return true;
    } catch (error) {
      console.error('Error updating office:', error);
      throw error;
    }
  }

  /**
   * Удалить офис
   * @param {number} id - ID офиса
   * @returns {Promise<boolean>} - Результат операции
   */
  static async delete(id) {
    try {
      const query = `
        DELETE FROM offices 
        WHERE id = ?
      `;
      await db.query(query, [id]);
      return true;
    } catch (error) {
      console.error('Error deleting office:', error);
      throw error;
    }
  }

  /**
   * Получить сотрудников офиса
   * @param {number} officeId - ID офиса
   * @returns {Promise<Array>} - Массив сотрудников
   */
  static async getEmployeesByOfficeId(officeId) {
    try {
      // Возвращаем пустой массив, так как в текущей схеме нет связи между сотрудниками и офисами
      // В будущем можно реализовать правильную связь
      return [];
      
      // Оригинальный запрос, который не работает из-за отсутствия колонки office_id
      // const query = `
      //   SELECT * FROM employees 
      //   WHERE office_id = ? 
      //   ORDER BY surname ASC
      // `;
      // const [employees] = await db.query(query, [officeId]);
      // return employees;
    } catch (error) {
      console.error('Error getting employees:', error);
      // Возвращаем пустой массив вместо ошибки
      return [];
    }
  }

  /**
   * Получить статистику офиса по периоду
   * @param {number} officeId - ID офиса
   * @param {string} period - Период (day, 2weeks, month)
   * @returns {Promise<Object>} - Статистика офиса
   */
  static async getStatsByOfficeId(officeId, period = 'day') {
    try {
      const query = `
        SELECT * FROM office_stats 
        WHERE office_id = ? AND period_type = ? 
        LIMIT 1
      `;
      const [stats] = await db.query(query, [officeId, period]);
      return stats.length > 0 ? stats[0] : {
        visits: 0,
        orders: 0,
        revenue: 0,
        pending: 0
      };
    } catch (error) {
      console.error('Error getting office stats:', error);
      throw error;
    }
  }

  /**
   * Получить данные для графиков офиса
   * @param {number} officeId - ID офиса
   * @returns {Promise<Object>} - Данные для графиков
   */
  static async getChartDataByOfficeId(officeId) {
    try {
      // Заглушка для данных графиков
      return {
        pie: [],
        bar: [],
        line: []
      };
    } catch (error) {
      console.error('Error getting chart data:', error);
      throw error;
    }
  }

  /**
   * Получить данные о выручке офисов за указанный период
   * @param {string} period - Период (day, 2weeks, month)
   * @returns {Promise<Object>} - Данные о выручке
   */
  static async getRevenueByPeriod(period) {
    try {
      const query = `
        SELECT o.id, o.name, os.revenue
        FROM offices o
        LEFT JOIN office_stats os ON o.id = os.office_id AND os.period_type = ?
        ORDER BY o.name ASC
      `;
      const [results] = await db.query(query, [period]);
      
      const offices = results.map(row => ({
        id: row.id.toString(),
        name: row.name,
        revenue: [row.revenue || 0]
      }));
      
      return {
        labels: offices.map(o => o.name),
        offices: offices
      };
    } catch (error) {
      console.error('Error getting revenue by period:', error);
      throw error;
    }
  }
}

module.exports = Office;