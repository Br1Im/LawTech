/**
 * Правовед (myleads.feedot.com) API integration service.
 * Документация: https://myleads.feedot.com/api-doc/
 *
 * - auth(email, password)  -> получить access_token по логину/паролю аккаунта
 * - verifyKey(token)       -> проверить ключ запросом списка предзаказов
 */

const https = require('https');

const API_HOST = 'api.myleads.feedot.com';
const REQUEST_TIMEOUT_MS = 30000;

function request(method, path, { token, form } = {}) {
  return new Promise((resolve, reject) => {
    const headers = {};
    let body = null;

    if (form) {
      const boundary = '----LawTechForm' + Date.now();
      const parts = [];
      for (const [key, value] of Object.entries(form)) {
        parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`);
      }
      parts.push(`--${boundary}--\r\n`);
      body = Buffer.from(parts.join(''), 'utf8');
      headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
      headers['Content-Length'] = body.length;
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request({ hostname: API_HOST, port: 443, path, method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (_) {
          /* ответ не JSON — оставляем raw */
        }
        resolve({ statusCode: res.statusCode, data: parsed, raw: data });
      });
    });

    req.on('error', reject);
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error('Pravoved request timeout'));
    });
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Получить access_token по логину/паролю аккаунта Правовед.
 */
async function auth(email, password) {
  const res = await request('POST', '/restv2/auth/', { form: { email, password } });
  if (res.statusCode === 200 && res.data && res.data.status === 'success' && res.data.access_token) {
    return res.data.access_token;
  }
  const message = (res.data && (res.data.message || res.data.status)) || `HTTP ${res.statusCode}`;
  const err = new Error(`Не удалось получить ключ доступа Правовед: ${message}`);
  err.statusCode = res.statusCode;
  throw err;
}

/**
 * Проверить ключ: запросить список предзаказов.
 * Возвращает { ok, preordersCount } либо { ok: false, statusCode, message }.
 */
async function verifyKey(token) {
  const res = await request('GET', '/restv2/preorders/?limit=10', { token });
  if (res.statusCode === 200) {
    let preorders = null;
    if (Array.isArray(res.data)) {
      preorders = res.data;
    } else if (res.data && Array.isArray(res.data.preorders)) {
      preorders = res.data.preorders;
    }
    return { ok: true, preordersCount: Array.isArray(preorders) ? preorders.length : null };
  }
  return {
    ok: false,
    statusCode: res.statusCode,
    message: (res.data && res.data.message) || (res.raw ? String(res.raw).slice(0, 200) : `HTTP ${res.statusCode}`),
  };
}

module.exports = { auth, verifyKey, request };
