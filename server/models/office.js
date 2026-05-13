const db = require('../db');

class Office {
  /**
   * Получить все офисы с сотрудниками и статистикой — одним набором запросов
   */
  static async getAll() {
    try {
      const [offices] = await db.query(`
        SELECT o.*,
               COUNT(DISTINCT CASE WHEN u.role != 'director' THEN u.id END) as employee_count,
               MAX(u.updated_at) as last_activity
        FROM offices o
        LEFT JOIN users u ON u.office_id = o.id AND u.is_active = 1
        GROUP BY o.id
        ORDER BY o.name ASC
      `);

      if (offices.length === 0) return [];
      return this._enrichOffices(offices);
    } catch (error) {
      console.error('Error getting offices:', error);
      throw error;
    }
  }

  /**
   * Получить все офисы директора — без N+1
   */
  static async getAllByOwner(ownerId) {
    try {
      const [offices] = await db.query(`
        SELECT o.*,
               COUNT(DISTINCT CASE WHEN u.role != 'director' THEN u.id END) as employee_count,
               MAX(u.updated_at) as last_activity
        FROM offices o
        LEFT JOIN users u ON u.office_id = o.id AND u.is_active = 1
        WHERE o.owner_id = ?
        GROUP BY o.id
        ORDER BY o.name ASC
      `, [ownerId]);

      if (offices.length === 0) return [];
      return this._enrichOffices(offices);
    } catch (error) {
      console.error('Error getting offices by owner:', error);
      throw error;
    }
  }

  /**
   * Обогащает массив офисов сотрудниками и статистикой за 2 batch-запроса
   */
  static async _enrichOffices(offices) {
    const ids = offices.map(o => o.id);
    if (ids.length === 0) return offices;

    const placeholders = ids.map(() => '?').join(',');

    // Batch: сотрудники + их статистика (один JOIN)
    const [allEmployees] = await db.query(`
      SELECT e.id, e.first_name, e.last_name, e.email, e.position, e.phone,
             e.office_id,
             COALESCE(SUM(es.revenue), 0) as revenue,
             COALESCE(SUM(es.orders), 0) as orders
      FROM employees e
      LEFT JOIN employee_stats es ON es.employee_id = e.id AND es.period_type = 'month'
      WHERE e.office_id IN (${placeholders})
      GROUP BY e.id
      ORDER BY e.last_name ASC
    `, ids);

    // Batch: статистика офисов
    const [allStats] = await db.query(`
      SELECT office_id,
             COALESCE(SUM(revenue), 0) as revenue,
             COALESCE(SUM(orders), 0) as orders
      FROM office_stats
      WHERE office_id IN (${placeholders}) AND period_type = 'day'
      GROUP BY office_id
    `, ids);

    // Группируем по office_id
    const empMap = {};
    const statsMap = {};
    for (const e of allEmployees) {
      if (!empMap[e.office_id]) empMap[e.office_id] = [];
      empMap[e.office_id].push({
        id: e.id, first_name: e.first_name, last_name: e.last_name,
        email: e.email, position: e.position, phone: e.phone,
        is_active: 1, revenue: parseFloat(e.revenue), orders: parseInt(e.orders)
      });
    }
    for (const s of allStats) {
      statsMap[s.office_id] = {
        revenue: parseFloat(s.revenue), orders: parseInt(s.orders),
        clients: 0, employees: 0, expenses: 0, documents: 0, visits: 0
      };
    }

    const defaultStats = { revenue: 0, orders: 0, clients: 0, employees: 0, expenses: 0, documents: 0, visits: 0 };
    const defaultChart = { pie: [], bar: [], line: [] };

    for (const office of offices) {
      office.employees = empMap[office.id] || [];
      office.stats = statsMap[office.id] || { ...defaultStats };
      office.chartData = defaultChart;
      office.online = office.last_activity &&
        new Date(office.last_activity) > new Date(Date.now() - 5 * 60 * 1000) ? 1 : 0;
    }

    return offices;
  }

