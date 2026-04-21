const db = require('../db');

const LEAD_STATUSES = [
  'NEW',
  'IN_PROGRESS',
  'NO_ANSWER',
  'CALL_BACK',
  'INTERESTED',
  'REJECTED',
  'CLOSED'
];

const CALL_RESULTS = [
  'NO_ANSWER',
  'CALL_BACK',
  'INTERESTED',
  'REJECTED',
  'CLOSED',
  'FAILED'
];

const STATUS_TRANSITIONS = {
  NEW: ['IN_PROGRESS', 'NO_ANSWER', 'CALL_BACK', 'INTERESTED', 'REJECTED', 'CLOSED'],
  IN_PROGRESS: ['NO_ANSWER', 'CALL_BACK', 'INTERESTED', 'REJECTED', 'CLOSED'],
  NO_ANSWER: ['CALL_BACK', 'IN_PROGRESS', 'INTERESTED', 'REJECTED', 'CLOSED'],
  CALL_BACK: ['IN_PROGRESS', 'NO_ANSWER', 'INTERESTED', 'REJECTED', 'CLOSED'],
  INTERESTED: ['CLOSED', 'REJECTED'],
  REJECTED: [],
  CLOSED: []
};

const ACTIVE_STATUSES = ['NEW', 'IN_PROGRESS', 'NO_ANSWER', 'CALL_BACK', 'INTERESTED'];
const OPERATOR_ROLES = ['manager', 'okk', 'admin', 'director'];

const normalizePhone = (value = '') => value.replace(/\D/g, '');

const clampScore = (score) => Math.max(0, Math.min(100, Math.round(score)));

const mapCallResultToStatus = (result) => {
  switch (result) {
    case 'NO_ANSWER':
      return 'NO_ANSWER';
    case 'CALL_BACK':
      return 'CALL_BACK';
    case 'INTERESTED':
      return 'INTERESTED';
    case 'REJECTED':
      return 'REJECTED';
    case 'CLOSED':
      return 'CLOSED';
    default:
      return 'IN_PROGRESS';
  }
};

