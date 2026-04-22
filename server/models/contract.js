const db = require('../db');

/**
 * Модель для работы с договорами
 */
class Contract {
  static async getAllByOffice(officeId) {
    try {
      const query = `
        SELECT c.*, 
               COALESCE(cl.name, 'Неизвестный клиент') as client_name,
               cl.phone as client_phone,
               cl.email as client_email,
               CONCAT(e.first_name, ' ', e.last_name) as employee_name
        FROM contracts c
        LEFT JOIN clients cl ON c.id_client = cl.id
        LEFT JOIN employees e ON c.id_employee = e.id
        WHERE e.office_id = ?
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
               COALESCE(cl.name, 'Неизвестный клиент') as client_name,
               cl.phone as client_phone,
               cl.email as client_email,
               CONCAT(e.first_name, ' ', e.last_name) as employee_name,
               e.office_id as office_id
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
    const connection = await db.getClient();
    try {
      await connection.beginTransaction();

      const { id_employee, id_client, contract_date, amount, paid_amount, status } = contractData;
      
      // Используем paid_amount, если указан, иначе amount
      const paidAmountValue = paid_amount || amount;
      
      // Создаем договор
      const [result] = await connection.query(
        `INSERT INTO contracts (id_employee, id_client, contract_date, amount, paid_amount, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id_employee, id_client, contract_date, amount, paidAmountValue, status || 'active']
      );

      const contractId = result.insertId;

      // Получаем office_id сотрудника
      const [employee] = await connection.query(
        'SELECT office_id FROM employees WHERE id = ?',
        [id_employee]
      );

      if (employee.length > 0) {
        const officeId = employee[0].office_id;

        // Обновляем статистику офиса - используем paid_amount для выручки
        await this.updateOfficeStats(connection, officeId, paidAmountValue, contract_date);
        
        // Обновляем статистику сотрудника
        await this.updateEmployeeStats(connection, id_employee, paidAmountValue, contract_date);

        // Создаем событие в календаре
        await connection.query(
          `INSERT INTO calendar_events 
           (title, description, start_date, office_id, type) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            `Договор №${contractId}`,
            `Сумма договора: ${amount} ₽, Внесено: ${paidAmountValue} ₽`,
            contract_date,
            officeId,
            'contract'
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
    const connection = await db.getClient();
    try {
      await connection.beginTransaction();

      // Получаем старый договор для расчета разницы
      const oldContract = await this.getById(id);
      if (!oldContract) {
        throw new Error('Contract not found');
      }

      const { id_employee, id_client, contract_date, amount, paid_amount, status } = contractData;
      
      // Используем paid_amount, если указан, иначе amount
      const paidAmountValue = paid_amount !== undefined ? paid_amount : amount;
      
      // Обновляем договор
      await connection.query(
        `UPDATE contracts 
         SET id_employee = ?, id_client = ?, contract_date = ?, amount = ?, paid_amount = ?, status = ?
         WHERE id = ?`,
        [id_employee, id_client, contract_date, amount, paidAmountValue, status, id]
      );

      // Если изменилась сумма внесения или дата, обновляем статистику
      const oldPaidAmount = oldContract.paid_amount || oldContract.amount;
      if (oldPaidAmount !== paidAmountValue || oldContract.contract_date !== contract_date) {
        // Сначала вычитаем старую сумму из старой даты
        await this.updateOfficeStatsOnDelete(connection, oldContract.office_id, oldPaidAmount, oldContract.contract_date);
        await this.updateEmployeeStatsOnDelete(connection, oldContract.id_employee, oldPaidAmount, oldContract.contract_date);
        
        // Затем добавляем новую сумму в новую дату
        await this.updateOfficeStats(connection, oldContract.office_id, paidAmountValue, contract_date);
        await this.updateEmployeeStats(connection, id_employee, paidAmountValue, contract_date);
      }

      // Обновляем событие в календаре
      await connection.query(
        `UPDATE calendar_events 
         SET title = ?, description = ?, start_date = ?
         WHERE title LIKE ?`,
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
    const connection = await db.getClient();
    try {
      await connection.beginTransaction();

      // Получаем договор для обновления статистики
      const contract = await this.getById(id);
      if (!contract) {
        throw new Error('Contract not found');
      }

      // Используем paid_amount для статистики
      const paidAmountValue = contract.paid_amount || contract.amount;
      
      // Вычитаем сумму внесения из статистики офиса и сотрудника
      await this.updateOfficeStatsOnDelete(connection, contract.office_id, paidAmountValue, contract.contract_date);
      await this.updateEmployeeStatsOnDelete(connection, contract.id_employee, paidAmountValue, contract.contract_date);

      // Удаляем событие из календаря
      await connection.query(
        `DELETE FROM calendar_events 
         WHERE title LIKE ?`,
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
  static async updateOfficeStats(connection, officeId, amount, contractDate) {
    const date = new Date(contractDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const week = this.getWeekNumber(date);

    // Обновляем статистику для всех периодов
    const periods = [
      { type: 'day', value: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` },
      { type: 'week', value: `${year}-W${week.toString().padStart(2, '0')}` },
      { type: 'month', value: `${year}-${month.toString().padStart(2, '0')}` },
      { type: 'year', value: year.toString() }
    ];

    for (const period of periods) {
      await connection.query(
        `INSERT INTO office_stats (office_id, period_type, period_value, revenue, orders) 
         VALUES (?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE 
         revenue = revenue + VALUES(revenue),
         orders = orders + VALUES(orders)`,
        [officeId, period.type, period.value, amount]
      );
    }
  }

