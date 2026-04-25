/**
 * ensureUserOffice — гарантирует, что у пользователя есть привязанный офис.
 *
 * Если у пользователя (по JWT) отсутствует `office_id`, функция создаёт
 * для него персональный офис в таблице `offices`, обновляет
 * `users.office_id` и возвращает `officeId`. JWT-объект `user` мутируется,
 * чтобы последующий код в контроллере видел актуальный `user.office_id`.
 */
const db = require('../db');

async function ensureUserOffice(user) {
  if (!user || !user.id) {
    throw new Error('ensureUserOffice: user is required');
  }

  // Сначала — актуальное значение из БД (JWT может быть устаревшим).
  const [rows] = await db.query(
    'SELECT first_name, last_name, email, office_id FROM users WHERE id = ? LIMIT 1',
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

module.exports = { ensureUserOffice };
