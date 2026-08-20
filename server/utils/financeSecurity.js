const db = require('../db');
const { checkOfficeAccess } = require('./ensureOffice');

const FINANCE_WRITE_ROLES = new Set(['director', 'manager', 'okk']);
const FINANCE_READ_ROLES = new Set(['director', 'manager', 'okk']);
const BUCKETS = new Set(['cash', 'noncash', 'bank']);
const MAX_MONEY = 1000000000000;

const role = user => String(user?.role || '').toLowerCase();
const canWriteFinance = user => FINANCE_WRITE_ROLES.has(role(user));
const canReadFinance = user => FINANCE_READ_ROLES.has(role(user));
const money = value => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_MONEY) return null;
  return Math.round(n * 100) / 100;
};
const nonNegativeMoney = value => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > MAX_MONEY) return null;
  return Math.round(n * 100) / 100;
};
const dateOnly = value => {
  const text = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const d = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== text ? null : text;
};
async function requireOfficeWrite(req, res, officeId) {
  if (!canWriteFinance(req.user)) { res.status(403).json({ success:false, message:'Финансовые операции доступны только руководству' }); return false; }
  if (!officeId || !await checkOfficeAccess(req.user, officeId)) { res.status(403).json({ success:false, message:'Нет доступа к офису' }); return false; }
  return true;
}
async function availableBalance(connection, officeId, bucket, throughDate) {
  const norm = pm => pm === 'sbp' ? 'bank' : pm === 'card' ? 'noncash' : pm;
  const [[opening]] = await connection.query('SELECT * FROM office_balance_opening WHERE office_id=?', [officeId]);
  const start = opening ? new Date(opening.start_date).toISOString().slice(0,10) : '2000-01-01';
  const balances = {
    cash: Number(opening?.opening_cash || 0),
    noncash: Number(opening?.opening_noncash || 0),
    bank: Number(opening?.opening_bank || 0),
  };
  const add = (pm, n) => { const b=norm(pm); if (b in balances) balances[b] += Number(n || 0); };
  const [payments] = await connection.query(`SELECT p.payment_method pm,COALESCE(SUM(p.amount),0) s FROM contract_payments p JOIN contracts c ON c.id=p.contract_id WHERE c.office_id=? AND p.confirmed=1 AND COALESCE(p.comment,'') NOT LIKE '[BALANCE_SOURCE_EXCLUDED]%' AND p.payment_date BETWEEN ? AND ? GROUP BY p.payment_method`,[officeId,start,throughDate]);
  payments.forEach(r=>add(r.pm,r.s));
  const [incomes] = await connection.query(`SELECT payment_method pm,COALESCE(SUM(amount),0) s FROM office_income WHERE office_id=? AND income_date BETWEEN ? AND ? GROUP BY payment_method`,[officeId,start,throughDate]);
  incomes.forEach(r=>add(r.pm,r.s));
  const [expenses] = await connection.query(`SELECT payment_method pm,COALESCE(SUM(amount),0) s FROM expenses WHERE office_id=? AND spent_on BETWEEN ? AND ? GROUP BY payment_method`,[officeId,start,throughDate]);
  expenses.forEach(r=>add(r.pm,-Number(r.s||0)));
  const [transfers] = await connection.query(`SELECT source_bucket,destination_bucket,COALESCE(SUM(amount),0) s FROM office_transfers WHERE office_id=? AND transfer_date BETWEEN ? AND ? GROUP BY source_bucket,destination_bucket`,[officeId,start,throughDate]);
  transfers.forEach(r=>{add(r.source_bucket,-Number(r.s||0));add(r.destination_bucket,r.s)});
  return Number(balances[bucket] || 0);
}

async function claimIdempotency(connection, req, scope, officeId) {
  const key=String(req.get?.('idempotency-key')||'').trim();
  if(!/^[A-Za-z0-9._:-]{8,128}$/.test(key)){const e=new Error('Для финансовой операции нужен корректный Idempotency-Key');e.statusCode=400;throw e;}
  try{await connection.query('INSERT INTO financial_idempotency_keys (user_id,scope,request_key,office_id) VALUES (?,?,?,?)',[req.user.id,scope,key,officeId||null]);return key}
  catch(e){if(e.code==='ER_DUP_ENTRY'){const x=new Error('Этот финансовый запрос уже обработан');x.statusCode=409;throw x}throw e}
}

async function audit(connection, req, action, entityType, entityId, officeId, amount=null, metadata=null) {
  await connection.query(`INSERT INTO financial_audit_log (office_id,user_id,action,entity_type,entity_id,amount,ip_address,user_agent,metadata) VALUES (?,?,?,?,?,?,?,?,?)`,[
    officeId || null, req.user?.id || null, action, entityType, entityId ? String(entityId) : null, amount,
    String(req.ip || req.socket?.remoteAddress || '').slice(0,64) || null,
    String(req.get?.('user-agent') || '').slice(0,500) || null,
    metadata ? JSON.stringify(metadata) : null,
  ]);
}
module.exports={FINANCE_WRITE_ROLES,FINANCE_READ_ROLES,BUCKETS,canWriteFinance,canReadFinance,money,nonNegativeMoney,dateOnly,requireOfficeWrite,availableBalance,claimIdempotency,audit};
