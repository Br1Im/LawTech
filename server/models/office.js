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
                 WHEN MAX(u.updated_at) > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1 
                 ELSE 0 
               END as online,
               MAX(u.updated_at) as last_activity
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
        
        // Определяем онлайн-статус на основе last_activity (из updated_at)
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
                 WHEN MAX(u.updated_at) > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1 
                 ELSE 0 
               END as online,
               MAX(u.updated_at) as last_activity
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
   * @param {string} period - Период для статистики
   * @returns {Promise<Array>} - Массив сотрудников
   */
  static async getEmployeesByOfficeId(officeId, period = 'month') {
    try {
      // Получаем сотрудников из таблицы employees
      const query = `
        SELECT e.id, e.first_name, e.last_name, e.email, e.position, e.phone, 
               1 as is_active
        FROM employees e
        WHERE e.office_id = ?
        ORDER BY e.last_name ASC
      `;
      const [employees] = await db.query(query, [officeId]);
      
      // Для каждого сотрудника получаем статистику
      for (let employee of employees) {
        const [stats] = await db.query(
          `SELECT COALESCE(SUM(revenue), 0) as revenue, COALESCE(SUM(orders), 0) as orders
           FROM employee_stats
           WHERE employee_id = ? AND period_type = ?`,
          [employee.id, period]
        );
        
        employee.revenue = stats.length > 0 ? parseFloat(stats[0].revenue) : 0;
        employee.orders = stats.length > 0 ? parseInt(stats[0].orders) : 0;
      }
      
      return employees;
    } catch (error) {
      console.error('Error getting employees:', error);
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
      // Суммируем все данные за выбранный период
      const query = `
        SELECT 
          COALESCE(SUM(revenue), 0) as revenue,
          COALESCE(SUM(orders), 0) as orders,
          0 as clients,
          0 as employees,
          0 as expenses,
          0 as documents,
          0 as visits
        FROM office_stats 
        WHERE office_id = ? AND period_type = ?
      `;
      const [stats] = await db.query(query, [officeId, period]);
      
      if (stats && stats.length > 0) {
        return stats[0];
      }
      
      // Если данных нет, возвращаем пустую статистику
      return {
        revenue: 0,
        orders: 0,
        clients: 0,
        employees: 0,
        expenses: 0,
        documents: 0,
        visits: 0
      };
    } catch (error) {
      console.error('Error getting office stats:', error);
      return {
        revenue: 0,
        orders: 0,
        clients: 0,
        employees: 0,
        expenses: 0,
        documents: 0,
        visits: 0
      };
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
      // Получаем все офисы
      const [offices] = await db.query('SELECT id, name FROM offices ORDER BY name ASC');
      
      // Определяем тип периода для запроса
      let periodType = 'day';
      if (period === '2weeks') periodType = 'week';
      else if (period === 'month') periodType = 'month';
      
      // Для каждого офиса получаем данные за последние 6 периодов
      const officesWithRevenue = await Promise.all(offices.map(async (office) => {
        const [stats] = await db.query(
          `SELECT period_value, revenue 
           FROM office_stats 
           WHERE office_id = ? AND period_type = ?
           ORDER BY period_value DESC
           LIMIT 6`,
          [office.id, periodType]
        );
        
        // Создаем массив выручки (в обратном порядке, чтобы старые данные были слева)
        const revenue = stats.reverse().map(s => parseFloat(s.revenue) || 0);
        
        // Дополняем нулями, если данных меньше 6
        while (revenue.length < 6) {
          revenue.unshift(0);
        }
        
        return {
          id: office.id.toString(),
          name: office.name,
          revenue: revenue
        };
      }));
      
      return {
        labels: [], // Метки будут сгенерированы на фронтенде
        offices: officesWithRevenue
      };
    } catch (error) {
      console.error('Error getting revenue by period:', error);
      throw error;
    }
  }
}

module.exports = Office;