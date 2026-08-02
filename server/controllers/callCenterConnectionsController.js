const db = require('../db');
const { generateUniqueConnectionCode } = require('../utils/callCenterCode');
const iconv = require('iconv-lite');

const normalizeCode = (value) => String(value || '').trim().toUpperCase();

// Some legacy rows were inserted after a latin1/UTF-8 client mismatch and are
// stored as mojibake (for example, "ÐšÐ¾Ð»Ð»..."). Repair those values at the
// API boundary so every role receives readable names, including old records.
const repairMojibake = (value) => {
  if (typeof value !== 'string' || !/[ÃÂÐÑ]/.test(value)) return value;
  try {
    // iconv-lite is used here because the bad rows contain Windows-1252
    // punctuation (for example `š` and `†`), which latin1 cannot round-trip.
    const repaired = iconv.decode(iconv.encode(value, 'win1252'), 'utf8');
    return repaired.includes('\uFFFD') ? value : repaired;
  } catch {
    return value;
  }
};

const repairCenterName = (row) => row && row.name
  ? { ...row, name: repairMojibake(row.name) }
  : row;

async function getMembership(userId) {
  const [rows] = await db.query(
    `SELECT cc.id, cc.public_id, cc.name, cc.phone, cc.owner_user_id,
            cc.connection_code, cc.code_rotated_at, ccm.member_role
       FROM call_center_members ccm
       JOIN call_centers cc ON cc.id = ccm.call_center_id
      WHERE ccm.user_id = ? AND cc.is_active = 1
      LIMIT 1`,
    [userId]
  );
  return repairCenterName(rows[0] || null);
}

async function assertDirectorOwnsOffice(user, officeId) {
  if (!user || String(user.role).toLowerCase() !== 'director') return false;
  const [rows] = await db.query(
    'SELECT id FROM offices WHERE id = ? AND owner_id = ? LIMIT 1',
    [Number(officeId), user.id]
  );
  return rows.length > 0;
}

