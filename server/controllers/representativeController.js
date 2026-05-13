/**
 * Контроллер «Представитель» — ведение судебных дел и фиксация процессуальных действий.
 *
 * Представитель:
 * - Получает дела от менеджера/ОКК (contract_type = 'court_rep')
 * - Ведет их (фиксирует процессуальные действия в case_actions)
 * - Формирует акты
 *
 * Доступ к просмотру действий: ОКК, Директор, Менеджер
 */
const db = require('../db');

const ok = (res, data) => res.json({ success: true, data });
const bad = (res, code, message, err) => {
  if (err) console.error(message, err.message || err);
  return res.status(code).json({ success: false, message });
};

// Роли с доступом к просмотру всех дел и действий
const SUPERVISOR_ROLES = ['director', 'manager', 'okk', 'admin'];

const representativeController = {

  // ========== Мои дела (для представителя) ==========
  async getMyCases(req, res) {
    try {
      const user = req.user;
      const role = (user.role || '').toLowerCase();
      const isRepresentative = role === 'representative';
      const isSupervisor = SUPERVISOR_ROLES.includes(role);

      if (!isRepresentative && !isSupervisor) {
        return bad(res, 403, 'Нет доступа');
      }

      let where = "c.contract_type = 'court_rep'";
      const params = [];

      // Представитель видит только свои дела (назначенные ему)
      if (isRepresentative) {
        where += ' AND c.representative_id = ?';
        params.push(user.id);
      }

      // Фильтр по офису
      if (user.office_id) {
        where += ' AND c.office_id = ?';
        params.push(user.office_id);
      }

      const [rows] = await db.query(`
        SELECT
          c.id,
          c.id_client,
          c.id_employee,
          c.representative_id,
          c.contract_type,
          c.amount,
          c.paid_amount,
          c.additional_payment_amount,
          DATE_FORMAT(c.additional_payment_date, '%Y-%m-%d') AS additional_payment_date,
          c.status,
          c.title,
          c.description,
          c.customer_goal,
          c.situation_description,
          DATE_FORMAT(c.contract_date, '%Y-%m-%d') AS contract_date,
          DATE_FORMAT(c.start_date, '%Y-%m-%d') AS start_date,
          DATE_FORMAT(c.end_date, '%Y-%m-%d') AS end_date,
          c.created_at,
          CONCAT(cl.last_name, ' ', cl.first_name, ' ', COALESCE(cl.middle_name, '')) AS client_name,
          cl.phone AS client_phone,
          cl.email AS client_email,
          CONCAT(emp.first_name, ' ', emp.last_name) AS employee_name,
          CONCAT(rep.first_name, ' ', rep.last_name) AS representative_name,
          (SELECT COUNT(*) FROM case_actions ca WHERE ca.contract_id = c.id) AS actions_count
        FROM contracts c
        LEFT JOIN clients cl ON cl.id = c.id_client
        LEFT JOIN users emp ON emp.id = c.id_employee
        LEFT JOIN users rep ON rep.id = c.representative_id
        WHERE ${where}
        ORDER BY c.created_at DESC
      `, params);

      ok(res, rows);
    } catch (error) {
      bad(res, 500, 'Ошибка при получении дел', error);
    }
  },

  // ========== Детали дела ==========
  async getCaseDetail(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      const role = (user.role || '').toLowerCase();

      const [rows] = await db.query(`
        SELECT
          c.*,
          CONCAT(cl.last_name, ' ', cl.first_name, ' ', COALESCE(cl.middle_name, '')) AS client_name,
          cl.phone AS client_phone,
          cl.email AS client_email,
          CONCAT(emp.first_name, ' ', emp.last_name) AS employee_name,
          CONCAT(rep.first_name, ' ', rep.last_name) AS representative_name
        FROM contracts c
        LEFT JOIN clients cl ON cl.id = c.id_client
        LEFT JOIN users emp ON emp.id = c.id_employee
        LEFT JOIN users rep ON rep.id = c.representative_id
        WHERE c.id = ?
      `, [id]);

      if (rows.length === 0) {
        return bad(res, 404, 'Дело не найдено');
      }

      const contract = rows[0];

      // Проверка доступа
      if (role === 'representative') {
        if (contract.representative_id !== user.id) {
          return bad(res, 403, 'Нет доступа к этому делу');
        }
      }

      ok(res, contract);
    } catch (error) {
      bad(res, 500, 'Ошибка при получении дела', error);
    }
  },

  // ========== Процессуальные действия — список ==========
  async getCaseActions(req, res) {
    try {
      const { id } = req.params; // contract_id

      const [rows] = await db.query(`
        SELECT
          ca.id,
          ca.contract_id,
          ca.user_id,
          ca.action_type,
          ca.description,
          DATE_FORMAT(ca.action_date, '%Y-%m-%d') AS action_date,
          ca.created_at,
          CONCAT(u.first_name, ' ', u.last_name) AS user_name
        FROM case_actions ca
        LEFT JOIN users u ON u.id = ca.user_id
        WHERE ca.contract_id = ?
        ORDER BY ca.action_date DESC, ca.created_at DESC
      `, [id]);

      ok(res, rows);
    } catch (error) {
      bad(res, 500, 'Ошибка при получении действий', error);
    }
  },

  // ========== Добавить процессуальное действие ==========
  async addCaseAction(req, res) {
    try {
      const { id } = req.params; // contract_id
      const { action_type, description, action_date } = req.body;
      const user = req.user;

      if (!action_type || !action_date) {
        return bad(res, 400, 'Необходимо указать тип действия и дату');
      }

      // Проверяем что дело существует
      const [contracts] = await db.query('SELECT id, representative_id FROM contracts WHERE id = ?', [id]);
      if (contracts.length === 0) {
        return bad(res, 404, 'Дело не найдено');
      }

      // Представитель может добавлять действия только к своим делам
      const role = (user.role || '').toLowerCase();
      if (role === 'representative') {
        if (contracts[0].representative_id !== user.id) {
          return bad(res, 403, 'Нет доступа к этому делу');
        }
      }

      const [result] = await db.query(`
        INSERT INTO case_actions (contract_id, user_id, action_type, description, action_date)
        VALUES (?, ?, ?, ?, ?)
      `, [id, user.id, action_type, description || null, action_date]);

      // Вернуть созданную запись
      const [created] = await db.query(`
        SELECT ca.*, CONCAT(u.first_name, ' ', u.last_name) AS user_name
        FROM case_actions ca
        LEFT JOIN users u ON u.id = ca.user_id
        WHERE ca.id = ?
      `, [result.insertId]);

      ok(res, created[0]);
    } catch (error) {
      bad(res, 500, 'Ошибка при добавлении действия', error);
    }
  },

  // ========== Удалить процессуальное действие ==========
  async deleteCaseAction(req, res) {
    try {
      const { actionId } = req.params;
      const user = req.user;

      const [actions] = await db.query('SELECT * FROM case_actions WHERE id = ?', [actionId]);
      if (actions.length === 0) {
        return bad(res, 404, 'Действие не найдено');
      }

      // Только автор или руководство может удалять
      const role = (user.role || '').toLowerCase();
      if (actions[0].user_id !== user.id && !SUPERVISOR_ROLES.includes(role)) {
        return bad(res, 403, 'Нет прав на удаление');
      }

      await db.query('DELETE FROM case_actions WHERE id = ?', [actionId]);
      ok(res, { deleted: true });
    } catch (error) {
      bad(res, 500, 'Ошибка при удалении действия', error);
    }
  },

  // ========== Назначить дело представителю (для менеджера/ОКК) ==========
  async assignCase(req, res) {
    try {
      const { id } = req.params; // contract_id
      const { representative_id } = req.body;
      const user = req.user;
      const role = (user.role || '').toLowerCase();

      if (!SUPERVISOR_ROLES.includes(role)) {
        return bad(res, 403, 'Только руководство может назначать дела');
      }

      if (!representative_id) {
        return bad(res, 400, 'Укажите представителя');
      }

      // Проверяем что дело существует и является court_rep
      const [contracts] = await db.query(
        "SELECT * FROM contracts WHERE id = ? AND contract_type = 'court_rep'",
        [id]
      );
      if (contracts.length === 0) {
        return bad(res, 404, 'Дело не найдено или не является представительством в суде');
      }

      // Проверяем что представитель существует в users
      const [reps] = await db.query(
        "SELECT id, first_name, last_name FROM users WHERE id = ? AND role = 'representative'",
        [representative_id]
      );
      if (reps.length === 0) {
        return bad(res, 404, 'Представитель не найден');
      }

      await db.query(
        'UPDATE contracts SET representative_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [representative_id, id]
      );

      ok(res, {
        assigned: true,
        contract_id: parseInt(id),
        representative_id,
        representative_name: `${reps[0].first_name} ${reps[0].last_name}`
      });
    } catch (error) {
      bad(res, 500, 'Ошибка при назначении дела', error);
    }
  },

  // ========== Список представителей (для выбора при назначении) ==========
  async getRepresentatives(req, res) {
    try {
      const user = req.user;
      let officeFilter = '';
      const params = [];

      if (user.office_id) {
        officeFilter = ' AND u.office_id = ?';
        params.push(user.office_id);
      }

      const [rows] = await db.query(`
        SELECT u.id, u.first_name, u.last_name, u.phone, u.office_id,
          (SELECT COUNT(*) FROM contracts c WHERE c.representative_id = u.id AND c.contract_type = 'court_rep') AS cases_count
        FROM users u
        WHERE u.role = 'representative' AND u.is_active = 1${officeFilter}
        ORDER BY u.first_name, u.last_name
      `, params);
      ok(res, rows);
    } catch (error) {
      bad(res, 500, 'Ошибка при получении представителей', error);
    }
  }
};

module.exports = representativeController;
