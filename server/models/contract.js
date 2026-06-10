const db = require('../db');
const contractAssignmentService = require('../services/contractAssignmentService');

/**
 * Модель для работы с договорами
 */
class Contract {
  static async getAllByOffice(officeId, options = {}) {
    try {
      const { page, pageSize } = options;

      // Поддержка массива office_id (мульти-офис)
      const isMulti = Array.isArray(officeId);
      const officeFilter = isMulti ? 'c.office_id IN (?)' : 'c.office_id = ?';
      const officeParam = officeId;

      const baseFrom = `
        FROM contracts c
        LEFT JOIN clients cl ON c.id_client = cl.id
        LEFT JOIN employees e ON c.id_employee = e.id
        LEFT JOIN employees e2 ON c.second_employee_id = e2.id
        LEFT JOIN employees exp ON c.expert_id = exp.id
        LEFT JOIN employees sb ON c.signed_by = sb.id
        LEFT JOIN users rc ON c.remainder_confirmed_by = rc.id
        WHERE ${officeFilter}
      `;

      const selectFields = `
        SELECT c.*,
               (SELECT o.name FROM offices o WHERE o.id = c.office_id) as office_name,
               COALESCE(cl.name, 'Неизвестный клиент') as client_name,
               cl.phone as client_phone,
               cl.email as client_email,
               CONCAT(e.first_name, ' ', e.last_name) as employee_name,
               TRIM(CONCAT_WS(' ', e.last_name, e.first_name, e.middle_name)) as lawyer_full_name,
               CONCAT(e.first_name, ' ', e.last_name) as lawyer_short,
               TRIM(CONCAT_WS(' ', e2.last_name, e2.first_name, e2.middle_name)) as second_lawyer_full_name,
               TRIM(CONCAT_WS(' ', exp.last_name, exp.first_name, exp.middle_name)) as expert_full_name,
               CONCAT(exp.first_name, ' ', exp.last_name) as expert_short,
               TRIM(CONCAT_WS(' ', sb.last_name, sb.first_name, sb.middle_name)) as signed_by_name,
               TRIM(CONCAT_WS(' ', rc.last_name, rc.first_name, rc.middle_name)) as remainder_confirmed_by_name
      `;

      if (page > 0 && pageSize > 0) {
        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total ${baseFrom}`, [officeParam]);
        const offset = (page - 1) * pageSize;
        const query = `${selectFields} ${baseFrom} ORDER BY c.contract_date DESC LIMIT ? OFFSET ?`;
        const [contracts] = await db.query(query, [officeParam, pageSize, offset]);
        return { contracts, total };
      }

      const query = `${selectFields} ${baseFrom} ORDER BY c.contract_date DESC`;
      const [contracts] = await db.query(query, [officeParam]);
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
               TRIM(CONCAT_WS(' ', e.last_name, e.first_name, e.middle_name)) as lawyer_full_name,
               TRIM(CONCAT_WS(' ', e2.last_name, e2.first_name, e2.middle_name)) as second_lawyer_full_name,
               TRIM(CONCAT_WS(' ', exp.last_name, exp.first_name, exp.middle_name)) as expert_full_name,
               TRIM(CONCAT_WS(' ', sb.last_name, sb.first_name, sb.middle_name)) as signed_by_name,
               TRIM(CONCAT_WS(' ', rc.last_name, rc.first_name, rc.middle_name)) as remainder_confirmed_by_name,
               e.office_id as office_id
        FROM contracts c
        LEFT JOIN clients cl ON c.id_client = cl.id
        LEFT JOIN employees e ON c.id_employee = e.id
        LEFT JOIN employees e2 ON c.second_employee_id = e2.id
        LEFT JOIN employees exp ON c.expert_id = exp.id
        LEFT JOIN employees sb ON c.signed_by = sb.id
        LEFT JOIN users rc ON c.remainder_confirmed_by = rc.id
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
   * Генерация номера договора DDMMYYXX
   */
  static async generateContractNumber(officeId, contractDate) {
    const d = new Date(contractDate);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);

    // Определяем начало 14-дневного периода для офиса
    const [periods] = await db.query(
      `SELECT period_start FROM contract_periods
       WHERE office_id = ? AND period_start <= ?
       ORDER BY period_start DESC LIMIT 1`,
      [officeId, contractDate]
    );

    let periodStart;
    if (periods.length > 0) {
      periodStart = periods[0].period_start;
    } else {
      // Если нет настроенного периода — берём 1-е число текущего месяца
      periodStart = `${d.getFullYear()}-${mm}-01`;
    }

    // Считаем договоры в этом периоде для офиса
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 14);
    const periodEndStr = periodEnd.toISOString().slice(0, 10);

    const [countRows] = await db.query(
      `SELECT COUNT(*) as cnt FROM contracts
       WHERE office_id = ? AND contract_date >= ? AND contract_date < ?
       AND contract_number IS NOT NULL`,
      [officeId, periodStart, periodEndStr]
    );

    const seq = (countRows[0].cnt || 0) + 1;
    const seqStr = String(seq).padStart(2, '0');
    return `${dd}${mm}${yy}${seqStr}`;
  }

  /**
   * Создать новый договор
   */
  static async create(contractData) {
    const connection = await db.getClient();
    try {
      await connection.beginTransaction();

      const {
        id_employee, id_client, contract_date, amount, paid_amount, status, title, description,
        contract_type, expert_id, docs_status,
        contract_number, additional_payment_date, additional_payment_amount,
        registered_by, payment_method, on_behalf_of,
        appointment_id, signed_by,
        is_joint, second_employee_id,
      } = contractData;

      // Используем paid_amount, если указан, иначе amount
      const paidAmountValue = paid_amount !== undefined ? paid_amount : amount;
      const ctype = (contract_type || 'docs').toString();
      const expertVal = expert_id ? Number(expert_id) : null;
      const dStatus = (docs_status || 'pending').toString();

      // Совместный договор: второй юрист обязателен и не равен первому
      let secondEmpVal = second_employee_id ? Number(second_employee_id) : null;
      let isJointVal = (is_joint && secondEmpVal && secondEmpVal !== Number(id_employee)) ? 1 : 0;
      if (!isJointVal) secondEmpVal = null;

      // При регистрации через администратора юрист должен дополнить данные
      const needsLawyerInput = registered_by ? 1 : 0;

      // Используем office_id из данных (переданный из контроллера — user.office_id),
      // если не указан — фолбэк на employees
      let contractOfficeId = contractData.office_id || null;
      if (!contractOfficeId) {
        const [empRows] = await connection.query('SELECT office_id FROM employees WHERE id = ?', [id_employee]);
        contractOfficeId = empRows.length > 0 ? empRows[0].office_id : null;
      }

      // Создаем договор с привязкой к офису
      const [result] = await connection.query(
        `INSERT INTO contracts (
           id_employee, is_joint, second_employee_id, contract_type, expert_id, docs_status,
           id_client, contract_date, amount, paid_amount, status, title, description, office_id,
           contract_number, additional_payment_date, additional_payment_amount,
           registered_by, signed_by, payment_method, on_behalf_of,
           needs_lawyer_input, appointment_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_employee, isJointVal, secondEmpVal, ctype, expertVal, dStatus,
          id_client, contract_date, amount, paidAmountValue,
          status || 'active', title || null, description || null, contractOfficeId,
          contract_number || null, additional_payment_date || null,
          additional_payment_amount || null, registered_by || null,
          signed_by || null, payment_method || null, on_behalf_of || null,
          needsLawyerInput, appointment_id || null,
        ]
      );

      const contractId = result.insertId;

      // История: при создании совместного договора фиксируем второго юриста
      if (isJointVal && secondEmpVal) {
        const [[secEmp]] = await connection.query(
          `SELECT TRIM(CONCAT_WS(' ', last_name, first_name, middle_name)) AS full_name FROM employees WHERE id = ?`,
          [secondEmpVal]
        );
        await Contract.addHistory(connection, {
          contract_id: contractId,
          user_id: registered_by || null,
          action: 'second_lawyer_added',
          field: 'second_employee_id',
          old_value: null,
          new_value: secEmp ? secEmp.full_name : String(secondEmpVal),
        });
      }

      if (contractOfficeId) {
        const officeId = contractOfficeId;

        // Обновляем статистику офиса - используем paid_amount для выручки
        await this.updateOfficeStats(connection, officeId, paidAmountValue, contract_date);

        // Обновляем статистику сотрудника
        await this.updateEmployeeStats(connection, id_employee, paidAmountValue, contract_date);

        // Создаем событие в календаре
        await connection.query(
          `INSERT INTO calendar_events
           (title, description, start_date, end_date, office_id)
           VALUES (?, ?, ?, ?, ?)`,
          [
            `Договор №${contractId}`,
            `Сумма договора: ${amount} ₽, Внесено: ${paidAmountValue} ₽`,
            contract_date,
            contract_date,
            officeId
          ]
        );

        // Автозапись в кассу при регистрации через администратора
        if (registered_by && payment_method) {
          const cashAmount = payment_method === 'cash' ? paidAmountValue : 0;
          const noncashAmount = payment_method === 'noncash' ? paidAmountValue : 0;
          const bankAmount = payment_method === 'bank' ? paidAmountValue : 0;

          // Получаем имя юриста
          const [lawyerRows] = await connection.query(
            `SELECT TRIM(CONCAT_WS(' ', last_name, first_name, middle_name)) as full_name FROM employees WHERE id = ?`,
            [id_employee]
          );
          const lawyerName = lawyerRows.length > 0 ? lawyerRows[0].full_name : null;

          // Получаем имя клиента
          const [clientRows] = await connection.query(
            'SELECT name FROM clients WHERE id = ?',
            [id_client]
          );
          const clientName = clientRows.length > 0 ? clientRows[0].name : null;

          const contractNum = contract_number || `ДОГ-${String(contractId).padStart(8, '0')}`;

          await connection.query(
            `INSERT INTO cash_register
             (office_id, entry_date, client_name, contract_number, action,
              lawyer_name, employee_id, cash_amount, noncash_amount,
              bank_amount, expense_amount, comment, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
            [
              officeId, contract_date, clientName, contractNum,
              'Регистрация договора', lawyerName, id_employee,
              cashAmount, noncashAmount, bankAmount,
              title ? `Тема: ${title}` : null, registered_by,
            ]
          );
        }

        // Авто-назначение договора сотрудникам по ролям
        try {
          await contractAssignmentService.autoAssign(
            connection, contractId, officeId, ctype, id_employee
          );
        } catch (assignErr) {
          console.error('Auto-assignment error (non-critical):', assignErr.message);
        }
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
  static async update(id, contractData, actor = null) {
    const connection = await db.getClient();
    try {
      await connection.beginTransaction();

      // Получаем старый договор для расчета разницы
      const oldContract = await this.getById(id);
      if (!oldContract) {
        throw new Error('Contract not found');
      }

      const {
        id_employee, id_client, contract_date, amount, paid_amount, status,
        contract_type, expert_id, docs_status, title, description,
        is_joint, second_employee_id,
      } = contractData;

      // Используем paid_amount, если указан, иначе amount
      const paidAmountValue = paid_amount !== undefined ? paid_amount : amount;

      // Если paid_amount УВЕЛИЧИЛСЯ — обновляем payment_date на сегодня (доплата)
      const oldPaid = Number(oldContract.paid_amount) || 0;
      const newPaid = Number(paidAmountValue) || 0;
      const paymentDateChanged = newPaid > oldPaid;

      // Build dynamic SET so unspecified fields keep prior value (PATCH-style)
      const sets = [
        'id_employee = ?', 'id_client = ?', 'contract_date = ?', 'amount = ?', 'paid_amount = ?', 'status = ?',
      ];
      const params = [id_employee, id_client, contract_date, amount, paidAmountValue, status];
      if (paymentDateChanged) { sets.push('payment_date = CURRENT_DATE()'); }
      if (contract_type !== undefined) { sets.push('contract_type = ?'); params.push(contract_type); }
      if (expert_id !== undefined)     { sets.push('expert_id = ?');     params.push(expert_id ? Number(expert_id) : null); }
      if (docs_status !== undefined)   { sets.push('docs_status = ?');   params.push(docs_status); }
      if (title !== undefined)         { sets.push('title = ?');         params.push(title); }
      if (description !== undefined)   { sets.push('description = ?');   params.push(description); }
      if (contractData.document_types !== undefined) { sets.push('document_types = ?'); params.push(JSON.stringify(contractData.document_types)); }

      // Изменение состава юристов (совместный договор). Обрабатываем только если
      // в payload пришли соответствующие поля. Логируем в историю.
      let compositionChange = null;
      if (is_joint !== undefined || second_employee_id !== undefined) {
        const primaryId = Number(id_employee);
        let newSecond = second_employee_id ? Number(second_employee_id) : null;
        let newJoint = (is_joint && newSecond && newSecond !== primaryId) ? 1 : 0;
        if (!newJoint) newSecond = null;

        const oldSecond = oldContract.second_employee_id ? Number(oldContract.second_employee_id) : null;
        if (newSecond !== oldSecond) {
          sets.push('is_joint = ?'); params.push(newJoint);
          sets.push('second_employee_id = ?'); params.push(newSecond);

          // Резолвим имена для истории
          const nameOf = async (eid) => {
            if (!eid) return null;
            const [[r]] = await connection.query(
              `SELECT TRIM(CONCAT_WS(' ', last_name, first_name, middle_name)) AS n FROM employees WHERE id = ?`, [eid]);
            return r ? r.n : String(eid);
          };
          const oldName = await nameOf(oldSecond);
          const newName = await nameOf(newSecond);
          let action = 'second_lawyer_changed';
          if (!oldSecond && newSecond) action = 'second_lawyer_added';
          else if (oldSecond && !newSecond) action = 'second_lawyer_removed';
          compositionChange = { action, oldName, newName };
        }
      }

      params.push(id);
      await connection.query(
        `UPDATE contracts SET ${sets.join(', ')} WHERE id = ?`,
        params
      );

      if (compositionChange) {
        await Contract.addHistory(connection, {
          contract_id: Number(id),
          user_id: actor && actor.id ? actor.id : (contractData.registered_by || null),
          user_name: actor && actor.name ? actor.name : null,
          action: compositionChange.action,
          field: 'second_employee_id',
          old_value: compositionChange.oldName,
          new_value: compositionChange.newName,
        });
      }

      // Логируем изменение стоимости договора в историю
      const oldAmount = Number(oldContract.amount) || 0;
      const newAmount = Number(amount) || 0;
      if (amount !== undefined && oldAmount !== newAmount) {
        await Contract.addHistory(connection, {
          contract_id: Number(id),
          user_id: actor && actor.id ? actor.id : null,
          user_name: actor && actor.name ? actor.name : null,
          action: 'amount_changed',
          field: 'amount',
          old_value: oldAmount.toFixed(2),
          new_value: newAmount.toFixed(2),
        });
      }

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
         SET title = ?, description = ?, start_date = ?, end_date = ?
         WHERE title LIKE ?`,
        [
          `Договор №${id}`,
          `Сумма: ${amount} ₽`,
          contract_date,
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
   * Расторгнуть договор
   */
  static async terminate(id, { terminated_at, termination_reason, refund_amount, refund_deadline }) {
    const connection = await db.getClient();
    try {
      await connection.beginTransaction();

      const contract = await this.getById(id);
      if (!contract) throw new Error('Contract not found');
      if (contract.status === 'terminated') throw new Error('Договор уже расторгнут');

      await connection.query(
        `UPDATE contracts
         SET status = 'terminated',
             terminated_at = ?,
             termination_reason = ?,
             refund_amount = ?,
             refund_deadline = ?
         WHERE id = ?`,
        [terminated_at, termination_reason || null, refund_amount || 0, refund_deadline || null, id]
      );

      await connection.commit();
      return await this.getById(id);
    } catch (error) {
      await connection.rollback();
      console.error('Error terminating contract:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Подтвердить возврат денег — вычитает refund_amount из кассы офиса и юриста
   */
  static async confirmRefund(id, userId) {
    const connection = await db.getClient();
    try {
      await connection.beginTransaction();

      const contract = await this.getById(id);
      if (!contract) throw new Error('Contract not found');
      if (contract.status !== 'terminated') throw new Error('Договор не расторгнут');
      if (contract.refund_confirmed) throw new Error('Возврат уже подтверждён');

      const refundAmount = parseFloat(contract.refund_amount || 0);

      await connection.query(
        `UPDATE contracts
         SET refund_confirmed = 1,
             refund_confirmed_by = ?,
             refund_confirmed_at = NOW()
         WHERE id = ?`,
        [userId, id]
      );

      if (refundAmount > 0) {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        await this.updateOfficeStatsOnDelete(connection, contract.office_id, refundAmount, todayStr);
        await this.updateEmployeeStatsOnDelete(connection, contract.id_employee, refundAmount, todayStr);

        // Записываем возврат в кассу как расход
        const [lawyerRows] = await connection.query(
          `SELECT TRIM(CONCAT_WS(' ', last_name, first_name, middle_name)) as full_name FROM employees WHERE id = ?`,
          [contract.id_employee]
        );
        const lawyerName = lawyerRows.length > 0 ? lawyerRows[0].full_name : null;

        await connection.query(
          `INSERT INTO cash_register
           (office_id, entry_date, client_name, contract_number, action,
            lawyer_name, employee_id, cash_amount, noncash_amount,
            bank_amount, expense_amount, comment, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?)`,
          [
            contract.office_id, todayStr,
            contract.client_name || null,
            contract.contract_number || `ДОГ-${String(contract.id).padStart(8, '0')}`,
            'Возврат (расторжение)',
            lawyerName, contract.id_employee,
            refundAmount,
            `Расторжение договора. Причина: ${contract.termination_reason || 'не указана'}`,
            userId,
          ]
        );
      }

      await connection.commit();
      return await this.getById(id);
    } catch (error) {
      await connection.rollback();
      console.error('Error confirming refund:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Получить все расторгнутые договоры офиса
   */
  static async getTerminatedByOffice(officeId) {
    try {
      const query = `
        SELECT c.*,
               COALESCE(cl.name, 'Неизвестный клиент') as client_name,
               cl.phone as client_phone,
               cl.email as client_email,
               CONCAT(e.first_name, ' ', e.last_name) as employee_name,
               TRIM(CONCAT_WS(' ', e.last_name, e.first_name, e.middle_name)) as lawyer_full_name,
               CONCAT(e.first_name, ' ', e.last_name) as lawyer_short,
               TRIM(CONCAT_WS(' ', e2.last_name, e2.first_name, e2.middle_name)) as second_lawyer_full_name,
               TRIM(CONCAT_WS(' ', exp.last_name, exp.first_name, exp.middle_name)) as expert_full_name,
               CONCAT(exp.first_name, ' ', exp.last_name) as expert_short,
               CONCAT(conf.first_name, ' ', conf.last_name) as refund_confirmed_by_name,
               TRIM(CONCAT_WS(' ', sb.last_name, sb.first_name, sb.middle_name)) as signed_by_name
        FROM contracts c
        LEFT JOIN clients cl ON c.id_client = cl.id
        LEFT JOIN employees e ON c.id_employee = e.id
        LEFT JOIN employees e2 ON c.second_employee_id = e2.id
        LEFT JOIN employees exp ON c.expert_id = exp.id
        LEFT JOIN users conf ON c.refund_confirmed_by = conf.id
        LEFT JOIN employees sb ON c.signed_by = sb.id
        WHERE c.office_id = ? AND c.status = 'terminated'
        ORDER BY c.terminated_at DESC
      `;
      const [contracts] = await db.query(query, [officeId]);
      return contracts;
    } catch (error) {
      console.error('Error getting terminated contracts:', error);
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
        WHERE e.office_id = ? AND ${dateFilter}
      `;
      
      const [stats] = await db.query(query, [officeId]);
      return stats[0];
    } catch (error) {
      console.error('Error getting contract stats:', error);
      throw error;
    }
  }

  /**
   * Подтвердить оплату остатка по договору
   */
  static async confirmRemainder(id, userId) {
    try {
      const contract = await this.getById(id);
      if (!contract) throw new Error('Договор не найден');
      if (contract.remainder_confirmed) throw new Error('Оплата остатка уже подтверждена');

      const remaining = parseFloat(contract.amount || 0) - parseFloat(contract.paid_amount || 0);
      if (remaining <= 0) throw new Error('Нет остатка по договору');

      // Подтверждаем и обновляем paid_amount
      await db.query(
        `UPDATE contracts
         SET remainder_confirmed = 1,
             remainder_confirmed_by = ?,
             remainder_confirmed_at = NOW(),
             paid_amount = amount
         WHERE id = ?`,
        [userId, id]
      );

      return await this.getById(id);
    } catch (error) {
      console.error('Error confirming remainder:', error);
      throw error;
    }
  }

  /**
   * Записать изменение в историю договора.
   * conn — активное соединение/транзакция или общий db (оба поддерживают .query).
   */
  static async addHistory(conn, { contract_id, user_id, user_name, action, field, old_value, new_value }) {
    try {
      let uname = user_name || null;
      if (!uname && user_id) {
        const [[u]] = await conn.query(
          `SELECT TRIM(CONCAT_WS(' ', last_name, first_name)) AS name FROM users WHERE id = ?`,
          [user_id]
        );
        uname = u && u.name ? u.name : null;
      }
      await conn.query(
        `INSERT INTO contract_history
           (contract_id, user_id, user_name, action, field, old_value, new_value)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [contract_id, user_id || null, uname, action, field || null,
         old_value != null ? String(old_value) : null,
         new_value != null ? String(new_value) : null]
      );
    } catch (err) {
      console.error('Error writing contract history (non-critical):', err.message);
    }
  }

  /**
   * Получить историю изменений договора (новые сверху).
   */
  static async getHistory(contractId) {
    const [rows] = await db.query(
      `SELECT id, contract_id, user_id, user_name, action, field, old_value, new_value,
              created_at
         FROM contract_history
        WHERE contract_id = ?
        ORDER BY created_at DESC, id DESC`,
      [contractId]
    );
    return rows;
  }
}

module.exports = Contract;
