const db = require('../db');
const { ensureUserOffice } = require('../utils/ensureOffice');

const applicationsController = {
  async list(req, res) {
    try {
      const user = req.user;
      const officeId = user.office_id || (await ensureUserOffice(user));
      const [rows] = await db.query(
        `SELECT * FROM applications WHERE office_id = ? ORDER BY created_at DESC`,
        [officeId]
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error listing applications:', error);
      res.status(500).json({ success: false, message: 'Ошибка при загрузке заявлений' });
    }
  },

  async create(req, res) {
    try {
      const user = req.user;
      const officeId = user.office_id || (await ensureUserOffice(user));
      const { client_name, topic, lawyer_name, comment } = req.body;
      const [result] = await db.query(
        `INSERT INTO applications (office_id, client_name, topic, lawyer_name, status, comment, created_by)
         VALUES (?, ?, ?, ?, 'new', ?, ?)`,
        [officeId, client_name, topic || null, lawyer_name || null, comment || null, user.id]
      );
      res.json({ success: true, data: { id: result.insertId } });
    } catch (error) {
      console.error('Error creating application:', error);
      res.status(500).json({ success: false, message: 'Ошибка при создании заявления' });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { client_name, topic, lawyer_name, status, comment } = req.body;
      await db.query(
        `UPDATE applications SET client_name=COALESCE(?,client_name), topic=COALESCE(?,topic),
         lawyer_name=COALESCE(?,lawyer_name), status=COALESCE(?,status), comment=COALESCE(?,comment) WHERE id=?`,
        [client_name, topic, lawyer_name, status, comment, id]
      );
      const [rows] = await db.query('SELECT * FROM applications WHERE id = ?', [id]);
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      console.error('Error updating application:', error);
      res.status(500).json({ success: false, message: 'Ошибка при обновлении' });
    }
  },

  async remove(req, res) {
    try {
      const { id } = req.params;
      await db.query('DELETE FROM applications WHERE id = ?', [id]);
      res.json({ success: true, message: 'Удалено' });
    } catch (error) {
      console.error('Error removing application:', error);
      res.status(500).json({ success: false, message: 'Ошибка при удалении' });
    }
  },
};

module.exports = applicationsController;
