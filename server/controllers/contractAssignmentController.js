const contractAssignmentService = require('../services/contractAssignmentService');
const db = require('../db');

const ok = (res, data) => res.json({ success: true, data });
const bad = (res, code, message, err) => {
  if (err) console.error(message, err.message || err);
  return res.status(code).json({ success: false, message });
};

const contractAssignmentController = {

  /**
   * Получить назначенные мне договоры (Мои назначения)
   */
  async getMyAssignments(req, res) {
    try {
      const user = req.user;
      if (!user.office_id) {
        return ok(res, []);
      }
      const rows = await contractAssignmentService.getAssignmentsForUser(user.id, user.office_id);
      ok(res, rows);
    } catch (error) {
      bad(res, 500, 'Ошибка при получении назначений', error);
    }
  },

  /**
   * Получить назначения конкретного договора
   */
  async getContractAssignments(req, res) {
    try {
      const { contractId } = req.params;
      const rows = await contractAssignmentService.getAssignmentsForContract(contractId);
      ok(res, rows);
    } catch (error) {
      bad(res, 500, 'Ошибка при получении назначений', error);
    }
  },

  /**
   * Менеджер назначает представителя на дело
   */
  async assignRepresentative(req, res) {
    try {
      const user = req.user;
      if (!['manager', 'director', 'okk'].includes(user.role)) {
        return bad(res, 403, 'Только менеджер, ОКК или директор может назначить представителя');
      }
      const { contractId } = req.params;
      const { representative_id } = req.body;
      if (!representative_id) {
        return bad(res, 400, 'Укажите representative_id');
      }
      await contractAssignmentService.assignRepresentative(contractId, representative_id);
      ok(res, { message: 'Представитель назначен' });
    } catch (error) {
      bad(res, 500, 'Ошибка при назначении представителя', error);
    }
  },

  /**
   * Юрист дополняет данные по договору (предзаполненные админом)
   */
  async supplementContract(req, res) {
    try {
      const user = req.user;
      const { contractId } = req.params;
      const {
        title, description, customer_goal, situation_description,
        expert_id, expert_deadline_days, expert_deadline, legal_cost_comp, moral_comp,
        custom_documents, circumstances,
      } = req.body;

      // Проверяем что договор назначен этому пользователю
      const [assignments] = await db.query(
        'SELECT id FROM contract_assignments WHERE contract_id = ? AND user_id = ?',
        [contractId, user.id]
      );
      if (assignments.length === 0 && !['director', 'manager', 'okk', 'admin'].includes(user.role)) {
        return bad(res, 403, 'Нет доступа к этому договору');
      }

      const sets = [];
      const params = [];

      if (title !== undefined) { sets.push('title = ?'); params.push(title); }
      if (description !== undefined) { sets.push('description = ?'); params.push(description); }
      if (customer_goal !== undefined) { sets.push('customer_goal = ?'); params.push(customer_goal); }
      if (situation_description !== undefined) { sets.push('situation_description = ?'); params.push(situation_description); }
      if (expert_id !== undefined) { sets.push('expert_id = ?'); params.push(expert_id || null); }
      // Срок выполнения: явная дата имеет приоритет, иначе считаем от сегодня + кол-во дней
      let deadlineHandled = false;
      if (expert_deadline !== undefined) {
        sets.push('expert_deadline = ?'); params.push(expert_deadline || null);
        deadlineHandled = true;
      }
      if (expert_deadline_days !== undefined) {
        sets.push('expert_deadline_days = ?'); params.push(expert_deadline_days);
        if (!deadlineHandled) {
          if (expert_deadline_days !== null && expert_deadline_days !== '') {
            sets.push('expert_deadline = DATE_ADD(CURDATE(), INTERVAL ? DAY)'); params.push(Number(expert_deadline_days));
          } else {
            sets.push('expert_deadline = NULL');
          }
        }
      }
      if (legal_cost_comp !== undefined) { sets.push('legal_cost_comp = ?'); params.push(legal_cost_comp); }
      if (moral_comp !== undefined) { sets.push('moral_comp = ?'); params.push(moral_comp); }
      if (req.body.document_types !== undefined) { sets.push('document_types = ?'); params.push(JSON.stringify(req.body.document_types)); }
      if (custom_documents !== undefined) { sets.push('custom_documents = ?'); params.push(JSON.stringify(custom_documents)); }
      if (circumstances !== undefined) { sets.push('circumstances = ?'); params.push(circumstances); }

      // Снимаем флаг needs_lawyer_input
      sets.push('needs_lawyer_input = 0');

      if (sets.length === 0) {
        return bad(res, 400, 'Нет данных для обновления');
      }

      params.push(contractId);
      await db.query(`UPDATE contracts SET ${sets.join(', ')} WHERE id = ?`, params);

      ok(res, { message: 'Договор дополнен' });
    } catch (error) {
      bad(res, 500, 'Ошибка при дополнении договора', error);
    }
  },

  /**
   * Обновить статус назначения
   */
  async updateAssignmentStatus(req, res) {
    try {
      const { assignmentId } = req.params;
      const { status } = req.body;
      if (!['pending', 'in_progress', 'completed'].includes(status)) {
        return bad(res, 400, 'Допустимые статусы: pending, in_progress, completed');
      }
      await contractAssignmentService.updateAssignmentStatus(assignmentId, status);
      ok(res, { message: 'Статус обновлён' });
    } catch (error) {
      bad(res, 500, 'Ошибка при обновлении статуса', error);
    }
  },
};

module.exports = contractAssignmentController;
