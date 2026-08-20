const fs=require('fs');
const db=require('/app/db');
const pkg=JSON.parse(fs.readFileSync('/app/scripts/novokuznetsk_balance_package.json','utf8'));
const O=31,U=94,B=['cash','noncash','bank'];
function category(t){t=String(t||'').toLowerCase();if(t.includes('зп')||t.includes('аванс'))return'Зарплата';if(t.includes('лид')||t.includes('вип')||t.includes('репутац'))return'Маркетинг';if(t.includes('аренд')||t.includes('квартир'))return'Аренда';if(t.includes('интернет')||t.includes('телефон'))return'Связь';if(t.includes('комисс'))return'Банковские комиссии';if(t.includes('бонус'))return'Бонусы';return'Прочее'}
(async()=>{
 const c=await db.getClient();
 try{
  await c.beginTransaction();
  const [ids]=await c.query('SELECT id FROM contracts WHERE office_id=?',[O]);
  const marks=ids.map(()=>'?').join(',');
  if(marks) await c.query(`UPDATE contract_payments SET comment=CASE WHEN comment LIKE '[BALANCE_SOURCE_EXCLUDED]%' THEN comment ELSE CONCAT('[BALANCE_SOURCE_EXCLUDED] ',COALESCE(comment,'')) END WHERE contract_id IN (${marks})`,ids.map(x=>x.id));
  await c.query('DELETE FROM office_income WHERE office_id=?',[O]);
  await c.query('DELETE FROM office_transfers WHERE office_id=?',[O]);
  await c.query('DELETE FROM expenses WHERE office_id=?',[O]);
  await c.query('DELETE FROM office_balance_opening WHERE office_id=?',[O]);
  await c.query('INSERT INTO office_balance_opening(office_id,start_date,opening_cash,opening_noncash,opening_bank,created_by) VALUES(?,?,0,0,0,?)',[O,'2026-06-09',U]);
  const dayBy=Object.fromEntries(pkg.days.map(x=>[x.date,x]));
  const accepted=pkg.transfers.filter(t=>{const d=dayBy[t.date];return d&&d.expense[t.source]+.001>=t.amount&&d.income[t.destination]+.001>=t.amount});
  const src={},dst={};
  for(const t of accepted){
   if(!src[t.date])src[t.date]={cash:0,noncash:0,bank:0};if(!dst[t.date])dst[t.date]={cash:0,noncash:0,bank:0};src[t.date][t.source]+=t.amount;dst[t.date][t.destination]+=t.amount;
   await c.query('INSERT INTO office_transfers(office_id,source_bucket,destination_bucket,amount,transfer_date,comment,created_by) VALUES(?,?,?,?,?,?,?)',[O,t.source,t.destination,t.amount,t.date,'Конвертация из Google Sheets: '+t.comment,U]);
  }
  const lines={};for(const x of pkg.line_items){const k=x.date+'|'+x.bucket;if(!lines[k])lines[k]=[];lines[k].push(x)}
  let incomeRows=0,expenseRows=0;
  for(const d of pkg.days){
   for(const b of B){
    const inc=d.income[b]-((dst[d.date]||{})[b]||0);
    if(inc>0){await c.query("INSERT INTO office_income(office_id,income_date,payment_method,amount,title,description,created_by,source_type) VALUES(?,?,?,?,?,?,?,'google_sheets_balance')",[O,d.date,b,inc,'Поступления по таблице баланса','Импорт Google Sheets. Канал: '+b,U]);incomeRows++}
    const target=d.expense[b]-((src[d.date]||{})[b]||0);
    if(target<=0)continue;
    const candidates=(lines[d.date+'|'+b]||[]).filter(x=>!x.transfer_hint);
    const sum=candidates.reduce((a,x)=>a+x.amount,0);
    if(candidates.length&&sum<=target+.01){
     for(const x of candidates){await c.query("INSERT INTO expenses(office_id,category,amount,expense_type,payment_method,is_auto,source_type,title,description,spent_on,created_by) VALUES(?,?,?,'Разовый',?,0,'google_sheets_balance',?,?,?,?)",[O,category(x.title),x.amount,b,x.title||'Расход',x.raw,d.date,U]);expenseRows++}
     const rest=target-sum;if(rest>.01){await c.query("INSERT INTO expenses(office_id,category,amount,expense_type,payment_method,is_auto,source_type,title,description,spent_on,created_by) VALUES(?,'Прочее',?,'Разовый',?,0,'google_sheets_balance','Остаток расходов по ведомости',?,?,?)",[O,rest,b,d.description||'Расшифровка отсутствует',d.date,U]);expenseRows++}
    }else{
     await c.query("INSERT INTO expenses(office_id,category,amount,expense_type,payment_method,is_auto,source_type,title,description,spent_on,created_by) VALUES(?,'Прочее',?,'Разовый',?,0,'google_sheets_balance','Расходы по дневной ведомости',?,?,?)",[O,target,b,d.description||'Расшифровка отсутствует',d.date,U]);expenseRows++;
    }
   }
  }
  await c.commit();
  console.log(JSON.stringify({acceptedTransfers:accepted.length,transferTotal:accepted.reduce((a,x)=>a+x.amount,0),incomeRows,expenseRows,opening:'2026-06-09'},null,2));
  c.release();process.exit(0);
 }catch(e){try{await c.rollback()}catch(_){}c.release();throw e}
})().catch(e=>{console.error(e);process.exit(1)});