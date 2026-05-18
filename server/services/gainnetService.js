/**
 * Gainnet API integration service.
 *
 * Two ingestion paths:
 *  1. WebHook (push) — Gainnet POSTs lead to /api/gainnet/webhook
 *  2. Poller  (pull) — every POLL_INTERVAL_MS we fetch new leads via API
 *
 * Both paths funnel through `_upsertLead()` which deduplicates by
 * source='gainnet' + external_id = gainnet lead id.
 */

const https = require('https');
const querystring = require('querystring');
const db = require('../db');
const socketEmitter = require('../middleware/socketEmitter');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const GAINNET_HOST = 'gainnet.ru';
const API_BASE = '/api/v1';
const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

// In-memory config loaded from DB at startup.
// Map<officeId, { apiKey, webhookKey }>
let integrationConfigs = new Map();
let pollTimer = null;
let pollRunning = false;

// ---------------------------------------------------------------------------
// Low-level HTTP helper (no extra deps needed)
// ---------------------------------------------------------------------------
function gainnetPost(path, params) {
  return new Promise((resolve, reject) => {
    const body = querystring.stringify(params);
    const options = {
      hostname: GAINNET_HOST,
      port: 443,
      path: `${API_BASE}${path}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Gainnet parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('Gainnet request timeout'));
    });
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Public API helpers
// ---------------------------------------------------------------------------
async function fetchBalance(apiKey) {
  const res = await gainnetPost('/balance', { api_key: apiKey });
  if (res.status !== 'accepted') throw new Error(`Gainnet balance error: ${JSON.stringify(res)}`);
  return parseFloat(res.message);
}

async function fetchLeads(apiKey, { leadStatus, fromDate, toDate, limit = 500 } = {}) {
  const params = { api_key: apiKey, limit };
  if (leadStatus) params.lead_status = leadStatus;
  if (fromDate) params.from_date = fromDate;
  if (toDate) params.to_date = toDate;

  const res = await gainnetPost('/leads', params);
  if (res.status !== 'accepted') throw new Error(`Gainnet leads error: ${JSON.stringify(res)}`);
  return res.answer || [];
}

async function updateLeadStatus(apiKey, leadId, leadStatus, reason) {
  const params = { api_key: apiKey, lead_id: leadId, lead_status: leadStatus };
  if (reason) params.reason = reason;

  const res = await gainnetPost('/update', params);
  if (res.status !== 'accepted') throw new Error(`Gainnet update error: ${JSON.stringify(res)}`);
  return true;
}

// ---------------------------------------------------------------------------
// DB: office_integrations CRUD
// ---------------------------------------------------------------------------
async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS office_integrations (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      office_id    INT NOT NULL,
      provider     VARCHAR(50) NOT NULL DEFAULT 'gainnet',
      api_key      VARCHAR(255) NOT NULL,
      webhook_key  VARCHAR(255) DEFAULT NULL,
      is_active    TINYINT(1) NOT NULL DEFAULT 1,
      last_poll_at DATETIME DEFAULT NULL,
      created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_office_provider (office_id, provider)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function loadConfigs() {
  const [rows] = await db.query(
    `SELECT office_id, api_key, webhook_key FROM office_integrations WHERE provider = 'gainnet' AND is_active = 1`
  );
  integrationConfigs.clear();
  for (const r of rows) {
    integrationConfigs.set(r.office_id, { apiKey: r.api_key, webhookKey: r.webhook_key });
  }
  return integrationConfigs;
}

async function upsertConfig(officeId, apiKey, webhookKey) {
  await db.query(
    `INSERT INTO office_integrations (office_id, provider, api_key, webhook_key)
     VALUES (?, 'gainnet', ?, ?)
     ON DUPLICATE KEY UPDATE api_key = VALUES(api_key), webhook_key = VALUES(webhook_key), is_active = 1`,
    [officeId, apiKey, webhookKey || null]
  );
  await loadConfigs();
}

// ---------------------------------------------------------------------------
// Core: upsert a Gainnet lead into call_center_leads
// ---------------------------------------------------------------------------
async function _upsertLead(officeId, gainnetLead) {
  const externalId = String(gainnetLead.id);
  const connection = await db.getClient();

  try {
    // Check duplicate
    const [existing] = await connection.query(
      `SELECT id FROM call_center_leads WHERE office_id = ? AND source = 'gainnet' AND external_id = ?`,
      [officeId, externalId]
    );
    if (existing.length > 0) {
      return { duplicate: true, id: existing[0].id };
    }

    await connection.beginTransaction();

    const name = gainnetLead.name || 'Без имени';
    const phone = gainnetLead.phone || null;
    const text = gainnetLead.text || null;
    const region = gainnetLead.region || null;
    const category = gainnetLead.category || null;
    const soldDate = gainnetLead.sold_date || null;
    const price = gainnetLead.sold_price || gainnetLead.price || null;
    const leadType = gainnetLead.type || null;
    const routeShow = gainnetLead.route_show || null;

    const metadata = JSON.stringify({
      gainnet_id: gainnetLead.id,
      region,
      category,
      category_id: gainnetLead.category_id || null,
      sub_category_id: gainnetLead.sub_category_id || null,
      sold_price: price,
      type: leadType,
      route_show: routeShow,
      is_test: gainnetLead.is_test || false,
    });

    const description = [text, region ? `Регион: ${region}` : null, category ? `Категория: ${category}` : null]
      .filter(Boolean)
      .join('\n');

    const [result] = await connection.query(
      `INSERT INTO call_center_leads
         (office_id, source, external_id, name, phone, description, status, score, metadata, created_at)
       VALUES (?, 'gainnet', ?, ?, ?, ?, 'NEW', 50, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
      [officeId, externalId, name, phone, description, metadata, soldDate]
    );

    const leadId = result.insertId;

    // History entry
    await connection.query(
      `INSERT INTO call_center_history (lead_id, action, details, created_at) VALUES (?, 'LEAD_CREATED', ?, CURRENT_TIMESTAMP)`,
      [leadId, JSON.stringify({ source: 'gainnet', gainnet_id: gainnetLead.id })]
    );

    // Auto-assign
    const assignedTo = await _assignLead(connection, leadId, officeId);

    await connection.commit();

    // Realtime notification
    try {
      socketEmitter.emitLeadNew(officeId, { id: leadId, client_name: name, source: 'gainnet' });
    } catch (_) { /* socket not critical */ }

    return { duplicate: false, id: leadId, assignedTo };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function _assignLead(connection, leadId, officeId) {
  const OPERATOR_ROLES = ['cc_operator', 'cc_manager'];
  const [operators] = await connection.query(
    `SELECT u.id, COALESCE(s.is_online, 0) AS is_online, COALESCE(s.current_load, 0) AS current_load
     FROM users u
     LEFT JOIN call_center_operator_status s ON s.user_id = u.id AND s.office_id = u.office_id
     WHERE u.office_id = ? AND u.is_active = 1
       AND u.role IN (${OPERATOR_ROLES.map(() => '?').join(', ')})
     ORDER BY COALESCE(s.is_online, 0) DESC, COALESCE(s.current_load, 0) ASC, u.id ASC`,
    [officeId, ...OPERATOR_ROLES]
  );

  const op = operators[0];
  if (!op) return null;

  await connection.query(
    'UPDATE call_center_leads SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [op.id, leadId]
  );

  await connection.query(
    `INSERT INTO call_center_operator_status (user_id, office_id, is_online, current_load, last_seen_at, last_assigned_at)
     VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE last_assigned_at = CURRENT_TIMESTAMP, last_seen_at = CURRENT_TIMESTAMP`,
    [op.id, officeId, Number(op.is_online) === 1 ? 1 : 0]
  );

  await connection.query(
    `INSERT INTO call_center_history (lead_id, action, user_id, details, created_at) VALUES (?, 'ASSIGNED', ?, ?, CURRENT_TIMESTAMP)`,
    [leadId, op.id, JSON.stringify({ assigned_to: op.id })]
  );

  return op.id;
}

// ---------------------------------------------------------------------------
// WebHook handler (called from route)
// ---------------------------------------------------------------------------
async function handleWebhook(req, res) {
  try {
    const { key, id, phone, price, region, region_id, name, text, category_id, category, type } = req.body;

    if (!key || !id) {
      return res.status(400).json({ status: 'error', message: 'Missing key or id' });
    }

    // Find office by webhook key
    let targetOfficeId = null;
    for (const [officeId, cfg] of integrationConfigs.entries()) {
      if (cfg.webhookKey === key) {
        targetOfficeId = officeId;
        break;
      }
    }

    if (!targetOfficeId) {
      console.error(`[Gainnet WH] Unknown webhook key: ${key}`);
      return res.status(403).json({ status: 'error', message: 'Invalid key' });
    }

    const gainnetLead = { id, phone, name, text, price, region, region_id, category_id, category, type };
    const result = await _upsertLead(targetOfficeId, gainnetLead);

    console.log(`[Gainnet WH] Lead ${id} → office ${targetOfficeId} (dup=${result.duplicate})`);
    return res.status(200).json({ status: 'accepted', lead_id: result.id, duplicate: result.duplicate });
  } catch (err) {
    console.error('[Gainnet WH] Error:', err);
    return res.status(500).json({ status: 'error', message: 'Internal error' });
  }
}

// ---------------------------------------------------------------------------
// Poller
// ---------------------------------------------------------------------------
async function pollOnce() {
  if (pollRunning) { console.log('[Gainnet Poll] Already running, skip'); return; }
  pollRunning = true;
  try {
  for (const [officeId, cfg] of integrationConfigs.entries()) {
    try {
      // Only fetch leads from the last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const leads = await fetchLeads(cfg.apiKey, { limit: 100, fromDate: yesterday });
      let imported = 0;

      for (const lead of leads) {
        try {
          const result = await _upsertLead(officeId, lead);
          if (!result.duplicate) imported++;
        } catch (e) {
          console.error(`[Gainnet Poll] Error upserting lead ${lead.id}:`, e.message);
        }
      }

      if (imported > 0) {
        console.log(`[Gainnet Poll] Office ${officeId}: imported ${imported} new leads`);
      }

      await db.query(
        `UPDATE office_integrations SET last_poll_at = CURRENT_TIMESTAMP WHERE office_id = ? AND provider = 'gainnet'`,
        [officeId]
      );
    } catch (err) {
      console.error(`[Gainnet Poll] Error polling office ${officeId}:`, err.message);
    }
  }
  } finally { pollRunning = false; }
}

function startPoller() {
  if (pollTimer) return;
  console.log(`[Gainnet] Poller started (every ${POLL_INTERVAL_MS / 1000}s)`);
  pollTimer = setInterval(() => {
    pollOnce().catch((e) => console.error('[Gainnet Poll] Unhandled:', e));
  }, POLL_INTERVAL_MS);
  // Defer first poll to avoid blocking server startup
  setTimeout(() => {
    pollOnce().catch((e) => console.error('[Gainnet Poll] Initial run error:', e));
  }, 10000);
}

function stopPoller() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Full historical import — fetches ALL leads in batches
// ---------------------------------------------------------------------------
async function importAllLeads(officeId, apiKey, sinceDate) {
  let total = 0;
  let imported = 0;
  const batchSize = 500;
  const fromDate = sinceDate || '2020-01-01';

  const leads = await fetchLeads(apiKey, { limit: batchSize, fromDate });
  total = leads.length;

  for (const lead of leads) {
    try {
      const result = await _upsertLead(officeId, lead);
      if (!result.duplicate) imported++;
    } catch (e) {
      console.error(`[Gainnet Import] Error lead ${lead.id}:`, e.message);
    }
  }

  console.log(`[Gainnet Import] fetched ${total}, imported ${imported}`);
  return { total, imported };
}

// ---------------------------------------------------------------------------
// Init — called once at startup
// ---------------------------------------------------------------------------
async function init() {
  await ensureTable();
  await loadConfigs();

  if (integrationConfigs.size > 0) {
    console.log(`[Gainnet] Loaded ${integrationConfigs.size} integration(s)`);
    startPoller();
  } else {
    console.log('[Gainnet] No active integrations found');
  }
}

module.exports = {
  init,
  handleWebhook,
  fetchBalance,
  fetchLeads,
  updateLeadStatus,
  importAllLeads,
  upsertConfig,
  loadConfigs,
  startPoller,
  stopPoller,
  pollOnce,
};
