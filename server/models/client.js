const db = require('../db');

class Client {
  /**
   * Получить всех клиентов офиса (по office_id в clients).
   * Поддерживает опциональную пагинацию: { page, pageSize } — если оба > 0,
   * возвращает { items, total, page, pageSize }. Без пагинации возвращает
   * массив (обратная совместимость).
   */
  static async getAllByOffice(officeId, options = {}) {
    try {
      const { page, pageSize } = options;

      const baseFrom = `
        FROM clients cl
        LEFT JOIN contracts c ON cl.id = c.id_client
        WHERE cl.office_id = ?
      `;
      const selectFields = `
        SELECT cl.*,
               COUNT(DISTINCT c.id) as contracts_count,
               COALESCE(SUM(c.amount), 0) as total_spent
      `;

      if (page > 0 && pageSize > 0) {
        const [[{ total }]] = await db.query(
          `SELECT COUNT(DISTINCT cl.id) AS total ${baseFrom}`,
          [officeId]
        );
        const offset = (page - 1) * pageSize;
        const [items] = await db.query(
          `${selectFields} ${baseFrom} GROUP BY cl.id ORDER BY cl.id DESC LIMIT ? OFFSET ?`,
          [officeId, pageSize, offset]
        );
        return { items, total, page, pageSize };
      }

      const [clients] = await db.query(
        `${selectFields} ${baseFrom} GROUP BY cl.id ORDER BY cl.id DESC`,
        [officeId]
      );
      return clients;
    } catch (error) {
      console.error('Error getting clients:', error);
      throw error;
    }
  }

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
   * Создать нового клиента с привязкой к офису
   */
  static async create(clientData) {
    try {
      const { name, full_name, phone, email, address, office_id } = clientData;
      const clientName = name || full_name || '';
      
      const [result] = await db.query(
        `INSERT INTO clients (name, phone, email, address, office_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [clientName, phone || '', email || '', address || '', office_id || null]
      );

      return await this.getById(result.insertId);
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  static async update(id, clientData) {
    try {
      const { name, full_name, phone, email, address } = clientData;
      const clientName = name || full_name || '';
      
      await db.query(
        `UPDATE clients 
         SET name = ?, phone = ?, email = ?, address = ?
         WHERE id = ?`,
        [clientName, phone || '', email || '', address || '', id]
      );

      return await this.getById(id);
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
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

  static async search(officeId, searchTerm) {
    try {
      const query = `
        SELECT cl.*,
               COUNT(DISTINCT c.id) as contracts_count,
               COALESCE(SUM(c.amount), 0) as total_spent
        FROM clients cl
        LEFT JOIN contracts c ON cl.id = c.id_client
        WHERE cl.office_id = ?
        AND (
          cl.name LIKE ? OR 
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
