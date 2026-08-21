/**
 * Правовед / myleads.feedot.com REST API v2.
 *
 * Поток данных:
 *   access_token -> preorders -> leads for each preorder -> call_center_leads.
 * Каждая интеграция закреплена за одним call_center_id. target_office_id —
 * технический ящик этого КЦ, необходимый текущей модели call_center_leads.
 */
const https = require('https');
const db = require('../db');
const socketEmitter = require('../middleware/socketEmitter');
const integrationStore = require('./leadIntegrationStore');
const leadQuality = require('./leadQuality');

const API_HOST = 'api.myleads.feedot.com';
const REQUEST_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 2 * 60 * 1000;
const RATE_LIMIT_DELAY_MS = 3100; // API: не чаще 20 запросов в минуту.

let integrationConfigs = new Map();
let pollTimer = null;
let pollRunning = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function request(method, path, { token, form } = {}) {
  return new Promise((resolve, reject) => {
    const headers = { Accept: 'application/json' };
    let body = null;

    if (form) {
      const boundary = `----LawTechForm${Date.now()}`;
      const parts = [];
      for (const [key, value] of Object.entries(form)) {
        parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`);
      }
      parts.push(`--${boundary}--\r\n`);
      body = Buffer.from(parts.join(''), 'utf8');
      headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
      headers['Content-Length'] = body.length;
    }
    if (token) headers.Authorization = `Bearer ${token}`;

    const req = https.request({ hostname: API_HOST, port: 443, path, method, headers }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let data = null;
        try { data = JSON.parse(raw); } catch (_) { /* handled by caller */ }
        resolve({ statusCode: res.statusCode, data, raw });
      });
    });
    req.on('error', reject);
    req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error('Pravoved request timeout')));
    if (body) req.write(body);
    req.end();
  });
}

function apiError(operation, response) {
  const message = response?.data?.message
    || response?.data?.error
    || (response?.raw ? String(response.raw).slice(0, 200) : null)
    || `HTTP ${response?.statusCode || 0}`;
  const error = new Error(`Правовед: ${operation}: ${message}`);
  error.statusCode = response?.statusCode;
  return error;
}

function collection(data, keys) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

async function auth(email, password) {
  const res = await request('POST', '/restv2/auth/', { form: { email, password } });
  if (res.statusCode === 200 && res.data?.status === 'success' && res.data?.access_token) {
    return res.data.access_token;
  }
  throw apiError('не удалось получить ключ доступа', res);
}

async function fetchPreorders(token, { limit = 50, offset = 0, deleted = 0 } = {}) {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset), deleted: String(deleted) });
  const res = await request('GET', `/restv2/preorders/?${query}`, { token });
  if (res.statusCode !== 200) throw apiError('не удалось получить предзаказы', res);
  return collection(res.data, ['preorders', 'results', 'items']);
}

async function fetchLeads(token, preorderId, { limit = 50, offset = 0 } = {}) {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await request('GET', `/restv2/preorders/${encodeURIComponent(preorderId)}/leads/?${query}`, { token });
  if (res.statusCode !== 200) throw apiError(`не удалось получить лиды предзаказа ${preorderId}`, res);
  return collection(res.data, ['leads', 'results', 'items']);
}

async function verifyKey(token) {
  try {
    const preorders = await fetchPreorders(token, { limit: 10, offset: 0, deleted: 0 });
    return { ok: true, preordersCount: preorders.length };
  } catch (error) {
    return { ok: false, statusCode: error.statusCode, message: error.message };
  }
}

function leadCreatedAt(value) {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.replace('T', ' ').slice(0, 19);
  return null;
}

async function upsertLead(config, preorder, lead, qualityMapping) {
  if (lead?.id === undefined || lead?.id === null) return { duplicate: true, id: null };
  const externalId = `${preorder.id}:${lead.id}`;
  const connection = await db.getClient();
  try {
    const [existing] = await connection.query(
      `SELECT id FROM call_center_leads
        WHERE office_id=? AND source='pravoved' AND external_id=? LIMIT 1`,
      [config.targetOfficeId, externalId]
    );
    if (existing.length) return { duplicate: true, id: existing[0].id };

    await connection.beginTransaction();
    const name = String(lead.name || '').trim() || 'Без имени';
    const phone = lead.phone === undefined || lead.phone === null ? null : String(lead.phone);
    const location = [lead.city_name, lead.region_name].filter(Boolean).join(', ');
    const description = [lead.question_text, location ? `Регион: ${location}` : null]
      .filter(Boolean).join('\n') || null;
    // Качество: сначала явное соответствие по ID предзаказа, иначе по цене.
    const quality = leadQuality.resolveQuality(preorder, qualityMapping);
    const metadata = JSON.stringify({
      call_center_id: config.callCenterId,
      preorder_id: preorder.id,
      pravoved_lead_id: lead.id,
      lead_type: preorder.lead_type || null,
      lead_price: quality.price,
      lead_category_types: preorder.lead_category_types || null,
      quality_label: quality.label,
      quality_source: quality.source,
      city_id: lead.city_id || null,
      city_name: lead.city_name || null,
      region_id: lead.region_id || null,
      region_name: lead.region_name || null,
      sold_at: lead.date || null,
    });
    const [result] = await connection.query(
      `INSERT INTO call_center_leads
         (office_id,source,external_id,name,phone,description,status,score,quality_label,metadata,created_at)
       VALUES (?,'pravoved',?,?,?,?, 'NEW',?,?,?,COALESCE(?,CURRENT_TIMESTAMP))`,
      [config.targetOfficeId, externalId, name, phone, description,
       quality.score, quality.label, metadata, leadCreatedAt(lead.date)]
    );
    await connection.query(
      `INSERT INTO call_center_history (lead_id,action,details,created_at)
       VALUES (?,'LEAD_CREATED',?,CURRENT_TIMESTAMP)`,
      [result.insertId, JSON.stringify({
        source: 'pravoved',
        call_center_id: config.callCenterId,
        preorder_id: preorder.id,
        pravoved_lead_id: lead.id,
        quality_label: quality.label,
        quality_score: quality.score,
        quality_source: quality.source,
      })]
    );
    await connection.commit();
    try {
      socketEmitter.emitLeadNew(config.targetOfficeId, {
        id: result.insertId,
        client_name: name,
        source: 'pravoved',
      });
    } catch (_) { /* realtime is not critical for persistence */ }
    return { duplicate: false, id: result.insertId };
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    if (error?.code === 'ER_DUP_ENTRY') {
      const [[existing]] = await db.query(
        `SELECT id FROM call_center_leads
          WHERE office_id=? AND source='pravoved' AND external_id=? LIMIT 1`,
        [config.targetOfficeId, externalId]
      );
      return { duplicate: true, id: existing?.id || null };
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function loadConfigs() {
  const rows = await integrationStore.listActive('pravoved');
  integrationConfigs.clear();
  for (const row of rows) {
    integrationConfigs.set(Number(row.id), {
      id: Number(row.id),
      callCenterId: Number(row.call_center_id),
      targetOfficeId: Number(row.target_office_id),
      apiKey: row.api_key,
      accountIdentifier: row.account_identifier,
    });
  }
  return integrationConfigs;
}

async function allPreorders(token) {
  const result = [];
  for (let offset = 0; ; offset += 50) {
    if (offset > 0) await sleep(RATE_LIMIT_DELAY_MS);
    const page = await fetchPreorders(token, { limit: 50, offset, deleted: 0 });
    result.push(...page);
    if (page.length < 50) break;
  }
  return result;
}

async function syncConfig(config, { full = false } = {}) {
  let imported = 0;
  // Соответствия читаем один раз за проход, а не на каждый лид.
  // Пустая таблица не ошибка: качество тогда определится по цене.
  let qualityMapping = new Map();
  try {
    qualityMapping = await leadQuality.loadMapping(db, 'pravoved');
  } catch (error) {
    console.warn('[Pravoved] не удалось прочитать качество предзаказов:', error.message);
  }
  const preorders = full
    ? await allPreorders(config.apiKey)
    : await fetchPreorders(config.apiKey, { limit: 50, offset: 0, deleted: 0 });

  for (const preorder of preorders) {
    let offset = 0;
    do {
      await sleep(RATE_LIMIT_DELAY_MS);
      const leads = await fetchLeads(config.apiKey, preorder.id, { limit: 50, offset });
      for (const lead of leads) {
        const result = await upsertLead(config, preorder, lead, qualityMapping);
        if (!result.duplicate) imported += 1;
      }
      if (!full || leads.length < 50) break;
      offset += 50;
    } while (true);
  }
  return imported;
}

async function pollOnce({ fullIntegrationId = null } = {}) {
  if (pollRunning) return;
  pollRunning = true;
  try {
    for (const [integrationId, config] of integrationConfigs.entries()) {
      let imported = 0;
      try {
        imported = await syncConfig(config, { full: Number(fullIntegrationId) === Number(integrationId) });
        await integrationStore.markPoll(integrationId, { success: true });
        if (imported > 0) {
          console.log(`[Pravoved Poll] Call center ${config.callCenterId}: imported ${imported} new leads`);
        }
      } catch (error) {
        await integrationStore.markPoll(integrationId, { error: error.message }).catch(() => undefined);
        console.error(`[Pravoved Poll] Call center ${config.callCenterId}:`, error.message);
      }
    }
  } finally {
    pollRunning = false;
  }
}

function startPoller() {
  if (pollTimer) return;
  console.log(`[Pravoved] Poller started (every ${POLL_INTERVAL_MS / 1000}s)`);
  pollTimer = setInterval(() => pollOnce().catch((error) => console.error('[Pravoved Poll] Unhandled:', error.message)), POLL_INTERVAL_MS);
  setTimeout(() => pollOnce().catch((error) => console.error('[Pravoved Poll] Initial:', error.message)), 10000);
}

function stopPoller() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

async function reloadConfigs() {
  await loadConfigs();
  if (integrationConfigs.size > 0) startPoller();
}

async function init() {
  await loadConfigs();
  if (integrationConfigs.size > 0) {
    console.log(`[Pravoved] Loaded ${integrationConfigs.size} integration(s)`);
    startPoller();
  } else {
    console.log('[Pravoved] No active integrations found');
  }
}

module.exports = {
  auth,
  verifyKey,
  request,
  fetchPreorders,
  fetchLeads,
  allPreorders,
  syncConfig,
  upsertLead,
  loadConfigs,
  reloadConfigs,
  pollOnce,
  startPoller,
  stopPoller,
  init,
};
