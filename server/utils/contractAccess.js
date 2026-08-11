const db = require('../db');
const LEADERSHIP = new Set(['admin','administrator','owner','director','manager','okk']);

async function canAccessContract(user, contractId, connection = db) {
  const role = String(user?.role || '').toLowerCase();
  const [[contract]] = await connection.query(
    'SELECT id, office_id, representative_id, expert_id, id_employee FROM contracts WHERE id = ?',
    [contractId]
  );
  if (!contract) return false;

  const { checkOfficeAccess } = require('./ensureOffice');
  if (!await checkOfficeAccess(user, contract.office_id)) return false;
  if (LEADERSHIP.has(role)) return true;
  if (['cc_manager', 'cc_operator'].includes(role)) return false;

  const [[assignment]] = await connection.query(
    'SELECT 1 FROM contract_assignments WHERE contract_id = ? AND user_id = ? LIMIT 1',
    [contractId, user.id]
  );
  if (assignment) return true;

  if (role === 'representative') {
    return Number(contract.representative_id) === Number(user.id);
  }

  if (role === 'expert') {
    // expert_id stores employees.id; compare through the canonical user link.
    const [[expertEmployee]] = await connection.query(
      'SELECT id FROM employees WHERE user_id = ? LIMIT 1',
      [user.id]
    );
    return !!expertEmployee && Number(contract.expert_id) === Number(expertEmployee.id);
  }

  const [[employee]] = await connection.query(
    'SELECT user_id FROM employees WHERE id = ?',
    [contract.id_employee]
  );
  return !!employee && Number(employee.user_id) === Number(user.id);
}

module.exports = { canAccessContract, LEADERSHIP };
