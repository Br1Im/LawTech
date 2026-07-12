/**
 * ensureUserOffice — гарантирует, что у пользователя есть привязанный офис.
 *
 * Для директоров НЕ создаёт автоматически офис — директор должен создать
 * его явно через UI. Для остальных ролей — создаёт персональный офис, если нет.
 */
const db = require('../db');

async function ensureUserOffice(user) {
  if (!user || !user.id) {
    throw new Error('ensureUserOffice: user is required');
  }

  // Если office_id уже установлен (например, через X-Office-Id заголовок) — используем его
  if (user.office_id) {
    return Number(user.office_id);
  }

  const [rows] = await db.query(
    'SELECT first_name, last_name, email, office_id, role FROM users WHERE id = ? LIMIT 1',
    [user.id]
  );
  const row = rows && rows[0];
  if (!row) {
    throw new Error('ensureUserOffice: пользователь не найден');
  }

  if (row.office_id) {
    user.office_id = row.office_id;
    return row.office_id;
  }

  // Директор должен создать офис вручную
  if (row.role === 'director') {
    return null;
  }

  const ownerName = [row.first_name, row.last_name]
    .filter(Boolean)
    .map((s) => String(s).trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  const baseName = ownerName || (row.email ? row.email.split('@')[0] : '') || 'Мой';
  const officeName = `${baseName} — офис`;

  const [result] = await db.query(
    `INSERT INTO offices (name, created_at, updated_at) VALUES (?, NOW(), NOW())`,
    [officeName]
  );
  const officeId = result.insertId;

  await db.query(`UPDATE users SET office_id = ? WHERE id = ?`, [officeId, user.id]);
  user.office_id = officeId;
  return officeId;
}

/**
 * checkOfficeAccess — проверяет, имеет ли пользователь доступ к указанному офису.
 *
 * owner (системная роль) — без ограничений.
 * director — офисы, где он owner_id.
 * Остальные роли — свой office_id ИЛИ любой офис из user_offices.
 */
async function checkOfficeAccess(user, officeId) {
  if (!user || !user.id || !officeId) return false;
  const role = String(user.role || '').toLowerCase();
  const numOfficeId = Number(officeId);

  // Системная роль owner — доступ ко всему
  if (role === 'owner') return true;

  // Директор — только свои офисы (где owner_id = user.id)
  if (role === 'director') {
    const [offices] = await db.query(
      'SELECT id FROM offices WHERE id = ? AND owner_id = ?',
      [numOfficeId, user.id]
    );
    return offices.length > 0;
  }

  // Остальные роли — проверяем user_offices (включает основной офис)
  const [uoRows] = await db.query(
    'SELECT 1 FROM user_offices WHERE user_id = ? AND office_id = ? LIMIT 1',
    [user.id, numOfficeId]
  );
  if (uoRows.length > 0) return true;

  // Fallback: проверяем users.office_id напрямую (на случай если user_offices не синхронизирован)
  let userOfficeId = user.office_id;
  if (!userOfficeId) {
    const [rows] = await db.query('SELECT office_id FROM users WHERE id = ? LIMIT 1', [user.id]);
    if (rows[0]) userOfficeId = rows[0].office_id;
  }
  return Number(userOfficeId) === numOfficeId;
}

/**
 * getUserOfficeIds — возвращает список office_id, к которым у пользователя есть доступ.
 *
 * Для директора — все его офисы (owner_id), но только в контексте текущего активного
 *   (данные между офисами не должны пересекаться для директора).
 * Для остальных ролей — все офисы из user_offices.
 * Если user_offices пуст — fallback на users.office_id.
 */
async function getUserOfficeIds(user) {
  if (!user || !user.id) return [];
  const role = String(user.role || '').toLowerCase();

  // Директор: только активный офис (данные между офисами не пересекаются)
  if (role === 'director') {
    let userOfficeId = user.office_id;
    if (!userOfficeId) {
      const [rows] = await db.query('SELECT office_id FROM users WHERE id = ? LIMIT 1', [user.id]);
      if (rows[0]) userOfficeId = rows[0].office_id;
    }
    return userOfficeId ? [Number(userOfficeId)] : [];
  }

  // Остальные роли: все офисы из user_offices
  const [uoRows] = await db.query(
    'SELECT office_id FROM user_offices WHERE user_id = ?',
    [user.id]
  );
  if (uoRows.length > 0) {
    const allowedOffices = uoRows.map(r => Number(r.office_id));
    // Если активный офис (из X-Office-Id) входит в список доступных —
    // ограничиваемся им, чтобы переключение офиса реально меняло данные
    // (раньше мульти-офисный сотрудник всегда видел все офисы сразу).
    const activeOfficeId = Number(user.office_id);
    if (activeOfficeId && allowedOffices.includes(activeOfficeId)) {
      return [activeOfficeId];
    }
    return allowedOffices;
  }

  // Fallback: users.office_id
  let userOfficeId = user.office_id;
  if (!userOfficeId) {
    const [rows] = await db.query('SELECT office_id FROM users WHERE id = ? LIMIT 1', [user.id]);
    if (rows[0]) userOfficeId = rows[0].office_id;
  }
  return userOfficeId ? [Number(userOfficeId)] : [];
}

module.exports = { ensureUserOffice, checkOfficeAccess, getUserOfficeIds };