const computeLeadScore = ({ source, description, created_at }) => {
  let score = 20;

  const sourceWeights = {
    website: 35,
    referral: 30,
    ads: 22,
    call: 25,
    form: 20,
    telegram: 18
  };

  const normalizedSource = String(source || '').trim().toLowerCase();
  score += sourceWeights[normalizedSource] ?? 15;

  const descriptionLength = String(description || '').trim().length;
  if (descriptionLength >= 200) {
    score += 25;
  } else if (descriptionLength >= 80) {
    score += 18;
  } else if (descriptionLength >= 20) {
    score += 10;
  } else if (descriptionLength > 0) {
    score += 4;
  }

  const createdAt = created_at ? new Date(created_at) : new Date();
  const ageHours = Math.max(0, (Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
  if (ageHours <= 1) {
    score += 20;
  } else if (ageHours <= 6) {
    score += 12;
  } else if (ageHours <= 24) {
    score += 6;
  }

  return clampScore(score);
};

const appendDescription = (currentDescription, incomingDescription) => {
  const current = String(currentDescription || '').trim();
  const incoming = String(incomingDescription || '').trim();

  if (!incoming) {
    return current || null;
  }

  if (!current) {
    return incoming;
  }

  if (current.includes(incoming)) {
    return current;
  }

  return `${current}\n\n${incoming}`;
};

const buildLeadWhereClause = (officeId, filters = {}) => {
  const conditions = ['l.office_id = ?'];
  const params = [officeId];

  if (filters.status) {
    conditions.push('l.status = ?');
    params.push(filters.status);
  }

  if (filters.assigned_to === 'me' && filters.userId) {
    conditions.push('l.assigned_to = ?');
    params.push(filters.userId);
  } else if (filters.assigned_to) {
    conditions.push('l.assigned_to = ?');
    params.push(filters.assigned_to);
  }

  if (filters.search) {
    conditions.push('(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.description LIKE ?)');
    const pattern = `%${filters.search}%`;
    params.push(pattern, pattern, pattern, pattern);
  }

  return {
    whereSql: conditions.join(' AND '),
    params
  };
};

const addHistoryEntry = async (connection, leadId, action, userId = null, details = null) => {
  await connection.query(
    'INSERT INTO call_center_history (lead_id, action, user_id, details) VALUES (?, ?, ?, ?)',
    [leadId, action, userId, details ? JSON.stringify(details) : null]
  );
};

const recalculateOperatorLoad = async (connection, officeId) => {
  await connection.query(
    `UPDATE call_center_operator_status s
     LEFT JOIN (
       SELECT assigned_to, COUNT(*) AS active_load
       FROM call_center_leads
       WHERE office_id = ? AND assigned_to IS NOT NULL AND status IN (${ACTIVE_STATUSES.map(() => '?').join(', ')})
       GROUP BY assigned_to
     ) loads ON loads.assigned_to = s.user_id
     SET s.current_load = COALESCE(loads.active_load, 0)
     WHERE s.office_id = ?`,
    [officeId, ...ACTIVE_STATUSES, officeId]
  );
};

const getEligibleOperators = async (connection, officeId) => {
  const [operators] = await connection.query(
    `SELECT
       u.id,
       u.first_name,
       u.last_name,
       u.email,
       u.role,
       COALESCE(s.is_online, 0) AS is_online,
       COALESCE(s.current_load, 0) AS current_load,
       s.last_assigned_at
     FROM users u
     LEFT JOIN call_center_operator_status s
       ON s.user_id = u.id AND s.office_id = u.office_id
     WHERE u.office_id = ?
       AND (
         u.role IN (${OPERATOR_ROLES.map(() => '?').join(', ')})
         OR NOT EXISTS (
           SELECT 1
           FROM users alt
           WHERE alt.office_id = u.office_id
             AND alt.role IN (${OPERATOR_ROLES.map(() => '?').join(', ')})
         )
       )
     ORDER BY COALESCE(s.is_online, 0) DESC, COALESCE(s.current_load, 0) ASC, s.last_assigned_at ASC, u.id ASC`,
    [officeId, ...OPERATOR_ROLES, ...OPERATOR_ROLES]
  );

  return operators;
};

const assignLead = async (connection, leadId, officeId) => {
  await recalculateOperatorLoad(connection, officeId);
  const operators = await getEligibleOperators(connection, officeId);
  const availableOperator = operators.find((operator) => Number(operator.is_online) === 1) || operators[0];

  if (!availableOperator) {
    return null;
  }

  await connection.query(
    'UPDATE call_center_leads SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [availableOperator.id, leadId]
  );

  await connection.query(
    `INSERT INTO call_center_operator_status (user_id, office_id, is_online, current_load, last_seen_at, last_assigned_at)
     VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
       office_id = VALUES(office_id),
       last_assigned_at = CURRENT_TIMESTAMP,
       last_seen_at = CURRENT_TIMESTAMP`,
    [availableOperator.id, officeId, Number(availableOperator.is_online) === 1 ? 1 : 0]
  );

  await recalculateOperatorLoad(connection, officeId);
  await addHistoryEntry(connection, leadId, 'ASSIGNED', availableOperator.id, {
    assigned_to: availableOperator.id
  });

  return availableOperator.id;
};

const findDuplicateLead = async (connection, { officeId, source, externalId, phone, email }) => {
  const normalizedPhone = normalizePhone(phone);
  const matchers = [];
  const params = [officeId];

  if (source && externalId) {
    matchers.push('(source = ? AND external_id = ?)');
    params.push(source, externalId);
  }

  if (normalizedPhone) {
    matchers.push("REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, '+', ''), '-', ''), '(', ''), ')', ''), ' ', '') = ?");
    params.push(normalizedPhone);
  }

  if (email) {
    matchers.push('LOWER(email) = LOWER(?)');
    params.push(email);
  }

  if (matchers.length === 0) {
    return null;
  }

  const [rows] = await connection.query(
    `SELECT *
     FROM call_center_leads
     WHERE office_id = ?
       AND (${matchers.join(' OR ')})
     ORDER BY id DESC
     LIMIT 1`,
    params
  );

  return rows[0] || null;
};

const getLeadDetails = async (connection, leadId, officeId) => {
  const [leadRows] = await connection.query(
    `SELECT
       l.*,
       CONCAT(u.first_name, ' ', u.last_name) AS assigned_to_name
     FROM call_center_leads l
     LEFT JOIN users u ON u.id = l.assigned_to
     WHERE l.id = ? AND l.office_id = ?`,
    [leadId, officeId]
  );

  if (leadRows.length === 0) {
    return null;
  }

  const lead = leadRows[0];
  const [calls] = await connection.query(
    `SELECT
       c.*,
       CONCAT(u.first_name, ' ', u.last_name) AS user_name
     FROM call_center_calls c
     LEFT JOIN users u ON u.id = c.user_id
     WHERE c.lead_id = ?
     ORDER BY c.created_at DESC`,
    [leadId]
  );
  const [history] = await connection.query(
    `SELECT
       h.*,
       CONCAT(u.first_name, ' ', u.last_name) AS user_name
     FROM call_center_history h
     LEFT JOIN users u ON u.id = h.user_id
     WHERE h.lead_id = ?
     ORDER BY h.created_at DESC`,
    [leadId]
  );

  return {
    ...lead,
    calls,
    history,
    response_time_minutes: lead.first_call_at
      ? Math.round((new Date(lead.first_call_at).getTime() - new Date(lead.created_at).getTime()) / 60000)
      : null
  };
};

const ensureOfficeAccess = async (req, res) => {
  // Если в токене есть office_id, используем его
  if (req.user?.office_id) {
    return true;
  }

  // Если в токене нет office_id, пробуем получить его из БД (могло обновиться после создания офиса)
  try {
    const [users] = await db.query('SELECT office_id, role FROM users WHERE id = ?', [req.user.id]);
    if (users.length > 0 && users[0].office_id) {
      // Обновляем данные в объекте запроса
      req.user.office_id = users[0].office_id;
      req.user.role = users[0].role;
      return true;
    }
  } catch (error) {
    console.error('Error checking office access in DB:', error);
  }

  res.status(403).json({
    success: false,
    message: 'Пользователь не привязан к офису'
  });
  return false;
};

const callCenterController = {
  async receiveIncomingLead(req, res) {
    const connection = await db.getClient();

    try {
      const {
        office_id,
        officeId,
        source,
        external_id,
        externalId,
        name,
        phone,
        email,
        description,
        created_at,
        metadata
      } = req.body;

      const targetOfficeId = office_id || officeId || req.user?.office_id;

      if (!targetOfficeId || !source || !name) {
        return res.status(400).json({
          success: false,
          message: 'Необходимо указать office_id, source и name'
        });
      }

      await connection.beginTransaction();

      const duplicateLead = await findDuplicateLead(connection, {
        officeId: targetOfficeId,
        source,
        externalId: external_id || externalId,
        phone,
        email
      });

      if (duplicateLead) {
        const mergedDescription = appendDescription(duplicateLead.description, description);
        const recalculatedScore = clampScore(Math.max(
          duplicateLead.score || 0,
          computeLeadScore({ source, description: mergedDescription, created_at: created_at || duplicateLead.created_at })
        ));

        await connection.query(
          `UPDATE call_center_leads
           SET
             name = COALESCE(NULLIF(?, ''), name),
             phone = COALESCE(NULLIF(?, ''), phone),
             email = COALESCE(NULLIF(?, ''), email),
             description = ?,
             score = ?,
             metadata = COALESCE(?, metadata),
             updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            name,
            phone,
            email,
            mergedDescription,
            recalculatedScore,
            metadata ? JSON.stringify(metadata) : null,
            duplicateLead.id
          ]
        );

        await addHistoryEntry(connection, duplicateLead.id, 'MERGED_DUPLICATE', null, {
          source,
          external_id: external_id || externalId || null
        });

        await connection.commit();

        const lead = await getLeadDetails(connection, duplicateLead.id, targetOfficeId);
        return res.status(200).json({
          success: true,
          message: 'Лид объединён с существующим',
          duplicate: true,
          data: lead
        });
      }

      const score = computeLeadScore({ source, description, created_at });
      const [result] = await connection.query(
        `INSERT INTO call_center_leads (
          office_id, source, external_id, name, phone, email, description, status, score, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
        [
          targetOfficeId,
          source,
          external_id || externalId || null,
          name,
          phone || null,
          email || null,
          description || null,
          score,
          metadata ? JSON.stringify(metadata) : null,
          created_at || null
        ]
      );

      await addHistoryEntry(connection, result.insertId, 'LEAD_CREATED', null, { source });
      const assignedTo = await assignLead(connection, result.insertId, targetOfficeId);

      await connection.commit();

      const lead = await getLeadDetails(connection, result.insertId, targetOfficeId);
      return res.status(201).json({
        success: true,
        message: assignedTo ? 'Лид принят и назначен оператору' : 'Лид принят и ожидает назначения',
        data: lead
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error receiving incoming lead:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при приёме лида'
      });
    } finally {
      connection.release();
    }
  },

  async getLeads(req, res) {
    if (!await ensureOfficeAccess(req, res)) {
      return;
    }

    try {
      const { status, assigned_to, search } = req.query;
      const { whereSql, params } = buildLeadWhereClause(req.user.office_id, {
        status,
        assigned_to,
        search,
        userId: req.user.id
      });

      const [leads] = await db.query(
        `SELECT
           l.*,
           CONCAT(u.first_name, ' ', u.last_name) AS assigned_to_name,
           (
             SELECT COUNT(*)
             FROM call_center_calls c
             WHERE c.lead_id = l.id
           ) AS calls_count
         FROM call_center_leads l
         LEFT JOIN users u ON u.id = l.assigned_to
         WHERE ${whereSql}
         ORDER BY
           FIELD(l.status, 'NEW', 'CALL_BACK', 'NO_ANSWER', 'IN_PROGRESS', 'INTERESTED', 'REJECTED', 'CLOSED'),
           l.score DESC,
           l.created_at DESC`,
        params
      );

      res.json({
        success: true,
        data: leads
      });
    } catch (error) {
      console.error('Error getting leads:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении лидов'
      });
    }
  },

  async getLeadById(req, res) {
    if (!await ensureOfficeAccess(req, res)) {
      return;
    }

    const connection = await db.getClient();

    try {
      const lead = await getLeadDetails(connection, req.params.id, req.user.office_id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Лид не найден'
        });
      }

      res.json({
        success: true,
        data: lead
      });
    } catch (error) {
      console.error('Error getting lead details:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении лида'
      });
    } finally {
      connection.release();
    }
  },

  async updateLead(req, res) {
    if (!await ensureOfficeAccess(req, res)) {
      return;
    }

    const connection = await db.getClient();

    try {
      const { id } = req.params;
      const {
        status,
        assigned_to,
        next_call_at,
        comment,
        name,
        phone,
        email,
        description
      } = req.body;

      await connection.beginTransaction();

      const [leadRows] = await connection.query(
        'SELECT * FROM call_center_leads WHERE id = ? AND office_id = ?',
        [id, req.user.office_id]
      );

      if (leadRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Лид не найден'
        });
      }

      const lead = leadRows[0];
      const updates = [];
      const params = [];

      if (status) {
        if (!LEAD_STATUSES.includes(status)) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'Недопустимый статус лида'
          });
        }

        if (lead.status !== status && !(STATUS_TRANSITIONS[lead.status] || []).includes(status)) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: `Переход из ${lead.status} в ${status} не разрешён`
          });
        }

        updates.push('status = ?');
        params.push(status);
      }

      if (assigned_to !== undefined) {
        updates.push('assigned_to = ?');
        params.push(assigned_to || null);
      }

      if (next_call_at !== undefined) {
        updates.push('next_call_at = ?');
        params.push(next_call_at || null);
      }

      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name || lead.name);
      }

      if (phone !== undefined) {
        updates.push('phone = ?');
        params.push(phone || null);
      }

      if (email !== undefined) {
        updates.push('email = ?');
        params.push(email || null);
      }

      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description || null);
      }

      if (updates.length > 0) {
        await connection.query(
          `UPDATE call_center_leads SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [...params, id]
        );
      }

      if (assigned_to !== undefined) {
        await addHistoryEntry(connection, id, 'ASSIGNED', req.user.id, {
          assigned_to: assigned_to || null
        });
        await recalculateOperatorLoad(connection, req.user.office_id);
      }

      if (status && status !== lead.status) {
        await addHistoryEntry(connection, id, 'STATUS_CHANGED', req.user.id, {
          from: lead.status,
          to: status,
          comment: comment || null
        });
      }

      await connection.commit();

      const updatedLead = await getLeadDetails(connection, id, req.user.office_id);
      res.json({
        success: true,
        message: 'Лид обновлён',
        data: updatedLead
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error updating lead:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при обновлении лида'
      });
    } finally {
      connection.release();
    }
  },

  async createCall(req, res) {
    if (!await ensureOfficeAccess(req, res)) {
      return;
    }

    const connection = await db.getClient();

    try {
      const { lead_id, result, comment, next_call_at } = req.body;

      if (!lead_id || !result) {
        return res.status(400).json({
          success: false,
          message: 'Необходимо указать lead_id и result'
        });
      }

      if (!CALL_RESULTS.includes(result)) {
        return res.status(400).json({
          success: false,
          message: 'Недопустимый результат звонка'
        });
      }

      await connection.beginTransaction();

      const [leadRows] = await connection.query(
        'SELECT * FROM call_center_leads WHERE id = ? AND office_id = ?',
        [lead_id, req.user.office_id]
      );

      if (leadRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Лид не найден'
        });
      }

      const lead = leadRows[0];
      const nextStatus = mapCallResultToStatus(result);

      await connection.query(
        'INSERT INTO call_center_calls (lead_id, user_id, result, comment) VALUES (?, ?, ?, ?)',
        [lead_id, req.user.id, result, comment || null]
      );

      await connection.query(
        `UPDATE call_center_leads
         SET
           status = ?,
           first_call_at = COALESCE(first_call_at, CURRENT_TIMESTAMP),
           last_call_at = CURRENT_TIMESTAMP,
           next_call_at = ?,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [nextStatus, next_call_at || null, lead_id]
      );

      await addHistoryEntry(connection, lead_id, 'CALL_LOGGED', req.user.id, {
        result,
        comment: comment || null,
        previous_status: lead.status,
        next_status: nextStatus
      });

      await recalculateOperatorLoad(connection, req.user.office_id);
      await connection.commit();

      const updatedLead = await getLeadDetails(connection, lead_id, req.user.office_id);
      res.status(201).json({
        success: true,
        message: 'Звонок сохранён',
        data: updatedLead
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error logging call:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при сохранении звонка'
      });
    } finally {
      connection.release();
    }
  },

  async getDashboard(req, res) {
    if (!await ensureOfficeAccess(req, res)) {
      return;
    }

    try {
      const officeId = req.user.office_id;
      const [statusRows] = await db.query(
        `SELECT status, COUNT(*) AS total
         FROM call_center_leads
         WHERE office_id = ?
         GROUP BY status`,
        [officeId]
      );

      const [slaRows] = await db.query(
        `SELECT
           COUNT(*) AS total_leads,
           SUM(CASE WHEN first_call_at IS NOT NULL THEN 1 ELSE 0 END) AS contacted_leads,
           AVG(
             CASE
               WHEN first_call_at IS NOT NULL
                 THEN TIMESTAMPDIFF(MINUTE, created_at, first_call_at)
               ELSE NULL
             END
           ) AS avg_response_time_minutes,
           SUM(
             CASE
               WHEN first_call_at IS NULL
                 AND TIMESTAMPDIFF(MINUTE, created_at, NOW()) > 30
                 THEN 1
               ELSE 0
             END
           ) AS overdue_leads
         FROM call_center_leads
         WHERE office_id = ?`,
        [officeId]
      );

      const [operatorRows] = await db.query(
        `SELECT
           u.id,
           CONCAT(u.first_name, ' ', u.last_name) AS name,
           u.role,
           COALESCE(s.is_online, 0) AS is_online,
           COALESCE(s.current_load, 0) AS current_load,
           COUNT(DISTINCT l.id) AS total_leads,
           SUM(CASE WHEN l.status = 'CLOSED' THEN 1 ELSE 0 END) AS closed_leads
         FROM users u
         LEFT JOIN call_center_operator_status s
           ON s.user_id = u.id AND s.office_id = u.office_id
         LEFT JOIN call_center_leads l
           ON l.assigned_to = u.id AND l.office_id = u.office_id
         WHERE u.office_id = ?
         GROUP BY u.id, u.first_name, u.last_name, u.role, s.is_online, s.current_load
         ORDER BY COALESCE(s.is_online, 0) DESC, COALESCE(s.current_load, 0) ASC, name ASC`,
        [officeId]
      );

      const statusMap = LEAD_STATUSES.reduce((acc, status) => {
        acc[status] = 0;
        return acc;
      }, {});

      statusRows.forEach((row) => {
        statusMap[row.status] = Number(row.total);
      });

      res.json({
        success: true,
        data: {
          statuses: statusMap,
          sla: {
            total_leads: Number(slaRows[0]?.total_leads || 0),
            contacted_leads: Number(slaRows[0]?.contacted_leads || 0),
            avg_response_time_minutes: slaRows[0]?.avg_response_time_minutes
              ? Math.round(Number(slaRows[0].avg_response_time_minutes))
              : null,
            overdue_leads: Number(slaRows[0]?.overdue_leads || 0)
          },
          operators: operatorRows.map((row) => ({
            ...row,
            is_online: Number(row.is_online) === 1,
            current_load: Number(row.current_load || 0),
            total_leads: Number(row.total_leads || 0),
            closed_leads: Number(row.closed_leads || 0)
          }))
        }
      });
    } catch (error) {
      console.error('Error getting call center dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении аналитики'
      });
    }
  },

  async getOperators(req, res) {
    if (!await ensureOfficeAccess(req, res)) {
      return;
    }

    try {
      const [operators] = await db.query(
        `SELECT
           u.id,
           u.first_name,
           u.last_name,
           u.email,
           u.role,
           COALESCE(s.is_online, 0) AS is_online,
           COALESCE(s.current_load, 0) AS current_load,
           s.last_seen_at,
           s.last_assigned_at
         FROM users u
         LEFT JOIN call_center_operator_status s
           ON s.user_id = u.id AND s.office_id = u.office_id
         WHERE u.office_id = ?
         ORDER BY COALESCE(s.is_online, 0) DESC, COALESCE(s.current_load, 0) ASC, u.first_name ASC`,
        [req.user.office_id]
      );

      res.json({
        success: true,
        data: operators.map((operator) => ({
          ...operator,
          is_online: Number(operator.is_online) === 1,
          current_load: Number(operator.current_load || 0)
        }))
      });
    } catch (error) {
      console.error('Error getting operators:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении операторов'
      });
    }
  },

  async updateMyOperatorStatus(req, res) {
    if (!await ensureOfficeAccess(req, res)) {
      return;
    }

    try {
      const { is_online } = req.body;
      if (typeof is_online !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Необходимо указать boolean-поле is_online'
        });
      }

      await db.query(
        `INSERT INTO call_center_operator_status (user_id, office_id, is_online, current_load, last_seen_at)
         VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
           is_online = VALUES(is_online),
           office_id = VALUES(office_id),
           last_seen_at = CURRENT_TIMESTAMP`,
        [req.user.id, req.user.office_id, is_online ? 1 : 0]
      );

      const connection = await db.getClient();
      try {
        await recalculateOperatorLoad(connection, req.user.office_id);
      } finally {
        connection.release();
      }

      res.json({
        success: true,
        message: 'Статус оператора обновлён'
      });
    } catch (error) {
      console.error('Error updating operator status:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при обновлении статуса оператора'
      });
    }
  },

  async getEnums(req, res) {
    res.json({
      success: true,
      data: {
        statuses: LEAD_STATUSES,
        call_results: CALL_RESULTS
      }
    });
  }
};

module.exports = callCenterController;
