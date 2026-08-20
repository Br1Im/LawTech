const db = require('../db');

const LEADERSHIP = ['director', 'manager', 'okk', 'admin', 'administrator'];

function dateInZone(date = new Date(), timeZone = 'Asia/Tomsk') {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch (_) {
    return date.toISOString().slice(0, 10);
  }
}

function dayDiff(targetDate, todayDate) {
  const target = Date.parse(`${String(targetDate).slice(0, 10)}T00:00:00Z`);
  const today = Date.parse(`${String(todayDate).slice(0, 10)}T00:00:00Z`);
  return Math.round((target - today) / 86400000);
}

function formatDate(value) {
  const [y, m, d] = String(value).slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;
}

async function recipientIds(contract) {
  const ids = new Set();
  for (const id of [contract.signer_user_id, contract.second_signer_user_id, contract.registered_by]) {
    if (Number(id)) ids.add(Number(id));
  }
  const [leaders] = await db.query(
    `SELECT DISTINCT u.id
       FROM users u
       LEFT JOIN user_offices uo ON uo.user_id = u.id AND uo.office_id = ?
       LEFT JOIN offices o ON o.id = ?
      WHERE u.is_active = 1 AND u.deleted_at IS NULL
        AND u.role IN (?)
        AND (u.office_id = ? OR uo.office_id IS NOT NULL OR (u.role = 'director' AND o.owner_id = u.id))`,
    [contract.office_id, contract.office_id, LEADERSHIP, contract.office_id]
  );
  leaders.forEach((u) => ids.add(Number(u.id)));
  return [...ids].filter(Boolean);
}

async function createNotification(userId, item, kind, title, message, type, dayKey) {
  const dueKey=String(item.due_date).slice(0,10);
  const dedupKey=kind==='overdue'?`installment:${item.installment_id}:${userId}:overdue:${dayKey}`:`installment:${item.installment_id}:${userId}:${dueKey}:${kind}`;
  await db.query(`INSERT IGNORE INTO notifications(user_id,office_id,contract_id,type,title,message,dedup_key) VALUES(?,?,?,?,?,?,?)`,[userId,item.office_id,item.id,type,title,message,dedupKey]);
}
async function runPaymentReminderSweep(){
 try{
  const[items]=await db.query(`SELECT c.id,c.office_id,c.contract_number,c.registered_by,c.id_employee,c.second_employee_id,
    i.id installment_id,i.amount,i.paid_amount,DATE_FORMAT(i.due_date,'%Y-%m-%d') due_date,
    e.user_id signer_user_id,e2.user_id second_signer_user_id,COALESCE(cl.name,'Клиент') client_name,COALESCE(o.timezone,'Asia/Tomsk') timezone
    FROM contract_payment_installments i JOIN contracts c ON c.id=i.contract_id JOIN offices o ON o.id=c.office_id
    LEFT JOIN clients cl ON cl.id=c.id_client LEFT JOIN employees e ON e.id=c.id_employee LEFT JOIN employees e2 ON e2.id=c.second_employee_id
    WHERE i.status IN('pending','partial') AND i.amount>i.paid_amount AND c.status<>'terminated'`);
  let created=0;
  for(const item of items){const today=dateInZone(new Date(),item.timezone),diff=dayDiff(item.due_date,today),left=Number(item.amount)-Number(item.paid_amount);let kind,title,message,type='warning';const details=`Договор ${item.contract_number||'#'+item.id}, ${item.client_name}. Доплата ${formatMoney(left)}, дата ${formatDate(item.due_date)}.`;
   if(diff===3){kind='3d';title='Доплата через 3 дня';message=details;}else if(diff===1){kind='1d';title='Доплата завтра';message=details;}else if(diff===0){kind='today';title='Сегодня дата доплаты';message=details;}else if(diff<0){kind='overdue';type='error';title='Доплата просрочена';message=`${details} Просрочка: ${Math.abs(diff)} дн.`;}else continue;
   for(const uid of await recipientIds(item)){await createNotification(uid,item,kind,title,message,type,today);created++;}
  }
  console.log(`[paymentReminderService] sweep: installments=${items.length}, notifications=${created}`);return{installments:items.length,notifications:created};
 }catch(error){console.error('[paymentReminderService] sweep error:',error.message);throw error;}
}

function startScheduler() {
  setTimeout(() => runPaymentReminderSweep().catch(() => {}), 10000);
  setInterval(() => runPaymentReminderSweep().catch(() => {}), 60 * 60 * 1000);
  console.log('[paymentReminderService] scheduler started (3d, 1d, today, overdue)');
}

module.exports = { dateInZone, dayDiff, runPaymentReminderSweep, startScheduler };
