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
}

module.exports = Office; 