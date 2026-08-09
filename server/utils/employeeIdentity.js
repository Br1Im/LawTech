const db = require('../db');
async function employeeIdForUser(userId, connection=db) {
  const [[row]] = await connection.query(`SELECT id FROM employees WHERE user_id=? OR id=? ORDER BY user_id=? DESC LIMIT 1`,[userId,userId,userId]);
  return row ? Number(row.id) : null;
}
async function userForEmployee(employeeId, connection=db) {
  const [[row]] = await connection.query(`SELECT u.id,u.role,u.office_id FROM employees e LEFT JOIN users u ON u.id=e.user_id WHERE e.id=? LIMIT 1`,[employeeId]);
  return row && row.id ? row : null;
}
module.exports={employeeIdForUser,userForEmployee};
