const db = require('../db');

class OfficeDocument {
  /**
   * Найти все документы офиса
   * @param {number} officeId - ID офиса
   * @returns {Promise<Array>} - Массив документов
   */
  static async findByOfficeId(officeId) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM office_documents WHERE office_id = ? ORDER BY created_at DESC',
        [officeId]
      );
      return rows;
    } catch (error) {
      console.error('Ошибка при получении документов офиса:', error);
      throw error;
    }
  }

  /**
   * Найти документ по ID
   * @param {number} id - ID документа
   * @returns {Promise<Object|null>} - Документ или null, если не найден
   */
  static async findById(id) {
    try {
      const [rows] = await db.query('SELECT * FROM office_documents WHERE id = ?', [id]);
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Ошибка при получении документа по ID:', error);
      throw error;
    }
  }

  /**
   * Создать новый документ офиса
   * @param {Object} document - Данные документа
   * @param {string} document.title - Название документа
   * @param {string} document.type - Тип документа
   * @param {string} document.status - Статус документа
   * @param {string} document.client - Клиент
   * @param {number} document.office_id - ID офиса
   * @param {string} document.content - Содержание документа
   * @returns {Promise<Object>} - Созданный документ
   */
  static async create(document) {
    try {
      const { title, type, status, client, office_id, content } = document;
      
      const [result] = await db.query(
        `INSERT INTO office_documents 
        (title, type, status, client, office_id, content, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [title, type, status, client, office_id, content]
      );

      const id = result.insertId;
      return { id, ...document, created_at: new Date().toISOString() };
    } catch (error) {
      console.error('Ошибка при создании документа офиса:', error);
      throw error;
    }
  }

  /**
   * Обновить документ офиса
   * @param {number} id - ID документа
   * @param {Object} document - Данные для обновления
   * @returns {Promise<Object>} - Обновленный документ
   */
  static async update(id, document) {
    try {
      const fields = Object.keys(document)
        .filter(key => key !== 'id' && key !== 'created_at')
        .map(key => `${key} = ?`);
      
      const values = Object.keys(document)
        .filter(key => key !== 'id' && key !== 'created_at')
        .map(key => document[key]);

      if (fields.length === 0) {
        return this.findById(id);
      }

      const [result] = await db.query(
        `UPDATE office_documents SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`,
        [...values, id]
      );

      if (result.affectedRows === 0) {
        throw new Error('Документ не найден');
      }

      return { id, ...document, updated_at: new Date().toISOString() };
    } catch (error) {
      console.error('Ошибка при обновлении документа офиса:', error);
      throw error;
    }
  }

  /**
   * Удалить документ офиса
   * @param {number} id - ID документа
   * @returns {Promise<boolean>} - true, если документ удален
   */
  static async delete(id) {
    try {
      const [result] = await db.query('DELETE FROM office_documents WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Ошибка при удалении документа офиса:', error);
      throw error;
    }
  }

  /**
   * Найти документы по типу
   * @param {number} officeId - ID офиса
   * @param {string} type - Тип документа
   * @returns {Promise<Array>} - Массив документов
   */
  static async findByType(officeId, type) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM office_documents WHERE office_id = ? AND type = ? ORDER BY created_at DESC',
        [officeId, type]
      );
      return rows;
    } catch (error) {
      console.error('Ошибка при получении документов по типу:', error);
      throw error;
    }
  }

  /**
   * Найти документы по статусу
   * @param {number} officeId - ID офиса
   * @param {string} status - Статус документа
   * @returns {Promise<Array>} - Массив документов
   */
  static async findByStatus(officeId, status) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM office_documents WHERE office_id = ? AND status = ? ORDER BY created_at DESC',
        [officeId, status]
      );
      return rows;
    } catch (error) {
      console.error('Ошибка при получении документов по статусу:', error);
      throw error;
    }
  }
}

module.exports = OfficeDocument;