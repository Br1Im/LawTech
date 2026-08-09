const db = require('../db');

/**
 * Сервис авто-назначения договоров сотрудникам по ролям.
 *
 * Правила:
 * - «Документы» (docs): → директор, менеджер, ОКК, юрист (кто заключил)
 * - «Представление интересов» (court_rep): → директор, менеджер, ОКК, сотрудник (кто заключил).
 *   Представитель НЕ назначается автоматически.
 */

const ROUTING_RULES = {
  docs: ['director', 'manager', 'okk'],
  court_rep: ['director', 'manager', 'okk'],
};

const contractAssignmentService = {

  /**
   * Автоматическое назначение договора по ролям.
   * @param {Object} connection - DB connection (внутри транзакции)
   * @param {number} contractId
   * @param {number} officeId
   * @param {string} contractType - 'docs' | 'court_rep'
   * @param {number} employeeId - ID сотрудника, заключившего договор (user_id в employees)
   */
  async autoAssign(connection, contractId, officeId, contractType, employeeId) {
    const roles = ROUTING_RULES[contractType] || ROUTING_RULES.docs;

    // Находим пользователей (users) по ролям в этом офисе
    const [users] = await connection.query(
      `SELECT id, role FROM users WHERE office_id = ? AND role IN (?) AND is_active = 1`,
      [officeId, roles]
    );

    const assignees = new Map();

    // Добавляем сотрудников по ролям
    for (const u of users) {
      assignees.set(u.id, u.role);
    }

    // Добавляем сотрудника, заключившего договор
    // employeeId — это employees.id, находим связанного user через email/office
    if (employeeId) {
      const [empRows] = await connection.query(
        'SELECT e.user_id, e.email, e.office_id FROM employees e WHERE e.id = ?',
        [employeeId]
      );
      if (empRows.length > 0) {
        const [userRows] = await connection.query(
          'SELECT id, role FROM users WHERE id = ? OR (email = ? AND office_id = ?) ORDER BY id = ? DESC LIMIT 1',
          [empRows[0].user_id || 0, empRows[0].email || '', empRows[0].office_id, empRows[0].user_id || 0]
        );
        if (userRows.length > 0 && !assignees.has(userRows[0].id)) {
          assignees.set(userRows[0].id, userRows[0].role);
        }
      }
    }

    // Вставляем назначения
    if (assignees.size > 0) {
      const values = [];
      const params = [];
      for (const [userId, role] of assignees) {
        values.push('(?, ?, ?, ?)');
        params.push(contractId, userId, role, 'auto');
      }
      await connection.query(
        `INSERT IGNORE INTO contract_assignments (contract_id, user_id, role, assignment_type) VALUES ${values.join(', ')}`,
        params
      );
    }

    return Array.from(assignees.entries()).map(([userId, role]) => ({ userId, role }));
  },

  /**
   * Получить все назначения для пользователя (все его договоры)
   */
  async getAssignmentsForUser(userId, officeId) {
    const [rows] = await db.query(
      `SELECT
         ca.id AS assignment_id,
         ca.contract_id,
         ca.role AS assigned_role,
         ca.assignment_type,
         ca.status AS assignment_status,
         ca.assigned_at,
         c.contract_type,
         c.contract_number,
         c.title,
         c.description,
         c.amount,
         c.paid_amount,
         c.status AS contract_status,
         c.contract_date,
         c.needs_lawyer_input,
         c.docs_status,
         c.customer_goal,
         c.situation_description,
         COALESCE(cl.name, 'Неизвестный клиент') AS client_name,
         cl.phone AS client_phone,
         cl.email AS client_email,
         TRIM(CONCAT_WS(' ', emp.last_name, emp.first_name, emp.middle_name)) AS employee_name,
         CONCAT(rep_u.first_name, ' ', rep_u.last_name) AS representative_name
       FROM contract_assignments ca
       JOIN contracts c ON c.id = ca.contract_id
       LEFT JOIN clients cl ON cl.id = c.id_client
       LEFT JOIN employees emp ON emp.id = c.id_employee
       LEFT JOIN users rep_u ON rep_u.id = c.representative_id
       WHERE ca.user_id = ? AND c.office_id = ?
       ORDER BY ca.assigned_at DESC`,
      [userId, officeId]
    );
    return rows;
  },

  /**
   * Получить назначения для конкретного договора
   */
  async getAssignmentsForContract(contractId) {
    const [rows] = await db.query(
      `SELECT
         ca.*,
         TRIM(CONCAT_WS(' ', u.first_name, u.last_name)) AS user_name,
         u.role AS user_role
       FROM contract_assignments ca
       JOIN users u ON u.id = ca.user_id
       WHERE ca.contract_id = ?
       ORDER BY ca.assigned_at`,
      [contractId]
    );
    return rows;
  },

  /**
   * Ручное назначение представителя (менеджер назначает)
   */
  async assignRepresentative(contractId, representativeUserId) {
    const connection = await db.getClient();
    try {
      await connection.beginTransaction();

      // Обновляем representative_id в contracts
      await connection.query(
        'UPDATE contracts SET representative_id = ? WHERE id = ?',
        [representativeUserId, contractId]
      );

      // Получаем роль
      const [userRows] = await connection.query(
        'SELECT role FROM users WHERE id = ?',
        [representativeUserId]
      );
      const role = userRows.length > 0 ? userRows[0].role : 'representative';

      // Добавляем назначение
      await connection.query(
        `INSERT IGNORE INTO contract_assignments (contract_id, user_id, role, assignment_type)
         VALUES (?, ?, ?, 'manual')`,
        [contractId, representativeUserId, role]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Обновить статус назначения
   */
  async updateAssignmentStatus(assignmentId, status) {
    await db.query(
      'UPDATE contract_assignments SET status = ? WHERE id = ?',
      [status, assignmentId]
    );
  },
};

module.exports = contractAssignmentService;
