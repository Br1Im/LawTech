const db = require('../db');
const socketEmitter = require('../middleware/socketEmitter');
const { checkOfficeAccess } = require('../utils/ensureOffice');

const LEAD_STATUSES = [
  'NEW',
  'IN_PROGRESS',
  'NO_ANSWER',
  'CALL_BACK',
  'INTERESTED',
  'BOOKED',
  'REJECTED',
  'SPAM',
  'DUPLICATE',
  'NON_TARGET',
  'CLOSED'
];

const CALL_RESULTS = [
  'NO_ANSWER',
  'CALL_BACK',
  'INTERESTED',
  'BOOKED',
  'REJECTED',
  'CLOSED',
  'FAILED'
];

const ALL_TARGETS = ["NEW", "IN_PROGRESS", "NO_ANSWER", "CALL_BACK", "INTERESTED", "BOOKED", "REJECTED", "SPAM", "DUPLICATE", "NON_TARGET", "CLOSED"];
const STATUS_TRANSITIONS = {};
ALL_TARGETS.forEach(s => { STATUS_TRANSITIONS[s] = ALL_TARGETS.filter(t => t !== s); });

const ACTIVE_STATUSES = ['NEW', 'IN_PROGRESS', 'NO_ANSWER', 'CALL_BACK', 'INTERESTED'];  // BOOKED excluded — lead processed
const OPERATOR_ROLES = ['cc_operator', 'cc_manager'];

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
    case 'BOOKED':
      return 'BOOKED';
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

  if (filters.temperature) {
    conditions.push('l.temperature = ?');
    params.push(filters.temperature);
  }

  if (filters.source) {
    conditions.push('l.source = ?');
    params.push(filters.source);
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

      // Real-time: уведомить офис о новом лиде
      socketEmitter.emitLeadNew(targetOfficeId, { ...lead, client_name: name });

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
      const { status, assigned_to, search, temperature, source, office_id, sort } = req.query;

      const targetOfficeId = office_id || req.user.office_id;

      if (targetOfficeId) {
        const allowed = await checkOfficeAccess(req.user, targetOfficeId);
        if (!allowed) {
          return res.status(403).json({ success: false, message: 'Доступ запрещен' });
        }
      }

      // Оператор КЦ видит только свои лиды
      const effectiveAssignedTo = req.user.role === 'cc_operator' ? 'me' : assigned_to;

      const { whereSql, params } = buildLeadWhereClause(targetOfficeId, {
        status,
        temperature,
        source,
        assigned_to: effectiveAssignedTo,
        search,
        userId: req.user.id
      });

      let orderBy;
      switch (sort) {
        case 'created_at:asc':
          orderBy = 'l.created_at ASC';
          break;
        case 'score:desc':
          orderBy = 'l.score DESC, l.created_at DESC';
          break;
        default:
          orderBy = `FIELD(l.status, 'NEW', 'CALL_BACK', 'NO_ANSWER', 'IN_PROGRESS', 'INTERESTED', 'BOOKED', 'REJECTED', 'CLOSED'), l.score DESC, l.created_at DESC`;
      }

      const [leads] = await db.query(
        `SELECT
           l.*,
           CONCAT(u.first_name, ' ', u.last_name) AS assigned_to_name,
           o.name AS office_name,
           (
             SELECT COUNT(*)
             FROM call_center_calls c
             WHERE c.lead_id = l.id
           ) AS calls_count
         FROM call_center_leads l
         LEFT JOIN users u ON u.id = l.assigned_to
         LEFT JOIN offices o ON o.id = l.office_id
         WHERE ${whereSql}
         ORDER BY ${orderBy}`,
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
        description,
        operator_note
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

      if (operator_note !== undefined) {
        updates.push("operator_note = ?");
        params.push(operator_note || null);
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

      // Real-time: уведомить офис об обновлении лида
      socketEmitter.emitLeadUpdated(req.user.office_id, updatedLead, `Звонок: ${result}`);

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
           AND u.role IN ('cc_operator', 'cc_manager')
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
           AND u.role IN ('cc_operator', 'cc_manager')
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
    if (!await ensureOfficeAccess(req, res)) return;

    const isManager = ['cc_manager', 'admin', 'director'].includes(req.user.role);
    const isCcRole = ['cc_manager', 'cc_operator'].includes(req.user.role);

    let offices = [];
    if (isCcRole) {
      try {
        const [rows] = await db.query('SELECT id, name FROM offices ORDER BY name');
        offices = rows;
      } catch (e) { /* ignore */ }
    }

    res.json({
      success: true,
      data: {
        statuses: LEAD_STATUSES,
        call_results: CALL_RESULTS,
        is_manager: isManager,
        is_call_center_role: isCcRole,
        cross_office: isCcRole,
        offices
      }
    });
  },

  // --- Источники (summary) ---
  async getSources(req, res) {
    if (!await ensureOfficeAccess(req, res)) return;

    try {
      const [rows] = await db.query(
        `SELECT source, status, temperature, COUNT(*) AS cnt
         FROM call_center_leads
         WHERE office_id = ?
         GROUP BY source, status, temperature`,
        [req.user.office_id]
      );

      const map = {};
      for (const row of rows) {
        if (!map[row.source]) {
          map[row.source] = {
            source: row.source,
            total: 0,
            statuses: { NEW: 0, IN_PROGRESS: 0, NO_ANSWER: 0, CALL_BACK: 0, INTERESTED: 0, BOOKED: 0, REJECTED: 0, CLOSED: 0 },
            temperatures: { hot: 0, warm: 0, cold: 0 }
          };
        }
        const entry = map[row.source];
        const cnt = Number(row.cnt);
        entry.total += cnt;
        if (entry.statuses[row.status] !== undefined) entry.statuses[row.status] += cnt;
        if (row.temperature && entry.temperatures[row.temperature] !== undefined) entry.temperatures[row.temperature] += cnt;
      }

      res.json({ success: true, data: Object.values(map) });
    } catch (error) {
      console.error('Error getting sources:', error);
      res.status(500).json({ success: false, message: 'Ошибка при получении источников' });
    }
  },

  // --- Статистика операторов ---
  async getOperatorStats(req, res) {
    if (!await ensureOfficeAccess(req, res)) return;

    try {
      const [rows] = await db.query(
        `SELECT
           u.id, CONCAT(u.first_name, ' ', u.last_name) AS name, u.email, u.role,
           u.office_id, o.name AS office_name,
           COALESCE(s.is_online, 0) AS is_online,
           COUNT(DISTINCT l.id) AS total_leads,
           COUNT(DISTINCT a.id) AS arrived_leads,
           SUM(CASE WHEN l.status = 'REJECTED' THEN 1 ELSE 0 END) AS brak_leads,
           SUM(CASE WHEN l.status IN ('NEW','IN_PROGRESS','NO_ANSWER','CALL_BACK','INTERESTED') THEN 1 ELSE 0 END) AS active_leads
         FROM users u
         LEFT JOIN call_center_operator_status s ON s.user_id = u.id AND s.office_id = u.office_id
         LEFT JOIN call_center_leads l ON l.assigned_to = u.id AND l.office_id = u.office_id
         LEFT JOIN appointments a ON a.operator_id = u.id AND a.office_id = u.office_id AND a.status = 'arrived'
         LEFT JOIN offices o ON o.id = u.office_id
         WHERE u.office_id = ? AND u.role IN ('cc_manager', 'cc_operator')
         GROUP BY u.id, u.first_name, u.last_name, u.email, u.role, u.office_id, o.name, s.is_online
         ORDER BY total_leads DESC`,
        [req.user.office_id]
      );

      res.json({
        success: true,
        data: rows.map(r => ({
          ...r,
          is_online: Number(r.is_online) === 1,
          total_leads: Number(r.total_leads),
          booked_leads: Number(r.booked_leads),
          brak_leads: Number(r.brak_leads),
          active_leads: Number(r.active_leads),
          booking_rate: Number(r.total_leads) > 0 ? Math.round(Number(r.booked_leads) / Number(r.total_leads) * 100) : 0,
          brak_rate: Number(r.total_leads) > 0 ? Math.round(Number(r.brak_leads) / Number(r.total_leads) * 100) : 0
        }))
      });
    } catch (error) {
      console.error('Error getting operator stats:', error);
      res.status(500).json({ success: false, message: 'Ошибка при получении статистики' });
    }
  },

  // --- Пометка температуры лида ---
  async setLeadTemperature(req, res) {
    if (!await ensureOfficeAccess(req, res)) return;

    try {
      const { id } = req.params;
      const { temperature } = req.body;

      if (temperature && !['hot', 'warm', 'cold'].includes(temperature)) {
        return res.status(400).json({ success: false, message: 'Допустимые значения: hot, warm, cold или null' });
      }

      await db.query(
        'UPDATE call_center_leads SET temperature = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND office_id = ?',
        [temperature || null, id, req.user.office_id]
      );

      res.json({ success: true, message: 'Температура обновлена' });
    } catch (error) {
      console.error('Error setting temperature:', error);
      res.status(500).json({ success: false, message: 'Ошибка при обновлении температуры' });
    }
  },

  // --- Массовое назначение лидов ---
  async bulkAssignLeads(req, res) {
    if (!await ensureOfficeAccess(req, res)) return;

    const connection = await db.getClient();
    try {
      const { lead_ids, operator_id } = req.body;

      if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Укажите массив lead_ids' });
      }

      await connection.beginTransaction();

      const placeholders = lead_ids.map(() => '?').join(', ');
      await connection.query(
        `UPDATE call_center_leads SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders}) AND office_id = ?`,
        [operator_id || null, ...lead_ids, req.user.office_id]
      );

      for (const leadId of lead_ids) {
        await addHistoryEntry(connection, leadId, 'ASSIGNED', req.user.id, { assigned_to: operator_id || null });
      }

      await recalculateOperatorLoad(connection, req.user.office_id);
      await connection.commit();

      // Real-time: уведомить офис о назначении лидов
      socketEmitter.emitLeadUpdated(req.user.office_id, {}, `Назначено лидов: ${lead_ids.length}`);

      res.json({ success: true, message: `Назначено лидов: ${lead_ids.length}` });
    } catch (error) {
      await connection.rollback();
      console.error('Error bulk assigning leads:', error);
      res.status(500).json({ success: false, message: 'Ошибка при массовом назначении' });
    } finally {
      connection.release();
    }
  },

  // --- Тестовый лид ---
  async createTestLead(req, res) {
    if (!await ensureOfficeAccess(req, res)) return;

    const connection = await db.getClient();
    try {
      await connection.beginTransaction();

      const testNames = [
        'Иванов Иван', 'Петрова Мария', 'Сидоров Алексей',
        'Козлова Анна', 'Смирнов Дмитрий', 'Новикова Елена',
        'Морозов Сергей', 'Волкова Ольга', 'Лебедев Андрей'
      ];
      const testDescriptions = [
        'Развод, раздел имущества — квартира и автомобиль',
        'Трудовой спор: незаконное увольнение, задержка зарплаты 3 месяца',
        'ДТП, страховая отказывает в выплате ОСАГО',
        'Наследство: оспаривание завещания, доли в квартире',
        'Защита прав потребителя — возврат некачественного товара',
        'Долг по расписке 500 000 руб., должник не платит',
        'Жилищный вопрос: выселение из квартиры, прописка',
        'Алименты: взыскание задолженности за 2 года',
        'Земельный спор с соседями — межевание участка',
        'Банкротство физического лица, долги по кредитам',
        'Уголовное дело: обвинение в мошенничестве ст. 159 УК РФ',
        'Защита бизнеса: налоговая проверка, доначисления'
      ];
      const randomName = testNames[Math.floor(Math.random() * testNames.length)];
      const randomPhone = '+7' + String(Math.floor(9000000000 + Math.random() * 999999999));
      const randomDescription = testDescriptions[Math.floor(Math.random() * testDescriptions.length)];

      const score = computeLeadScore({ source: 'тест', description: randomDescription, created_at: new Date() });

      const [result] = await connection.query(
        `INSERT INTO call_center_leads (office_id, source, name, phone, description, status, score, created_at)
         VALUES (?, 'тест', ?, ?, ?, 'NEW', ?, CURRENT_TIMESTAMP)`,
        [req.user.office_id, randomName, randomPhone, randomDescription, score]
      );

      await addHistoryEntry(connection, result.insertId, 'LEAD_CREATED', req.user.id, { source: 'тест' });

      // Автоназначение на начальника КЦ (текущего пользователя)
      await connection.query(
        'UPDATE call_center_leads SET assigned_to = ? WHERE id = ?',
        [req.user.id, result.insertId]
      );

      await addHistoryEntry(connection, result.insertId, 'ASSIGNED', req.user.id, { assigned_to: req.user.id });
      await recalculateOperatorLoad(connection, req.user.office_id);
      await connection.commit();

      const lead = await getLeadDetails(connection, result.insertId, req.user.office_id);

      // Real-time: уведомить офис о новом лиде
      socketEmitter.emitLeadNew(req.user.office_id, { ...lead, client_name: randomName });

      res.status(201).json({ success: true, message: 'Тестовый лид создан', data: lead });
    } catch (error) {
      await connection.rollback();
      console.error('Error creating test lead:', error);
      res.status(500).json({ success: false, message: 'Ошибка при создании тестового лида' });
    } finally {
      connection.release();
    }
  },

  // --- Запись клиента (лид → appointment) ---
  async bookClient(req, res) {
    if (!await ensureOfficeAccess(req, res)) return;

    const connection = await db.getClient();
    try {
      const { id } = req.params;
      const { client_name, appointment_date, appointment_time, comment } = req.body;

      if (!client_name || !client_name.trim()) {
        return res.status(400).json({ success: false, message: 'ФИО клиента обязательно' });
      }
      if (!appointment_date) {
        return res.status(400).json({ success: false, message: 'Дата консультации обязательна' });
      }
      if (!appointment_time) {
        return res.status(400).json({ success: false, message: 'Время консультации обязательно' });
      }

      await connection.beginTransaction();

      const [leadRows] = await connection.query(
        'SELECT * FROM call_center_leads WHERE id = ? AND office_id = ?',
        [id, req.user.office_id]
      );

      if (leadRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Лид не найден' });
      }

      const lead = leadRows[0];

      // Получаем имя оператора
      const [userRows] = await connection.query(
        "SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM users WHERE id = ?",
        [req.user.id]
      );
      const operatorName = userRows[0]?.full_name || 'Оператор';

      // Тема: если не указана вручную, берём описание из лида
      const appointmentComment = comment || lead.description || null;

      // Создаём запись (appointment)
      const [appointmentResult] = await connection.query(
        `INSERT INTO appointments (office_id, lead_id, client_name, client_phone, source, appointment_date, appointment_time, comment, operator_id, operator_name, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting')`,
        [
          req.user.office_id,
          lead.id,
          client_name.trim(),
          lead.phone || '',
          lead.source || null,
          appointment_date,
          appointment_time,
          appointmentComment,
          req.user.id,
          operatorName
        ]
      );

      // Обновляем статус лида на BOOKED
      await connection.query(
        "UPDATE call_center_leads SET status = 'BOOKED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [id]
      );

      await addHistoryEntry(connection, id, 'BOOKED', req.user.id, {
        appointment_id: appointmentResult.insertId,
        client_name: client_name.trim(),
        appointment_date,
        appointment_time
      });

      await recalculateOperatorLoad(connection, req.user.office_id);
      await connection.commit();

      // Real-time: уведомить офис о новой записи
      socketEmitter.emitAppointmentNew(req.user.office_id, {
        id: appointmentResult.insertId,
        client_name: client_name.trim(),
        date: appointment_date,
        time: appointment_time,
      });

      res.status(201).json({
        success: true,
        message: 'Клиент записан на консультацию',
        data: { appointment_id: appointmentResult.insertId, lead_id: Number(id) }
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error booking client:', error);
      res.status(500).json({ success: false, message: 'Ошибка при записи клиента' });
    } finally {
      connection.release();
    }
  },

  // --- Получение записей (appointments) ---
  async getAppointments(req, res) {
    if (!await ensureOfficeAccess(req, res)) return;

    try {
      const [rows] = await db.query(
        `SELECT
           a.*,
           CONCAT(u.first_name, ' ', u.last_name) AS operator_full_name,
           CONCAT(lw.last_name, ' ', LEFT(lw.first_name, 1), '.') AS lawyer_short_name
         FROM appointments a
         LEFT JOIN users u ON u.id = a.operator_id
         LEFT JOIN users lw ON lw.id = a.assigned_lawyer_id
         WHERE a.office_id = ?
         ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
        [req.user.office_id]
      );

      res.json({
        success: true,
        data: rows.map(r => ({
          ...r,
          operator_name: r.operator_name || r.operator_full_name || 'Оператор',
          lawyer_name: r.lawyer_short_name || null,
        }))
      });
    } catch (error) {
      console.error('Error getting appointments:', error);
      res.status(500).json({ success: false, message: 'Ошибка при получении записей' });
    }
  },

  // --- Создание записи напрямую (без лида) ---
  async createDirectAppointment(req, res) {
    if (!await ensureOfficeAccess(req, res)) return;

    try {
      const { client_name, client_phone, appointment_date, appointment_time, comment, source, assigned_lawyer_id } = req.body;
      if (!client_name || !client_name.trim()) {
        return res.status(400).json({ success: false, message: 'ФИО клиента обязательно' });
      }
      if (!appointment_date) {
        return res.status(400).json({ success: false, message: 'Дата обязательна' });
      }
      if (!appointment_time) {
        return res.status(400).json({ success: false, message: 'Время обязательно' });
      }

      const [userRows] = await db.query(
        "SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM users WHERE id = ?",
        [req.user.id]
      );
      const operatorName = userRows[0]?.full_name || 'Оператор';

      const [result] = await db.query(
        `INSERT INTO appointments (office_id, lead_id, client_name, client_phone, source, appointment_date, appointment_time, comment, operator_id, operator_name, assigned_lawyer_id, status)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting')`,
        [
          req.user.office_id,
          client_name.trim(),
          client_phone || '',
          source || null,
          appointment_date,
          appointment_time,
          comment || null,
          req.user.id,
          operatorName,
          assigned_lawyer_id || null,
        ]
      );

      socketEmitter.emitAppointmentNew(req.user.office_id, {
        id: result.insertId,
        client_name: client_name.trim(),
        date: appointment_date,
        time: appointment_time,
      });

      res.status(201).json({
        success: true,
        message: 'Запись создана',
        data: { id: result.insertId }
      });
    } catch (error) {
      console.error('Error creating appointment:', error);
      res.status(500).json({ success: false, message: 'Ошибка при создании записи' });
    }
  },

  // --- Обновление статуса записи ---
  async updateAppointmentStatus(req, res) {
    if (!await ensureOfficeAccess(req, res)) return;

    const canUpdateStatus = ['admin', 'administrator', 'director', 'manager', 'okk'].includes(req.user.role);
    if (!canUpdateStatus) {
      return res.status(403).json({ success: false, message: 'Нет прав для изменения статуса записи' });
    }

    try {
      const { id } = req.params;
      const { status, manager_comment } = req.body;

      const validStatuses = ['waiting', 'confirmed', 'arrived', 'no_show', 'cancelled', 'rescheduled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Недопустимый статус' });
      }

      const updates = ['status = ?'];
      const params = [status];

      if (manager_comment !== undefined) {
        updates.push('manager_comment = ?');
        params.push(manager_comment);
      }

      params.push(id, req.user.office_id);

      await db.query(
        `UPDATE appointments SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND office_id = ?`,
        params
      );

      // Real-time: уведомить офис об изменении статуса записи
      socketEmitter.emitAppointmentStatus(req.user.office_id, { id, status });

      res.json({ success: true, message: 'Статус записи обновлён' });
    } catch (error) {
      console.error('Error updating appointment status:', error);
      res.status(500).json({ success: false, message: 'Ошибка при обновлении статуса' });
    }
  },

  // --- Обновление полей записи (тема, время, комментарий) ---
  async updateAppointment(req, res) {
    if (!await ensureOfficeAccess(req, res)) return;

    try {
      const { id } = req.params;
      const { comment, manager_comment, appointment_date, appointment_time } = req.body;

      const updates = [];
      const params = [];

      if (comment !== undefined) {
        updates.push('comment = ?');
        params.push(comment || null);
      }
      if (manager_comment !== undefined) {
        updates.push('manager_comment = ?');
        params.push(manager_comment || null);
      }
      if (appointment_date) {
        updates.push('appointment_date = ?');
        params.push(appointment_date);
      }
      if (appointment_time) {
        updates.push('appointment_time = ?');
        params.push(appointment_time);
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'Нет данных для обновления' });
      }

      params.push(id, req.user.office_id);

      const [result] = await db.query(
        `UPDATE appointments SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND office_id = ?`,
        params
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Запись не найдена' });
      }

      res.json({ success: true, message: 'Запись обновлена' });
    } catch (error) {
      console.error('Error updating appointment:', error);
      res.status(500).json({ success: false, message: 'Ошибка при обновлении записи' });
    }
  },

  // =============================================
  //  ПРИХОДЫ (Visits) — первичные + действующие
  // =============================================

  async getPrimaryVisits(req, res) {
    if (!await ensureOfficeAccess(req, res)) return;

    try {
      const [rows] = await db.query(
        `SELECT
           a.*,
           CONCAT(u.first_name, ' ', u.last_name) AS operator_full_name,
           CONCAT(s.first_name, ' ', s.last_name) AS signed_by_name,
           CONCAT(l.first_name, ' ', l.last_name) AS assigned_lawyer_name,
           con.id AS linked_contract_id,
           con.contract_type AS linked_contract_type,
           con.contract_number AS linked_contract_number,
           con.needs_lawyer_input AS linked_needs_input
         FROM appointments a
         LEFT JOIN users u ON u.id = a.operator_id
         LEFT JOIN users s ON s.id = a.contract_signed_by
         LEFT JOIN users l ON l.id = a.assigned_lawyer_id
         LEFT JOIN contracts con ON con.appointment_id = a.id
         WHERE a.office_id = ? AND a.status = 'arrived'
         ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
        [req.user.office_id]
      );

      res.json({
        success: true,
        data: rows.map(r => ({
          ...r,
          operator_name: r.operator_name || r.operator_full_name || 'Оператор',
          signed_by_name: r.signed_by_name || null,
          assigned_lawyer_id: r.assigned_lawyer_id || null,
          assigned_lawyer_name: r.assigned_lawyer_name || null,
          linked_contract_id: r.linked_contract_id || null,
          linked_contract_type: r.linked_contract_type || null,
          linked_contract_number: r.linked_contract_number || null,
          linked_needs_input: r.linked_needs_input || 0,
        }))
      });
    } catch (error) {
      console.error('Error getting primary visits:', error);
      res.status(500).json({ success: false, message: 'Ошибка при получении первичных приходов' });
    }
  },

  async setConsultationResult(req, res) {
    if (!await ensureOfficeAccess(req, res)) return;

    const canSetResult = ['admin', 'administrator', 'director', 'manager', 'okk'].includes(req.user.role);
    if (!canSetResult) {
      return res.status(403).json({ success: false, message: 'Нет прав для установки результата' });
    }

    try {
      const { id } = req.params;
      const { consultation_result } = req.body;

      if (!['contract_signed', 'not_signed'].includes(consultation_result)) {
        return res.status(400).json({ success: false, message: 'Допустимые значения: contract_signed, not_signed' });
      }

      const updates = ['consultation_result = ?'];
      const params = [consultation_result];

      if (consultation_result === 'contract_signed') {
        updates.push('contract_signed_by = ?');
        params.push(req.user.id);
      } else {
        updates.push('contract_signed_by = NULL');
      }

      params.push(id, req.user.office_id);

      await db.query(
        `UPDATE appointments SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND office_id = ?`,
        params
      );

      // Real-time: уведомить офис о результате консультации
      socketEmitter.emitVisitResult(req.user.office_id, {
        id,
        result: consultation_result === 'contract_signed' ? 'signed' : 'not_signed',
      });

      res.json({ success: true, message: 'Результат консультации обновлён' });
    } catch (error) {
      console.error('Error setting consultation result:', error);
      res.status(500).json({ success: false, message: 'Ошибка при обновлении результата' });
    }
  },

  async assignLawyer(req, res) {
    if (!await ensureOfficeAccess(req, res)) return;

    const canAssign = ['manager', 'okk', 'director', 'admin'].includes(req.user.role);
    if (!canAssign) {
      return res.status(403).json({ success: false, message: 'Нет прав для назначения сотрудника' });
    }

    try {
      const { id } = req.params;
      const { assigned_lawyer_id } = req.body;

      await db.query(
        `UPDATE appointments SET assigned_lawyer_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND office_id = ?`,
        [assigned_lawyer_id || null, id, req.user.office_id]
      );

      res.json({ success: true, message: 'Сотрудник назначен' });
    } catch (error) {
      console.error('Error assigning lawyer:', error);
      res.status(500).json({ success: false, message: 'Ошибка при назначении сотрудника' });
    }
  },

  async getConsultationStats(req, res) {
    if (!await ensureOfficeAccess(req, res)) return;

    try {
      const [rows] = await db.query(
        `SELECT
           u.id,
           CONCAT(u.first_name, ' ', u.last_name) AS name,
           u.role,
           COUNT(a.id) AS total_consultations,
           SUM(CASE WHEN a.consultation_result = 'contract_signed' THEN 1 ELSE 0 END) AS contracts_signed,
           SUM(CASE WHEN a.consultation_result = 'not_signed' THEN 1 ELSE 0 END) AS contracts_not_signed,
           SUM(CASE WHEN a.consultation_result IS NULL THEN 1 ELSE 0 END) AS pending
         FROM users u
         LEFT JOIN appointments a ON a.assigned_lawyer_id = u.id AND a.office_id = ? AND a.status = 'arrived'
         WHERE u.office_id = ? AND u.is_active = 1
           AND u.role IN ('manager', 'okk', 'lawyer')
         GROUP BY u.id, u.first_name, u.last_name, u.role
         ORDER BY FIELD(u.role, 'manager', 'okk', 'lawyer'), u.last_name, u.first_name`,
        [req.user.office_id, req.user.office_id]
      );

      res.json({
        success: true,
        data: rows.map(r => ({
          id: r.id,
          name: r.name || 'Сотрудник',
          role: r.role,
          total_consultations: Number(r.total_consultations || 0),
          contracts_signed: Number(r.contracts_signed || 0),
          contracts_not_signed: Number(r.contracts_not_signed || 0),
          pending: Number(r.pending || 0),
          conversion: Number(r.total_consultations) > 0
            ? Math.round(Number(r.contracts_signed) / Number(r.total_consultations) * 100)
            : 0
        }))
      });
    } catch (error) {
      console.error('Error getting consultation stats:', error);
      res.status(500).json({ success: false, message: 'Ошибка при получении статистики консультаций' });
    }
  },

  async getExistingClientVisits(req, res) {
    if (!await ensureOfficeAccess(req, res)) return;

    try {
      const [rows] = await db.query(
        `SELECT
           v.*,
           CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
           CONCAT(c.first_name, ' ', c.last_name) AS created_by_name
         FROM existing_client_visits v
         LEFT JOIN users e ON e.id = v.employee_id
         LEFT JOIN users c ON c.id = v.created_by
         WHERE v.office_id = ?
         ORDER BY v.visited_at DESC`,
        [req.user.office_id]
      );

      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error getting existing client visits:', error);
      res.status(500).json({ success: false, message: 'Ошибка при получении действующих клиентов' });
    }
  },

  async addExistingClientVisit(req, res) {
    if (!await ensureOfficeAccess(req, res)) return;

    try {
      const { client_name, employee_id, comment } = req.body;

      if (!client_name || !client_name.trim()) {
        return res.status(400).json({ success: false, message: 'Укажите ФИО клиента' });
      }

      const [result] = await db.query(
        `INSERT INTO existing_client_visits (office_id, client_name, employee_id, created_by, comment, visited_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [req.user.office_id, client_name.trim(), employee_id || null, req.user.id, comment || null]
      );

      res.json({ success: true, message: 'Приход добавлен', data: { id: result.insertId } });
    } catch (error) {
      console.error('Error adding existing client visit:', error);
      res.status(500).json({ success: false, message: 'Ошибка при добавлении прихода' });
    }
  },

  async getVisitsStats(req, res) {
    if (!await ensureOfficeAccess(req, res)) return;

    try {
      const [primary] = await db.query(
        `SELECT
           COUNT(*) AS total_arrived,
           SUM(CASE WHEN consultation_result = 'contract_signed' THEN 1 ELSE 0 END) AS contracts_signed,
           SUM(CASE WHEN consultation_result = 'not_signed' THEN 1 ELSE 0 END) AS contracts_not_signed,
           SUM(CASE WHEN consultation_result IS NULL THEN 1 ELSE 0 END) AS pending_result
         FROM appointments
         WHERE office_id = ? AND status = 'arrived'`,
        [req.user.office_id]
      );

      const [existing] = await db.query(
        `SELECT COUNT(*) AS total_existing
         FROM existing_client_visits
         WHERE office_id = ?`,
        [req.user.office_id]
      );

      const stats = primary[0] || {};
      const totalArrived = Number(stats.total_arrived || 0);
      const contractsSigned = Number(stats.contracts_signed || 0);
      const totalExisting = Number(existing[0]?.total_existing || 0);

      res.json({
        success: true,
        data: {
          primary: {
            total: totalArrived,
            contracts_signed: contractsSigned,
            contracts_not_signed: Number(stats.contracts_not_signed || 0),
            pending: Number(stats.pending_result || 0),
            conversion: totalArrived > 0 ? Math.round(contractsSigned / totalArrived * 100) : 0
          },
          existing: {
            total: totalExisting
          },
          total_visits: totalArrived + totalExisting
        }
      });
    } catch (error) {
      console.error('Error getting visits stats:', error);
      res.status(500).json({ success: false, message: 'Ошибка при получении статистики' });
    }
  },

  async getOfficeEmployees(req, res) {
    if (!await ensureOfficeAccess(req, res)) return;

    try {
      const [rows] = await db.query(
        `SELECT id, first_name, last_name, role
         FROM users
         WHERE office_id = ? AND role NOT IN ('cc_manager', 'cc_operator')
         ORDER BY last_name, first_name`,
        [req.user.office_id]
      );

      res.json({
        success: true,
        data: rows.map(r => ({
          id: r.id,
          name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Сотрудник',
          role: r.role
        }))
      });
    } catch (error) {
      console.error('Error getting office employees:', error);
      res.status(500).json({ success: false, message: 'Ошибка при получении сотрудников' });
    }
  }
};

module.exports = callCenterController;
