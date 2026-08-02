const db = require('../db');

const MANAGE_ROLES = new Set(['director', 'manager', 'okk']);

function canManage(user) {
  return MANAGE_ROLES.has(String(user?.role || '').toLowerCase());
}

function cleanName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

module.exports = {
  async list(req, res) {
    try {
      const includeArchived = canManage(req.user) && String(req.query.include_archived || '') === '1';
      const [rows] = await db.query(
        `SELECT id, name, is_active, archived_at, created_at, updated_at
         FROM appointment_sources
         ${includeArchived ? '' : 'WHERE is_active = 1'}
         ORDER BY is_active DESC, name ASC`
      );
      return res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error listing appointment sources:', error);
      return res.status(500).json({ success: false, message: 'Не удалось загрузить источники записей' });
    }
  },

  async create(req, res) {
    if (!canManage(req.user)) {
      return res.status(403).json({ success: false, message: 'Нет прав для изменения источников' });
    }
    const name = cleanName(req.body?.name);
    if (!name || name.length > 100) {
      return res.status(400).json({ success: false, message: 'Название источника должно содержать от 1 до 100 символов' });
    }
    try {
      const [existing] = await db.query('SELECT id, is_active FROM appointment_sources WHERE name = ? LIMIT 1', [name]);
      if (existing.length) {
        if (!existing[0].is_active) {
          await db.query(
            'UPDATE appointment_sources SET is_active = 1, archived_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [existing[0].id]
          );
        }
        return res.status(200).json({ success: true, data: { id: existing[0].id }, restored: !existing[0].is_active });
      }
      const [result] = await db.query(
        'INSERT INTO appointment_sources (name, created_by) VALUES (?, ?)',
        [name, req.user?.id || null]
      );
      return res.status(201).json({ success: true, data: { id: result.insertId, name, is_active: 1 } });
    } catch (error) {
      console.error('Error creating appointment source:', error);
      return res.status(500).json({ success: false, message: 'Не удалось создать источник' });
    }
  },

  async update(req, res) {
    if (!canManage(req.user)) {
      return res.status(403).json({ success: false, message: 'Нет прав для изменения источников' });
    }
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Некорректный источник' });

    const updates = [];
    const params = [];
    if (req.body?.name !== undefined) {
      const name = cleanName(req.body.name);
      if (!name || name.length > 100) {
        return res.status(400).json({ success: false, message: 'Некорректное название источника' });
      }
      updates.push('name = ?');
      params.push(name);
    }
    if (req.body?.is_active !== undefined) {
      const active = req.body.is_active === true || req.body.is_active === 1 || req.body.is_active === '1';
      updates.push('is_active = ?', 'archived_at = ?');
      params.push(active ? 1 : 0, active ? null : new Date());
    }
    if (!updates.length) return res.status(400).json({ success: false, message: 'Нет изменений' });

    try {
      params.push(id);
      const [result] = await db.query(
        `UPDATE appointment_sources SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        params
      );
      if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Источник не найден' });
      const [rows] = await db.query(
        'SELECT id, name, is_active, archived_at, created_at, updated_at FROM appointment_sources WHERE id = ?',
        [id]
      );
      return res.json({ success: true, data: rows[0] });
    } catch (error) {
      console.error('Error updating appointment source:', error);
      return res.status(500).json({ success: false, message: 'Не удалось обновить источник' });
    }
  },
};