  static async getById(id) {
    try {
      const [offices] = await db.query(`
        SELECT o.*,
               COUNT(CASE WHEN u.role != 'director' AND u.is_active = 1 THEN u.id END) as employee_count,
               MAX(u.updated_at) as last_activity
        FROM offices o
        LEFT JOIN users u ON u.office_id = o.id
        WHERE o.id = ?
        GROUP BY o.id
      `, [id]);

      if (offices.length > 0) {
        const office = offices[0];
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

  static async create(office) {
    try {
      const { name, address, contact_phone, website, ip_surname, ip_name, ip_middle_name, inn, ogrn, work_phone, work_phone2 } = office;
      const [result] = await db.query(
        'INSERT INTO offices (name, address, contact_phone, website, ip_surname, ip_name, ip_middle_name, inn, ogrn, work_phone, work_phone2, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [name, address, contact_phone, website, ip_surname || null, ip_name || null, ip_middle_name || null, inn || null, ogrn || null, work_phone || null, work_phone2 || null]
      );
      return { id: result.insertId, name, address, contact_phone, website, ip_surname, ip_name, ip_middle_name, inn, ogrn, work_phone, work_phone2, created_at: new Date() };
    } catch (error) {
      console.error('Error creating office:', error);
      throw error;
    }
  }

  static async update(id, office) {
    try {
      const { name, address, contact_phone, website } = office;
      await db.query(
        'UPDATE offices SET name = ?, address = ?, contact_phone = ?, website = ?, updated_at = NOW() WHERE id = ?',
        [name, address, contact_phone, website, id]
      );
      return true;
    } catch (error) {
      console.error('Error updating office:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await db.query('DELETE FROM offices WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting office:', error);
      throw error;
    }
  }

  static async getEmployeesByOfficeId(officeId, period = 'month') {
    try {
      const [employees] = await db.query(`
        SELECT e.id, e.first_name, e.last_name, e.email, e.position, e.phone,
               1 as is_active,
               COALESCE(SUM(es.revenue), 0) as revenue,
               COALESCE(SUM(es.orders), 0) as orders
        FROM employees e
        LEFT JOIN employee_stats es ON es.employee_id = e.id AND es.period_type = ?
        WHERE e.office_id = ?
        GROUP BY e.id
        ORDER BY e.last_name ASC
      `, [period, officeId]);

      for (const emp of employees) {
        emp.revenue = parseFloat(emp.revenue);
        emp.orders = parseInt(emp.orders);
      }
      return employees;
    } catch (error) {
      console.error('Error getting employees:', error);
      return [];
    }
  }

  static async getStatsByOfficeId(officeId, period = 'day') {
    try {
      const [stats] = await db.query(`
        SELECT
          COALESCE(SUM(revenue), 0) as revenue,
          COALESCE(SUM(orders), 0) as orders,
          0 as clients, 0 as employees, 0 as expenses, 0 as documents, 0 as visits
        FROM office_stats
        WHERE office_id = ? AND period_type = ?
      `, [officeId, period]);

      return stats[0] || { revenue: 0, orders: 0, clients: 0, employees: 0, expenses: 0, documents: 0, visits: 0 };
    } catch (error) {
      console.error('Error getting office stats:', error);
      return { revenue: 0, orders: 0, clients: 0, employees: 0, expenses: 0, documents: 0, visits: 0 };
    }
  }

  static async getChartDataByOfficeId() {
    return { pie: [], bar: [], line: [] };
  }

  static async getRevenueByPeriod(period, officeIds = null) {
    try {
      let periodType = 'day';
      if (period === '2weeks') periodType = 'week';
      else if (period === 'month') periodType = 'month';

      let query = `
        SELECT o.id, o.name,
               os.period_value, COALESCE(os.revenue, 0) as revenue
        FROM offices o
        LEFT JOIN (
          SELECT office_id, period_value, revenue
          FROM office_stats
          WHERE period_type = ?
          ORDER BY period_value DESC
        ) os ON os.office_id = o.id`;
      const params = [periodType];

      if (officeIds && officeIds.length > 0) {
        query += ` WHERE o.id IN (${officeIds.map(() => '?').join(',')})`;
        params.push(...officeIds);
      }

      query += ` ORDER BY o.name ASC, os.period_value DESC`;

      const [rows] = await db.query(query, params);

      const officeMap = {};
      for (const r of rows) {
        const key = r.id.toString();
        if (!officeMap[key]) officeMap[key] = { id: key, name: r.name, revenue: [] };
        if (r.period_value && officeMap[key].revenue.length < 6) {
          officeMap[key].revenue.push(parseFloat(r.revenue) || 0);
        }
      }

      const officesWithRevenue = Object.values(officeMap).map(o => {
        const rev = o.revenue.reverse();
        while (rev.length < 6) rev.unshift(0);
        return { ...o, revenue: rev };
      });

      return { labels: [], offices: officesWithRevenue };
    } catch (error) {
      console.error('Error getting revenue by period:', error);
      throw error;
    }
  }

  static async updateStats(id, period, stats) {
    try {
      const periodValue = new Date().toISOString().split('T')[0];
      await db.query(`
        INSERT INTO office_stats (office_id, period_type, period_value, revenue, orders)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          revenue = VALUES(revenue),
          orders = VALUES(orders),
          updated_at = NOW()
      `, [id, period, periodValue, stats.revenue || 0, stats.orders || 0]);
      return true;
    } catch (error) {
      console.error('Error updating office stats:', error);
      return false;
    }
  }
}

module.exports = Office;
