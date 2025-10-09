const db = require('./db');

async function updateContractStatuses() {
  try {
    const [result] = await db.query('UPDATE contracts SET status = ? WHERE status = ?', ['Подписан', 'active']);
    console.log(`Updated ${result.affectedRows} contracts from 'active' to 'Подписан'`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating contract statuses:', error);
    process.exit(1);
  }
}

updateContractStatuses();