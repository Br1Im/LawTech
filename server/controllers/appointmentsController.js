const db = require('../db');

const appointmentsController = {
  /**
   * Получить все записи на консультации для офиса текущего пользователя
   */
  async getAppointments(req, res) {
    try {
      const officeId = req.user.office_id;
      if (!officeId) {
        return res.status(400).json({
          success: false,
          message: 'Пользователь не привязан к офису'
        });
      }

      const { date, status } = req.query;

      let sql = `
        SELECT
          a.id,
          a.office_id,
          a.lead_id,
          a.client_id,
          a.client_name,
          a.client_phone,
          a.source,
          a.appointment_date,
          a.appointment_time,
          a.comment,
          a.operator_id,
          a.operator_name,
          a.status,
          a.manager_comment,
          a.assigned_lawyer_id,
          a.created_at,
          a.updated_at,
          u.first_name AS operator_first_name,
          u.last_name AS operator_last_name
        FROM appointments a
        LEFT JOIN users u ON a.operator_id = u.id
        WHERE a.office_id = ?
      `;
      const params = [officeId];

      if (date) {
        sql += ' AND a.appointment_date = ?';
        params.push(date);
      }

      if (status) {
        sql += ' AND a.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY a.appointment_date ASC, a.appointment_time ASC';

      const [rows] = await db.query(sql, params);

      res.json({
        success: true,
        data: rows
      });
    } catch (error) {
      console.error('Error fetching appointments:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении записей'
      });
    }
  },

  /**
   * Обновить статус записи (например, отметить приход клиента)
   */
  async updateAppointmentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, manager_comment } = req.body;
      const officeId = req.user.office_id;

      if (!officeId) {
        return res.status(400).json({
          success: false,
          message: 'Пользователь не привязан к офису'
        });
      }

      const validStatuses = ['waiting', 'arrived', 'no_show', 'cancelled'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Недопустимый статус'
        });
      }

      const updates = [];
      const params = [];

      if (status) {
        updates.push('status = ?');
        params.push(status);
      }

      if (manager_comment !== undefined) {
        updates.push('manager_comment = ?');
        params.push(manager_comment);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Нет данных для обновления'
        });
      }

      params.push(id, officeId);

      await db.query(
        `UPDATE appointments SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND office_id = ?`,
        params
      );

      const [rows] = await db.query(
        'SELECT * FROM appointments WHERE id = ? AND office_id = ?',
        [id, officeId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Запись не найдена'
        });
      }

      res.json({
        success: true,
        message: 'Статус записи обновлён',
        data: rows[0]
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при обновлении записи'
      });
    }
  }
};

module.exports = appointmentsController;
