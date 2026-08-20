const db = require('../db');
const { normalizeEmployeeId } = require('../utils/employeeIdentity');

async function validateExpertDeadline(connection, contractId, expertId, days) {
  const expert = Number(expertId); const deadlineDays = Number(days);
  if (!Number.isInteger(expert) || expert <= 0) { const e = new Error('EXPERT_REQUIRED'); e.status = 400; throw e; }
  if (!Number.isInteger(deadlineDays) || deadlineDays < 1 || deadlineDays > 365) { const e = new Error('DEADLINE_DAYS_INVALID'); e.status = 400; throw e; }
  const [[contract]] = await connection.query('SELECT id, office_id, contract_type FROM contracts WHERE id=? FOR UPDATE', [contractId]);
  if (!contract) { const e = new Error('CONTRACT_NOT_FOUND'); e.status = 404; throw e; }
  if ((contract.contract_type || 'docs') !== 'docs') { const e = new Error('DOCS_ONLY'); e.status = 400; throw e; }
  const normalizedId = await normalizeEmployeeId(expert, { role: 'expert', officeId: contract.office_id }, connection);
  const [[employee]] = normalizedId ? await connection.query('SELECT id,user_id FROM employees WHERE id=? LIMIT 1',[normalizedId]) : [[]];
  if (!employee) { const e = new Error('EXPERT_NOT_AVAILABLE'); e.status = 400; throw e; }
  return { contract, employee, expert: Number(employee.id), deadlineDays };
}

async function applyExpertDeadline(connection, contractId, expertId, days) {
  const v = await validateExpertDeadline(connection, contractId, expertId, days);
  await connection.query(`UPDATE contracts SET expert_id=?, expert_deadline_days=?, expert_deadline=DATE_ADD(CURDATE(), INTERVAL ? DAY), expert_deadline_time=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [v.expert,v.deadlineDays,v.deadlineDays,contractId]);
  await connection.query(`DELETE ca FROM contract_assignments ca WHERE ca.contract_id=? AND ca.role='expert' AND ca.assignment_type='manual'`, [contractId]);
  await connection.query(`INSERT INTO contract_assignments(contract_id,user_id,role,assignment_type,status) VALUES (?,?,'expert','manual','pending') ON DUPLICATE KEY UPDATE role='expert',assignment_type='manual',status='pending',assigned_at=CURRENT_TIMESTAMP`, [contractId,v.employee.user_id]);
  return v;
}

function publicMessage(error) {
  return ({EXPERT_REQUIRED:'???????? ????????',DEADLINE_DAYS_INVALID:'??????? ???? ?? 1 ?? 365 ????',CONTRACT_NOT_FOUND:'??????? ?? ??????',DOCS_ONLY:'???? ???????? ???????? ?????? ??? ?????????? ??????????',EXPERT_NOT_AVAILABLE:'??????? ?????????? ? ???? ?????'})[error.message] || '?? ??????? ????????? ???????? ? ????';
}
module.exports={applyExpertDeadline,validateExpertDeadline,publicMessage};
