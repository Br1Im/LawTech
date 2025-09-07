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
               CASE 
                 WHEN MAX(u.last_active) > datetime('now', '-5 minutes') THEN 1 
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
               CASE 
                 WHEN MAX(u.last_active) > datetime('now', '-5 minutes') THEN 1 
                 ELSE 0 
               END as online,
               MAX(u.last_active) as last_activity
        FROM offices o
        LEFT JOIN users u ON u.office_id = o.id
        WHERE o.id = ?
        GROUP BY o.id
      `;
      const [offices] = await db.query(query, [id]);
      return offices.length > 0 ? offices[0] : null;
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
        VALUES (?, ?, ?, ?, datetime('now'))
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
            updated_at = datetime('now')
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
      const query = `
        SELECT * FROM employees 
        WHERE office_id = ? 
        ORDER BY surname ASC
      `;
      const [employees] = await db.query(query, [officeId]);
      return employees;
    } catch (error) {
      console.error('Error getting employees:', error);
      throw error;
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
        ORDER BY date DESC 
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
      const query = `
        SELECT chart_type, data_key, data_value, label 
        FROM chart_data 
        WHERE office_id = ? 
        ORDER BY chart_type, data_key
      `;
      const [chartData] = await db.query(query, [officeId]);
      
      // Группируем данные по типу графика
      const groupedData = {
        pie: [],
        bar: [],
        line: []
      };
      
      chartData.forEach(item => {
        if (groupedData[item.chart_type]) {
          groupedData[item.chart_type].push({
            key: item.data_key,
            value: item.data_value,
            label: item.label
          });
        }
      });
      
      return groupedData;
    } catch (error) {
      console.error('Error getting chart data:', error);
      throw error;
    }
  }

  /**
   * Обновить статистику офиса
   * @param {number} officeId - ID офиса
   * @param {string} period - Период
   * @param {Object} stats - Статистика
   * @returns {Promise<boolean>} - Результат операции
   */
  static async updateStats(officeId, period, stats) {
    try {
      const { visits, orders, revenue, pending } = stats;
      const today = new Date().toISOString().split('T')[0];
      
      // Проверяем, есть ли уже запись за сегодня
      const [existing] = await db.query(`
        SELECT id FROM office_stats 
        WHERE office_id = ? AND period_type = ? AND date = ?
      `, [officeId, period, today]);
      
      if (existing.length > 0) {
        // Обновляем существующую запись
        await db.query(`
          UPDATE office_stats 
          SET visits = ?, orders = ?, revenue = ?, pending = ? 
          WHERE id = ?
        `, [visits, orders, revenue, pending, existing[0].id]);
      } else {
        // Создаем новую запись
        await db.query(`
          INSERT INTO office_stats (office_id, period_type, visits, orders, revenue, pending, date)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [officeId, period, visits, orders, revenue, pending, today]);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating office stats:', error);
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