  /**
   * Обновить статистику офиса при удалении договора (вычитание)
   */
  static async updateOfficeStatsOnDelete(connection, officeId, amount, contractDate) {
    const date = new Date(contractDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const week = this.getWeekNumber(date);

    // Обновляем статистику для всех периодов (вычитаем)
    const periods = [
      { type: 'day', value: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` },
      { type: 'week', value: `${year}-W${week.toString().padStart(2, '0')}` },
      { type: 'month', value: `${year}-${month.toString().padStart(2, '0')}` },
      { type: 'year', value: year.toString() }
    ];

    for (const period of periods) {
      await connection.query(
        `UPDATE office_stats 
         SET revenue = GREATEST(0, revenue - ?),
             orders = GREATEST(0, orders - 1)
         WHERE office_id = ? AND period_type = ? AND period_value = ?`,
        [amount, officeId, period.type, period.value]
      );
    }
  }

  /**
   * Обновить статистику сотрудника
   */
  static async updateEmployeeStats(connection, employeeId, amount, contractDate) {
    const date = new Date(contractDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const week = this.getWeekNumber(date);

    // Обновляем статистику для всех периодов
    const periods = [
      { type: 'day', value: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` },
      { type: 'week', value: `${year}-W${week.toString().padStart(2, '0')}` },
      { type: 'month', value: `${year}-${month.toString().padStart(2, '0')}` },
      { type: 'year', value: year.toString() }
    ];

    for (const period of periods) {
      await connection.query(
        `INSERT INTO employee_stats (employee_id, period_type, period_value, revenue, orders) 
         VALUES (?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE 
         revenue = revenue + VALUES(revenue),
         orders = orders + VALUES(orders)`,
        [employeeId, period.type, period.value, amount]
      );
    }
  }

  /**
   * Обновить статистику сотрудника при удалении договора (вычитание)
   */
  static async updateEmployeeStatsOnDelete(connection, employeeId, amount, contractDate) {
    const date = new Date(contractDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const week = this.getWeekNumber(date);

    // Обновляем статистику для всех периодов (вычитаем)
    const periods = [
      { type: 'day', value: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` },
      { type: 'week', value: `${year}-W${week.toString().padStart(2, '0')}` },
      { type: 'month', value: `${year}-${month.toString().padStart(2, '0')}` },
      { type: 'year', value: year.toString() }
    ];

    for (const period of periods) {
      await connection.query(
        `UPDATE employee_stats 
         SET revenue = GREATEST(0, revenue - ?),
             orders = GREATEST(0, orders - 1)
         WHERE employee_id = ? AND period_type = ? AND period_value = ?`,
        [amount, employeeId, period.type, period.value]
      );
    }
  }

  /**
   * Получить номер недели в году
   */
  static getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
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
        WHERE e.office_id = ? AND ${dateFilter}
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
