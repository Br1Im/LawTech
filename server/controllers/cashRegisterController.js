const CashRegister = require('../models/cashRegister');
const { ensureUserOffice, checkOfficeAccess, getUserOfficeIds } = require('../utils/ensureOffice');

const cashRegisterController = {
  async list(req, res) {
    try {
      const user = req.user;
      const officeId = req.query.office_id || user.office_id || (await ensureUserOffice(user));
      if (officeId) {
        const allowed = await checkOfficeAccess(user, officeId);
        if (!allowed) return res.status(403).json({ success: false, message: 'Доступ запрещен' });
      }
      const { date_from, date_to } = req.query;
      const rows = await CashRegister.list(officeId, date_from || null, date_to || null);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error listing cash register:', error);
      res.status(500).json({ success: false, message: 'Ошибка при загрузке кассы' });
    }
  },

  async totals(req, res) {
    try {
      const user = req.user;
      const officeId = req.query.office_id || user.office_id || (await ensureUserOffice(user));
      if (officeId) {
        const allowed = await checkOfficeAccess(user, officeId);
        if (!allowed) return res.status(403).json({ success: false, message: 'Доступ запрещен' });
      }
      const { date_from, date_to } = req.query;
      const rows = await CashRegister.dailyTotals(officeId, date_from || null, date_to || null);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error getting cash totals:', error);
      res.status(500).json({ success: false, message: 'Ошибка при получении итогов' });
    }
  },

  async create(req, res) {
    try {
      const user = req.user;
      const officeId = user.office_id || (await ensureUserOffice(user));
      const entry = await CashRegister.create({
        ...req.body,
        office_id: officeId,
        created_by: user.id,
      });
      res.json({ success: true, data: entry });
    } catch (error) {
      console.error('Error creating cash entry:', error);
      res.status(500).json({ success: false, message: 'Ошибка при создании записи' });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const entry = await CashRegister.update(id, req.body);
      if (!entry) return res.status(404).json({ success: false, message: 'Запись не найдена' });
      res.json({ success: true, data: entry });
    } catch (error) {
      console.error('Error updating cash entry:', error);
      res.status(500).json({ success: false, message: 'Ошибка при обновлении записи' });
    }
  },

  async stats(req, res) {
    try {
      const user = req.user;
      const officeId = req.query.office_id || user.office_id || (await ensureUserOffice(user));
      if (officeId) {
        const allowed = await checkOfficeAccess(user, officeId);
        if (!allowed) return res.status(403).json({ success: false, message: 'Доступ запрещен' });
      }
      const { date_from, date_to } = req.query;
      const data = await CashRegister.stats(officeId, date_from || null, date_to || null);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error getting cash stats:', error);
      res.status(500).json({ success: false, message: 'Ошибка при получении статистики' });
    }
  },

  async remove(req, res) {
    try {
      const { id } = req.params;
      await CashRegister.remove(id);
      res.json({ success: true, message: 'Удалено' });
    } catch (error) {
      console.error('Error removing cash entry:', error);
      res.status(500).json({ success: false, message: 'Ошибка при удалении записи' });
    }
  },
};

module.exports = cashRegisterController;
