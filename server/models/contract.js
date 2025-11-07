const db = require('../db');

/**
 * Модель для работы с договорами
 */
class Contract {
  static async getAllByOffice(officeId) {
    try {
      const query = `
        SELECT c.*, 
               COALESCE(cl.full_name, 'Неизвестный клиент') as client_name,
               cl.phone as client_phone,
               cl.email as client_email,
               e.full_name as employee_name
        FROM contracts c
        LEFT JOIN clients cl ON c.id_client = cl.id
        LEFT JOIN employees e ON c.id_employee = e.id
        WHERE e.id_office = ?
        ORDER BY c.contract_date DESC
      `;
      const [contracts] = await db.query(query, [officeId]);
      return contracts;
    } catch (error) {
      console.error('Error getting contracts:', error);
      throw error;
    }
  }

  /**
   * Получить договор по ID
   */
  static async getById(id) {
    try {
      const query = `
        SELECT c.*, 
               COALESCE(cl.full_name, 'Неизвестный клиент') as client_name,
               cl.phone as client_phone,
               cl.email as client_email,
               e.full_name as employee_name,
               e.id_office as office_id
        FROM contracts c
        LEFT JOIN clients cl ON c.id_client = cl.id
        LEFT JOIN employees e ON c.id_employee = e.id
        WHERE c.id = ?
      `;
      const [contracts] = await db.query(query, [id]);
      return contracts.length > 0 ? contracts[0] : null;
    } catch (error) {
      console.error('Error getting contract by ID:', error);
      throw error;
    }
  }

  /**
   * Создать новый договор
   */
  static async create(contractData) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const { id_employee, id_client, contract_date, amount, status } = contractData;
      
      // Создаем договор
      const [result] = await connection.query(
        `INSERT INTO contracts (id_employee, id_client, contract_date, amount, status) 
         VALUES (?, ?, ?, ?, ?)`,
        [id_employee, id_client, contract_date, amount, status || 'active']
      );

      const contractId = result.insertId;

      // Получаем office_id сотрудника
      const [employee] = await connection.query(
        'SELECT id_office FROM employees WHERE id = ?',
        [id_employee]
      );

      if (employee.length > 0) {
        const officeId = employee[0].id_office;

        // Обновляем статистику офиса - увеличиваем выручку и количество заказов
        await this.updateOfficeStats(connection, officeId, amount);

        // Создаем событие в календаре
        await connection.query(
          `INSERT INTO calendar_events 
           (title, description, start_date, event_type, office_id, created_at) 
           VALUES (?, ?, ?, 'contract', ?, NOW())`,
          [
            `Договор №${contractId}`,
            `Сумма: ${amount} ₽`,
            contract_date,
            officeId
          ]
        );
      }

      await connection.commit();
      return await this.getById(contractId);
    } catch (error) {
      await connection.rollback();
      console.error('Error creating contract:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Обновить договор
   */
  static async update(id, contractData) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Получаем старый договор для расчета разницы
      const oldContract = await this.getById(id);
      if (!oldContract) {
        throw new Error('Contract not found');
      }

      const { id_employee, id_client, contract_date, amount, status } = contractData;
      
      // Обновляем договор
      await connection.query(
        `UPDATE contracts 
         SET id_employee = ?, id_client = ?, contract_date = ?, amount = ?, status = ?
         WHERE id = ?`,
        [id_employee, id_client, contract_date, amount, status, id]
      );

      // Если изменилась сумма, обновляем статистику
      if (oldContract.amount !== amount) {
        const difference = amount - oldContract.amount;
        await this.updateOfficeStats(connection, oldContract.office_id, difference);
      }

      // Обновляем событие в календаре
      await connection.query(
        `UPDATE calendar_events 
         SET title = ?, description = ?, start_date = ?
         WHERE event_type = 'contract' AND title LIKE ?`,
        [
          `Договор №${id}`,
          `Сумма: ${amount} ₽`,
          contract_date,
          `Договор №${id}%`
        ]
      );

      await connection.commit();
      return await this.getById(id);
    } catch (error) {
      await connection.rollback();
      console.error('Error updating contract:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Удалить договор
   */
  static async delete(id) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Получаем договор для обновления статистики
      const contract = await this.getById(id);
      if (!contract) {
        throw new Error('Contract not found');
      }

      // Уменьшаем статистику офиса
      await this.updateOfficeStats(connection, contract.office_id, -contract.amount, -1);

      // Удаляем событие из календаря
      await connection.query(
        `DELETE FROM calendar_events 
         WHERE event_type = 'contract' AND title LIKE ?`,
        [`Договор №${id}%`]
      );

      // Удаляем договор
      await connection.query('DELETE FROM contracts WHERE id = ?', [id]);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Error deleting contract:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Обновить статистику офиса
   */
  static async updateOfficeStats(connection, officeId, amountDiff, ordersDiff = 1) {
    try {
      // Обновляем статистику для всех периодов
      const periods = ['day', 'week', 'month', 'year'];
      
      for (const period of periods) {
        await connection.query(
          `INSERT INTO office_stats (office_id, period_type, revenue, orders, updated_at)
           VALUES (?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE 
           revenue = revenue + ?,
           orders = orders + ?,
           updated_at = NOW()`,
          [officeId, period, amountDiff, ordersDiff, amountDiff, ordersDiff]
        );
      }
    } catch (error) {
      console.error('Error updating office stats:', error);
      throw error;
    }
  }

  /**
   * Получить статистику по договорам офиса
   */
  static async getStatsByOffice(officeId, period = 'month') {
    try {
      let dateFilter = '';
      switch (period) {
        case 'day':
          dateFilter = 'DATE(c.contract_date) = CURDATE()';
          break;
        case 'week':
          dateFilter = 'YEARWEEK(c.contract_date) = YEARWEEK(NOW())';
          break;
        case 'month':
          dateFilter = 'YEAR(c.contract_date) = YEAR(NOW()) AND MONTH(c.contract_date) = MONTH(NOW())';
          break;
        case 'year':
          dateFilter = 'YEAR(c.contract_date) = YEAR(NOW())';
          break;
        default:
          dateFilter = '1=1';
      }

      const query = `
        SELECT 
          COUNT(*) as total_contracts,
          SUM(c.amount) as total_revenue,
          AVG(c.amount) as avg_contract_value,
          COUNT(DISTINCT c.id_client) as unique_clients
        FROM contracts c
        JOIN employees e ON c.id_employee = e.id
        WHERE e.id_office = ? AND ${dateFilter}
      `;
      
      const [stats] = await db.query(query, [officeId]);
      return stats[0];
    } catch (error) {
      console.error('Error getting contract stats:', error);
      throw error;
    }
  }
}

module.exports = Contract;
