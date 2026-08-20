const db = require('../db');
const round = v => Math.round(Number(v || 0) * 100) / 100;
async function reconcileInstallments(connection, contractId) {
  const [[contract]] = await connection.query('SELECT paid_amount FROM contracts WHERE id=?', [contractId]);
  const [[initial]] = await connection.query("SELECT COALESCE(SUM(amount),0) total FROM contract_payments WHERE contract_id=? AND confirmed=1 AND payment_type='initial'", [contractId]);
  let available = Math.max(0, round(contract?.paid_amount) - round(initial?.total));
  const [rows] = await connection.query("SELECT id,amount FROM contract_payment_installments WHERE contract_id=? AND status<>'cancelled' ORDER BY due_date,id FOR UPDATE", [contractId]);
  for (const row of rows) {
    const paid = Math.min(round(row.amount), available); available = round(available - paid);
    const status = paid >= round(row.amount) ? 'paid' : paid > 0 ? 'partial' : 'pending';
    await connection.query('UPDATE contract_payment_installments SET paid_amount=?,status=? WHERE id=?',[paid,status,row.id]);
  }
}
async function syncLegacyFields(connection, contractId) {
  const [[next]] = await connection.query("SELECT due_date,ROUND(amount-paid_amount,2) amount FROM contract_payment_installments WHERE contract_id=? AND status IN ('pending','partial') ORDER BY due_date,id LIMIT 1",[contractId]);
  await connection.query('UPDATE contracts SET additional_payment_date=?,additional_payment_amount=? WHERE id=?',[next?.due_date||null,next?.amount||null,contractId]);
}
module.exports={reconcileInstallments,syncLegacyFields};
