const db = require('../db');

async function employeeIdForUser(userId, connection = db, officeId = null) {
  const n = Number(userId);
  if (!Number.isInteger(n) || n <= 0) return null;
  const params = [n];
  let office = '';
  if (officeId != null) {
    office = ' AND e.office_id = ?';
    params.push(Number(officeId));
  }
  const [[row]] = await connection.query(
    `SELECT e.id FROM employees e WHERE e.user_id = ? AND e.deleted_at IS NULL${office} LIMIT 1`,
    params
  );
  return row ? Number(row.id) : null;
}

async function userForEmployee(employeeId, connection = db, officeId = null) {
  const n = Number(employeeId);
  if (!Number.isInteger(n) || n <= 0) return null;
  const params = [n];
  let office = '';
  if (officeId != null) {
    office = ' AND e.office_id = ?';
    params.push(Number(officeId));
  }
  const [[row]] = await connection.query(
    `SELECT u.id, u.role, u.office_id
       FROM employees e
       JOIN users u ON u.id = e.user_id
      WHERE e.id = ? AND e.deleted_at IS NULL AND u.is_active = 1 AND u.deleted_at IS NULL${office}
      LIMIT 1`,
    params
  );
  return row || null;
}

async function userIdForEmployee(employeeId, connection = db, officeId = null) {
  const user = await userForEmployee(employeeId, connection, officeId);
  return user ? Number(user.id) : null;
}

async function normalizeEmployeeId(value, { role = null, officeId = null } = {}, connection = db) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  const where = ['e.deleted_at IS NULL', 'u.is_active = 1', 'u.deleted_at IS NULL'];
  const params = [n, n];
  if (role) { where.push('u.role = ?'); params.push(role); }
  if (officeId) { where.push('e.office_id = ?'); params.push(Number(officeId)); }
  const [[row]] = await connection.query(
    `SELECT e.id, e.user_id, u.role, e.office_id
       FROM employees e JOIN users u ON u.id = e.user_id
      WHERE (e.id = ? OR e.user_id = ?) AND ${where.join(' AND ')}
      ORDER BY (e.id = ?) DESC LIMIT 1`,
    [...params, n]
  );
  return row ? Number(row.id) : null;
}

module.exports = { employeeIdForUser, userForEmployee, userIdForEmployee, normalizeEmployeeId };
