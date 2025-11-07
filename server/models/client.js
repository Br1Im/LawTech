const db = require('../db');

/**
 * Модель для работы с клиентами
 */
class Client {
  /**
   * Получить всех клиентов офиса
   */
  static async getAllByOffice(officeId) {
    try {
      const query = `
        SELECT DISTINCT cl.*,
               COUNT(DISTINCT c.id) as contracts_count,
               COALESCE(SUM(c.amount), 0) as total_spent
        FROM clients cl
        LEFT JOIN contracts c ON cl.id = c.id_client
        LEFT JOIN employees e ON c.id_employee = e.id
        WHERE e.id_office = ? OR cl.id NOT IN (
          SELECT DISTINCT id_client FROM contracts
        )
        GROUP BY cl.id
        ORDER BY cl.id DESC
      `;
      const [clients] = await db.query(query, [officeId]);
      return clients;
    } catch (error) {
      console.error('Error getting clients:', error);
      throw error;
    }
  }

  /**
   * Получить клиента по ID
   */
  static async getById(id) {
    try {
      const query = `
        SELECT cl.*,
               COUNT(DISTINCT c.id) as contracts_count,
               COALESCE(SUM(c.amount), 0) as total_spent
        FROM clients cl
        LEFT JOIN contracts c ON cl.id = c.id_client
        WHERE cl.id = ?
        GROUP BY cl.id
      `;
      const [clients] = await db.query(query, [id]);
      return clients.length > 0 ? clients[0] : null;
    } catch (error) {
      console.error('Error getting client by ID:', error);
      throw error;
    }
  }

  /**
   * Создать нового клиента
   */
  static async create(clientData) {
    try {
      const { full_name, phone, email, address } = clientData;
      
      const [result] = await db.query(
        `INSERT INTO clients (full_name, phone, email, address) 
         VALUES (?, ?, ?, ?)`,
        [full_name || '', phone || '', email || '', address || '']
      );

      return await this.getById(result.insertId);
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  /**
   * Обновить клиента
   */
  static async update(id, clientData) {
    try {
      const { full_name, phone, email, address } = clientData;
      
      await db.query(
        `UPDATE clients 
         SET full_name = ?, phone = ?, email = ?, address = ?
         WHERE id = ?`,
        [full_name || '', phone || '', email || '', address || '', id]
      );

      return await this.getById(id);
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  /**
   * Удалить клиента
   */
  static async delete(id) {
    try {
      // Проверяем, есть ли у клиента активные договоры
      const [contracts] = await db.query(
        'SELECT COUNT(*) as count FROM contracts WHERE id_client = ? AND status = "active"',
        [id]
      );

      if (contracts[0].count > 0) {
        throw new Error('Cannot delete client with active contracts');
      }

      await db.query('DELETE FROM clients WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }

  /**
   * Поиск клиентов
   */
  static async search(officeId, searchTerm) {
    try {
      const query = `
        SELECT DISTINCT cl.*,
               COUNT(DISTINCT c.id) as contracts_count,
               COALESCE(SUM(c.amount), 0) as total_spent
        FROM clients cl
        LEFT JOIN contracts c ON cl.id = c.id_client
        LEFT JOIN employees e ON c.id_employee = e.id
        WHERE (e.id_office = ? OR cl.id NOT IN (SELECT DISTINCT id_client FROM contracts))
        AND (
          cl.full_name LIKE ? OR 
          cl.phone LIKE ? OR 
          cl.email LIKE ?
        )
        GROUP BY cl.id
        ORDER BY cl.id DESC
      `;
      
      const searchPattern = `%${searchTerm}%`;
      const [clients] = await db.query(query, [
        officeId, 
        searchPattern, 
        searchPattern, 
        searchPattern
      ]);
      
      return clients;
    } catch (error) {
      console.error('Error searching clients:', error);
      throw error;
    }
  }
}

module.exports = Client;