const controller = {
  async getMine(req, res) {
    try {
      const center = await getMembership(req.user.id);
      if (!center) return res.status(404).json({ success: false, message: 'Колл-центр не найден' });

      const [offices] = await db.query(
        `SELECT occ.office_id, o.name AS office_name, NULL AS city, o.address,
                occ.connected_at
           FROM office_call_centers occ
           JOIN offices o ON o.id = occ.office_id
          WHERE occ.call_center_id = ? AND occ.is_active = 1
          ORDER BY o.name`,
        [center.id]
      );
      const [requests] = await db.query(
        `SELECT r.id, r.status, r.created_at, r.responded_at,
                o.id AS office_id, o.name AS office_name, NULL AS city, o.address,
                CONCAT_WS(' ', u.first_name, u.last_name) AS director_name
           FROM call_center_connection_requests r
           JOIN offices o ON o.id = r.office_id
           LEFT JOIN users u ON u.id = o.owner_id
          WHERE r.call_center_id = ?
          ORDER BY FIELD(r.status, 'pending', 'accepted', 'rejected'), r.created_at DESC`,
        [center.id]
      );
      const [history] = await db.query(
        `SELECT h.id, h.action, h.created_at, o.name AS office_name
           FROM call_center_connection_history h
           LEFT JOIN offices o ON o.id = h.office_id
          WHERE h.call_center_id = ?
          ORDER BY h.created_at DESC LIMIT 100`,
        [center.id]
      );
      const [rotations] = await db.query(
        `SELECT rotated_at FROM call_center_code_rotations
          WHERE call_center_id = ? ORDER BY rotated_at DESC LIMIT 50`,
        [center.id]
      );

      return res.json({ success: true, data: { center, offices, requests, history, rotations } });
    } catch (error) {
      console.error('get call center connections:', error);
      return res.status(500).json({ success: false, message: 'Не удалось загрузить подключения' });
    }
  },

  async rotateCode(req, res) {
    const connection = await db.getClient();
    try {
      const center = await getMembership(req.user.id);
      if (!center || !['chief', 'manager'].includes(center.member_role)) {
        return res.status(403).json({ success: false, message: 'Код может менять только начальник колл-центра' });
      }
      await connection.beginTransaction();
      const code = await generateUniqueConnectionCode(connection);
      await connection.query(
        'UPDATE call_centers SET connection_code = ?, code_rotated_at = NOW() WHERE id = ?',
        [code, center.id]
      );
      await connection.query(
        'INSERT INTO call_center_code_rotations (call_center_id, rotated_by) VALUES (?, ?)',
        [center.id, req.user.id]
      );
      await connection.commit();
      return res.json({ success: true, data: { connection_code: code, code_rotated_at: new Date() } });
    } catch (error) {
      await connection.rollback();
      console.error('rotate call center code:', error);
      return res.status(500).json({ success: false, message: 'Не удалось перевыпустить код' });
    } finally {
      connection.release();
    }
  },

  async lookup(req, res) {
    try {
      if (String(req.user?.role || '').toLowerCase() !== 'director') {
        return res.status(403).json({ success: false, message: 'Проверять код может только генеральный директор' });
      }
      const code = normalizeCode(req.body?.code);
      if (!code) return res.status(400).json({ success: false, message: 'Введите код подключения' });
      const [rows] = await db.query(
        `SELECT cc.id, cc.public_id, cc.name,
                CONCAT_WS(' ', u.first_name, u.last_name) AS chief_name
           FROM call_centers cc
           JOIN users u ON u.id = cc.owner_user_id
          WHERE UPPER(cc.connection_code) = ? AND cc.is_active = 1 LIMIT 1`,
        [code]
      );
      if (!rows.length) return res.status(404).json({ success: false, message: 'Колл-центр с таким кодом не найден' });
      return res.json({ success: true, data: repairCenterName(rows[0]) });
    } catch (error) {
      console.error('lookup call center:', error);
      return res.status(500).json({ success: false, message: 'Не удалось проверить код' });
    }
  },

  async requestConnection(req, res) {
    try {
      const officeId = Number(req.params.officeId);
      const callCenterId = Number(req.body?.call_center_id);
      if (!await assertDirectorOwnsOffice(req.user, officeId)) {
        return res.status(403).json({ success: false, message: 'Управлять подключением может только генеральный директор офиса' });
      }
      const [active] = await db.query(
        'SELECT id FROM office_call_centers WHERE office_id = ? AND call_center_id = ? AND is_active = 1 LIMIT 1',
        [officeId, callCenterId]
      );
      if (active.length) return res.status(409).json({ success: false, message: 'Этот колл-центр уже подключён' });
      const [pending] = await db.query(
        `SELECT id FROM call_center_connection_requests
          WHERE office_id = ? AND call_center_id = ? AND status = 'pending' LIMIT 1`,
        [officeId, callCenterId]
      );
      if (pending.length) return res.status(409).json({ success: false, message: 'Заявка уже ожидает подтверждения' });
      const [result] = await db.query(
        `INSERT INTO call_center_connection_requests
           (office_id, call_center_id, requested_by, status)
         VALUES (?, ?, ?, 'pending')`,
        [officeId, callCenterId, req.user.id]
      );
      await db.query(
        `INSERT INTO call_center_connection_history
           (office_id, call_center_id, action, actor_user_id)
         VALUES (?, ?, 'request_created', ?)`,
        [officeId, callCenterId, req.user.id]
      );
      return res.status(201).json({ success: true, data: { id: result.insertId, status: 'pending' } });
    } catch (error) {
      console.error('request call center connection:', error);
      return res.status(500).json({ success: false, message: 'Не удалось отправить заявку' });
    }
  },

  async listForOffice(req, res) {
    try {
      const officeId = Number(req.params.officeId);
      if (!await assertDirectorOwnsOffice(req.user, officeId)) {
        return res.status(403).json({ success: false, message: 'Нет доступа к офису' });
      }
      const [connections] = await db.query(
        `SELECT cc.id, cc.public_id, cc.name, occ.connected_at
           FROM office_call_centers occ
           JOIN call_centers cc ON cc.id = occ.call_center_id
          WHERE occ.office_id = ? AND occ.is_active = 1 ORDER BY cc.name`,
        [officeId]
      );
      const [requests] = await db.query(
        `SELECT r.id, r.status, r.created_at, cc.id AS call_center_id, cc.name
           FROM call_center_connection_requests r
           JOIN call_centers cc ON cc.id = r.call_center_id
          WHERE r.office_id = ? AND r.status = 'pending' ORDER BY r.created_at DESC`,
        [officeId]
      );
      return res.json({
        success: true,
        data: {
          connections: connections.map(repairCenterName),
          requests: requests.map(repairCenterName),
        },
      });
    } catch (error) {
      console.error('list office call centers:', error);
      return res.status(500).json({ success: false, message: 'Не удалось загрузить колл-центры офиса' });
    }
  },

  async respond(req, res) {
    const connection = await db.getClient();
    try {
      const center = await getMembership(req.user.id);
      if (!center || !['chief', 'manager'].includes(center.member_role)) {
        return res.status(403).json({ success: false, message: 'Заявки подтверждает начальник колл-центра' });
      }
      const decision = req.params.decision;
      if (!['accept', 'reject'].includes(decision)) {
        return res.status(400).json({ success: false, message: 'Некорректное решение' });
      }
      await connection.beginTransaction();
      const [rows] = await connection.query(
        `SELECT * FROM call_center_connection_requests
          WHERE id = ? AND call_center_id = ? AND status = 'pending' FOR UPDATE`,
        [Number(req.params.id), center.id]
      );
      if (!rows.length) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Активная заявка не найдена' });
      }
      const request = rows[0];
      const status = decision === 'accept' ? 'accepted' : 'rejected';
      await connection.query(
        `UPDATE call_center_connection_requests
            SET status = ?, responded_by = ?, responded_at = NOW()
          WHERE id = ?`,
        [status, req.user.id, request.id]
      );
      if (decision === 'accept') {
        await connection.query(
          `INSERT INTO office_call_centers
             (office_id, call_center_id, is_active, connected_at, disconnected_at, connected_by)
           VALUES (?, ?, 1, NOW(), NULL, ?)
           ON DUPLICATE KEY UPDATE is_active = 1, connected_at = NOW(), disconnected_at = NULL, connected_by = VALUES(connected_by)`,
          [request.office_id, center.id, req.user.id]
        );
      }
      await connection.query(
        `INSERT INTO call_center_connection_history
           (office_id, call_center_id, action, actor_user_id)
         VALUES (?, ?, ?, ?)`,
        [request.office_id, center.id, decision === 'accept' ? 'connected' : 'request_rejected', req.user.id]
      );
      await connection.commit();
      return res.json({ success: true, data: { status } });
    } catch (error) {
      await connection.rollback();
      console.error('respond call center request:', error);
      return res.status(500).json({ success: false, message: 'Не удалось обработать заявку' });
    } finally {
      connection.release();
    }
  },

  async disconnect(req, res) {
    try {
      const officeId = Number(req.params.officeId);
      const callCenterId = Number(req.params.callCenterId);
      if (!await assertDirectorOwnsOffice(req.user, officeId)) {
        return res.status(403).json({ success: false, message: 'Нет доступа к офису' });
      }
      const [result] = await db.query(
        `UPDATE office_call_centers SET is_active = 0, disconnected_at = NOW()
          WHERE office_id = ? AND call_center_id = ? AND is_active = 1`,
        [officeId, callCenterId]
      );
      if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Подключение не найдено' });
      await db.query(
        `INSERT INTO call_center_connection_history
           (office_id, call_center_id, action, actor_user_id)
         VALUES (?, ?, 'disconnected', ?)`,
        [officeId, callCenterId, req.user.id]
      );
      return res.json({ success: true });
    } catch (error) {
      console.error('disconnect call center:', error);
      return res.status(500).json({ success: false, message: 'Не удалось отключить колл-центр' });
    }
  }
};

module.exports = controller;
