/**
 * Управление API-ключами поставщиков лидов (Правовед / myleads.feedot.com) по офисам.
 * Доступ: только генеральный директор (роль director) — владелец офиса.
 */

const db = require('../db');
const pravovedService = require('../services/pravovedService');

const SUPPORTED_PROVIDERS = ['pravoved'];

function maskKey(key) {
  const s = String(key || '');
  if (s.length <= 8) return '****';
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

async function ensureDirectorOwnsOffice(req, res, officeId) {
  if (String(req.user.role || '').toLowerCase() !== 'director') {
    res.status(403).json({ success: false, message: 'Доступно только генеральному директору' });
    return null;
  }
  if (!officeId) {
    res.status(400).json({ success: false, message: 'Не указан офис' });
    return null;
  }
  const [offices] = await db.query('SELECT id, name, owner_id FROM offices WHERE id = ? LIMIT 1', [officeId]);
  if (!offices.length) {
    res.status(404).json({ success: false, message: 'Офис не найден' });
    return null;
  }
  if (Number(offices[0].owner_id) !== Number(req.user.id)) {
    res.status(403).json({ success: false, message: 'Вы не являетесь владельцем этого офиса' });
    return null;
  }
  return offices[0];
}

function resolveOfficeId(req) {
  const explicit = parseInt((req.query && req.query.officeId) || (req.body && req.body.officeId), 10);
  return explicit || Number(req.user.office_id) || null;
}

/**
 * GET /api/lead-api-keys — список ключей текущего офиса (значения замаскированы)
 */
exports.list = async (req, res) => {
  try {
    const officeId = resolveOfficeId(req);
    const office = await ensureDirectorOwnsOffice(req, res, officeId);
    if (!office) return;

    const [rows] = await db.query(
      `SELECT id, office_id, provider, label, api_key, is_active, last_verified_at, created_at
         FROM office_lead_api_keys
        WHERE office_id = ?
        ORDER BY created_at DESC`,
      [officeId]
    );

    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        office_id: r.office_id,
        provider: r.provider,
        label: r.label,
        api_key_masked: maskKey(r.api_key),
        is_active: r.is_active,
        last_verified_at: r.last_verified_at,
        created_at: r.created_at,
      })),
    });
  } catch (error) {
    console.error('[leadApiKeys] list error:', error);
    res.status(500).json({ success: false, message: 'Не удалось получить список ключей' });
  }
};

/**
 * POST /api/lead-api-keys — добавить ключ.
 * Тело: { apiKey } ИЛИ { email, password } (+ label, provider, officeId — опционально).
 * Если передан email/пароль — получаем access_token у Правоведа автоматически.
 */
exports.create = async (req, res) => {
  try {
    const officeId = resolveOfficeId(req);
    const office = await ensureDirectorOwnsOffice(req, res, officeId);
    if (!office) return;

    const { apiKey, email, password, label, provider } = req.body || {};
    const prov = String(provider || 'pravoved').toLowerCase();
    if (!SUPPORTED_PROVIDERS.includes(prov)) {
      return res.status(400).json({ success: false, message: 'Неизвестный поставщик лидов' });
    }

    let key = String(apiKey || '').trim();
    let finalLabel = String(label || '').trim() || null;

    if (!key) {
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Укажите API-ключ, либо email и пароль аккаунта Правовед' });
      }
      key = await pravovedService.auth(String(email).trim(), String(password));
      if (!finalLabel) finalLabel = String(email).trim();
    }

    // Проверяем ключ (сетевые ошибки не блокируют сохранение)
    let verified = null;
    try {
      const v = await pravovedService.verifyKey(key);
      verified = v.ok;
    } catch (_) {
      verified = null;
    }

    const [result] = await db.query(
      `INSERT INTO office_lead_api_keys (office_id, provider, label, api_key, is_active, created_by, last_verified_at)
       VALUES (?, ?, ?, ?, 1, ?, ${verified ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
      [officeId, prov, finalLabel, key, req.user.id]
    );

    res.status(201).json({
      success: true,
      data: { id: result.insertId, verified },
      message: verified === false
        ? 'Ключ сохранён, но проверка не прошла — проверьте его корректность'
        : 'Ключ добавлен',
    });
  } catch (error) {
    console.error('[leadApiKeys] create error:', error);
    const clientError = error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 400;
    res.status(clientError ? 400 : 500).json({ success: false, message: error.message || 'Не удалось добавить ключ' });
  }
};

/**
 * POST /api/lead-api-keys/:id/verify — проверить ключ запросом к API Правовед
 */
exports.verify = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await db.query('SELECT id, office_id, api_key FROM office_lead_api_keys WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Ключ не найден' });
    }
    const office = await ensureDirectorOwnsOffice(req, res, rows[0].office_id);
    if (!office) return;

    const result = await pravovedService.verifyKey(rows[0].api_key);
    if (result.ok) {
      await db.query('UPDATE office_lead_api_keys SET last_verified_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[leadApiKeys] verify error:', error);
    res.status(500).json({ success: false, message: 'Не удалось проверить ключ' });
  }
};

/**
 * PATCH /api/lead-api-keys/:id — обновить label / is_active
 */
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await db.query('SELECT id, office_id FROM office_lead_api_keys WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Ключ не найден' });
    }
    const office = await ensureDirectorOwnsOffice(req, res, rows[0].office_id);
    if (!office) return;

    const updates = [];
    const params = [];
    if (req.body && req.body.label !== undefined) {
      updates.push('label = ?');
      params.push(String(req.body.label || '').trim() || null);
    }
    if (req.body && req.body.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(req.body.is_active ? 1 : 0);
    }
    if (!updates.length) {
      return res.status(400).json({ success: false, message: 'Нет изменений' });
    }
    params.push(id);
    await db.query(`UPDATE office_lead_api_keys SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'Ключ обновлён' });
  } catch (error) {
    console.error('[leadApiKeys] update error:', error);
    res.status(500).json({ success: false, message: 'Не удалось обновить ключ' });
  }
};

/**
 * DELETE /api/lead-api-keys/:id — удалить ключ
 */
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await db.query('SELECT id, office_id FROM office_lead_api_keys WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Ключ не найден' });
    }
    const office = await ensureDirectorOwnsOffice(req, res, rows[0].office_id);
    if (!office) return;

    await db.query('DELETE FROM office_lead_api_keys WHERE id = ?', [id]);
    res.json({ success: true, message: 'Ключ удалён' });
  } catch (error) {
    console.error('[leadApiKeys] remove error:', error);
    res.status(500).json({ success: false, message: 'Не удалось удалить ключ' });
  }
};
