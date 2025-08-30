const db = require('../db');

/**
 * Модель для работы с офисами
 */
class Office {
  /**
   * Получить все офисы
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
}

  /**
   * Получить данные о выручке офисов за указанный период
   * @param {string} period - Период (day, 2weeks, month)
   * @returns {Promise<Object>} - Данные о выручке
   */
  static async getRevenueByPeriod(period) {
    try {
      // В реальном проекте здесь будет запрос к базе данных
      // с агрегацией данных о выручке за указанный период
      
      // Получаем все офисы
      const offices = await this.getAll();
      
      // Генерируем моковые данные о выручке для каждого офиса
      const officesWithRevenue = offices.map(office => {
        // Определяем количество точек данных в зависимости от периода
        let dataPoints = 6; // По умолчанию 6 точек для всех периодов
        
        // Генерируем случайные данные о выручке
        const revenue = Array(dataPoints).fill(0).map(() => 
          Math.floor(30000 + Math.random() * 40000)
        );
        
        return {
          id: office.id.toString(),
          name: office.name,
          revenue
        };
      });
      
      return {
        offices: officesWithRevenue
      };
    } catch (error) {
      console.error('Error getting office revenue:', error);
      throw error;
    }
  }
}

module.exports = Office;