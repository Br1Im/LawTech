const fs=require('fs');
const db=require('/app/db');
const pkg=JSON.parse(fs.readFileSync('/app/scripts/novokuznetsk_migration_package.json','utf8'));
const APPLY=process.argv.includes('--apply');
const OFFICE_ID=31, ADMIN_USER=94, DIRECTOR_USER=71;
const canon=s=>{let x=String(s||'').replace(/\D/g,'').replace(/^0+/,'')||'0';return ({'10062604':'10062601','2306202601':'23062601'})[x]||x};
const norm=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]/g,'');
const firstSurname=s=>String(s||'').split('/').map(x=>x.trim()).filter(Boolean);
async function main(){
 const conn=await db.getClient();
 try{
  const [[office]]=await conn.query('SELECT * FROM offices WHERE id=? AND name=?',[OFFICE_ID,pkg.meta.office]); if(!office)throw new Error('Target office mismatch');
  const [emps]=await conn.query(`SELECT e.*,u.role,u.is_active FROM employees e LEFT JOIN users u ON u.id=e.user_id WHERE e.office_id=? AND e.deleted_at IS NULL`,[OFFICE_ID]);
  const activeK=emps.find(e=>norm(e.last_name)==='курбанов'&&Number(e.is_active)===1)||emps.find(e=>norm(e.last_name)==='курбанов');
  const aliases={
   'давтян':emps.find(e=>norm(e.last_name)==='давтян'), 'курбанов':activeK,
   'откидач':emps.find(e=>norm(e.last_name)==='откидач'), 'вожигова':emps.find(e=>norm(e.last_name)==='вожигова'), 'вожегова':emps.find(e=>norm(e.last_name)==='вожигова'),
   'березина':emps.find(e=>norm(e.last_name)==='березина'), 'мещеряков':emps.find(e=>norm(e.last_name)==='мещеряков'), 'менщеряков':emps.find(e=>norm(e.last_name)==='мещеряков'),
   'турбина':emps.find(e=>norm(e.last_name)==='турбина'), 'дементьева':emps.find(e=>norm(e.last_name)==='дементьева'), 'деметьева':emps.find(e=>norm(e.last_name)==='дементьева')
  };
  const required=new Set(); pkg.contracts.forEach(c=>{c.lawyers.forEach(x=>required.add(norm(x)));if(c.representative)required.add(norm(c.representative))});pkg.acts.forEach(a=>firstSurname(a.lawyer_raw).forEach(x=>required.add(norm(x))));
  const missing=[...required].filter(x=>!aliases[x]&&!['мезенцева'].includes(x)); if(missing.length)throw new Error('Missing employee mappings: '+missing.join(','));
  const [existing]=await conn.query(`SELECT c.*,cl.name client_name,cl.id client_id FROM contracts c JOIN clients cl ON cl.id=c.id_client WHERE c.office_id=? ORDER BY c.id`,[OFFICE_ID]);
  const sourceByCn=new Map(pkg.contracts.map(c=>[canon(c.contract_number),c])); if(sourceByCn.size!==pkg.contracts.length)throw new Error('Duplicate source contracts');
  const used=new Set(),mapping=new Map();
  for(const c of pkg.contracts){const hit=existing.find(e=>!used.has(e.id)&&canon(e.contract_number)===canon(c.contract_number));if(hit){mapping.set(c.contract_number,hit);used.add(hit.id)}}
  for(const c of pkg.contracts){if(mapping.has(c.contract_number))continue;const hit=existing.find(e=>!used.has(e.id)&&norm(e.client_name)===norm(c.client_name));if(hit){mapping.set(c.contract_number,hit);used.add(hit.id)}}
  const unused=existing.filter(e=>!used.has(e.id)); if(unused.length)throw new Error('Existing contracts not matched to source: '+JSON.stringify(unused.map(x=>({id:x.id,no:x.contract_number,client:x.client_name}))));
  for(const x of [...pkg.payments,...pkg.refunds,...pkg.acts])if(!sourceByCn.has(canon(x.contract_number)))throw new Error('Unknown contract ref '+x.contract_number);
  console.log(JSON.stringify({mode:APPLY?'APPLY':'DRY_RUN',office:{id:office.id,name:office.name},source:pkg.summary,existing:{contracts:existing.length,matched:mapping.size,new:pkg.contracts.length-mapping.size,materials_preserved:(await conn.query('SELECT COUNT(*) n FROM materials WHERE office_id=?',[OFFICE_ID]))[0][0].n},employees:Object.fromEntries(Object.entries(aliases).filter(([,v])=>v).map(([k,v])=>[k,{id:v.id,user_id:v.user_id,name:`${v.last_name} ${v.first_name}`}]))},null,2));
  if(!APPLY){conn.release();return}
  await conn.beginTransaction();
  // Historical former employee, no account/login.
  let mezentseva=emps.find(e=>norm(e.last_name)==='мезенцева');
  if(!mezentseva){const [r]=await conn.query(`INSERT INTO employees(user_id,first_name,last_name,middle_name,position,office_id) VALUES(NULL,'Юлия','Мезенцева','А.','Юрист (бывший сотрудник)',?)`,[OFFICE_ID]);mezentseva={id:r.insertId,user_id:null,last_name:'Мезенцева',first_name:'Юлия'}}
  aliases['мезенцева']=mezentseva;
  const employeeFor=raw=>{for(const x of firstSurname(raw)){const e=aliases[norm(x)];if(e)return e}return null};
  // Ensure birth date can be retained, without forcing a UI interpretation.
  const [birthCol]=await conn.query(`SHOW COLUMNS FROM clients LIKE 'birth_date'`); if(!birthCol.length)throw new Error('clients.birth_date missing; run schema preflight first');
  // Remove old derived/history rows. Files/material rows remain and keep their contract ids.
  const oldIds=existing.map(x=>x.id);
  if(oldIds.length){const marks=oldIds.map(()=>'?').join(',');await conn.query(`UPDATE materials SET act_id=NULL WHERE contract_id IN (${marks})`,oldIds);for(const t of ['notifications','contract_history','contract_assignments','contract_payments','acts'])await conn.query(`DELETE FROM ${t} WHERE contract_id IN (${marks})`,oldIds)}
  await conn.query('DELETE FROM appointments WHERE office_id=?',[OFFICE_ID]);
  await conn.query('DELETE FROM cash_register WHERE office_id=?',[OFFICE_ID]);
  await conn.query('DELETE FROM salary_payments WHERE office_id=?',[OFFICE_ID]);
  await conn.query('DELETE FROM expenses WHERE office_id=?',[OFFICE_ID]);
  await conn.query('DELETE FROM office_income WHERE office_id=?',[OFFICE_ID]);
  await conn.query('DELETE FROM office_balance_opening WHERE office_id=?',[OFFICE_ID]);
  // Topics from signed consultations.
  const signedByName=new Map(); for(const a of pkg.appointments)if(a.consultation_result==='contract_signed'&&!signedByName.has(norm(a.client_name)))signedByName.set(norm(a.client_name),a);
  const contractIdByCn=new Map(), clientByName=new Map();
  const [allClients]=await conn.query('SELECT * FROM clients WHERE office_id=?',[OFFICE_ID]); allClients.forEach(c=>{if(!clientByName.has(norm(c.name)))clientByName.set(norm(c.name),c)});
  async function upsertClient(nm,ph,birth){let c=clientByName.get(norm(nm));if(c){await conn.query(`UPDATE clients SET name=?,phone=COALESCE(NULLIF(?,''),phone),birth_date=COALESCE(?,birth_date),status='active',deleted_at=NULL,updated_at=NOW() WHERE id=?`,[nm,ph||'',birth||null,c.id]);c={...c,name:nm,phone:ph||c.phone,birth_date:birth||c.birth_date};clientByName.set(norm(nm),c);return c.id}const [r]=await conn.query(`INSERT INTO clients(name,phone,office_id,status,birth_date,notes) VALUES(?,?,?,'active',?,'Импортировано из Google Sheets, Новокузнецк')`,[nm,ph||'',OFFICE_ID,birth||null]);c={id:r.insertId,name:nm,phone:ph||'',birth_date:birth||null};clientByName.set(norm(nm),c);return c.id}
  // First update/create contract clients and contracts, preserving matched ids/material links.
  for(const c of pkg.contracts){const cid=await upsertClient(c.client_name,c.phone,null);const l1=employeeFor(c.lawyers[0]),l2=c.lawyers[1]?employeeFor(c.lawyers[1]):null;if(!l1)throw new Error('No primary lawyer '+c.lawyers[0]);const rep=c.representative?employeeFor(c.representative):null;const existingRow=mapping.get(c.contract_number);const title=(signedByName.get(norm(c.client_name))||{}).topic||null;const description=`Импорт Google Sheets. Исходный отдел: ${c.department_raw||'не указан'}. Аванс в реестре: ${c.sheet_advance}. Остаток в реестре: ${c.sheet_remainder}.`;
   const vals=[cid,l1.id,l2?1:0,l2?.id||null,c.contract_type,null,rep?.id||null,'pending',c.contract_date,c.amount,c.paid_amount,c.status,title,description,OFFICE_ID,c.termination_date,c.refund_amount||0,c.refund_amount?1:0,c.refund_amount?ADMIN_USER:null,c.termination_date,c.refund_amount?'cash':null,c.contract_number,ADMIN_USER,l1.user_id||ADMIN_USER,c.phone?null:null,0];
   let id;if(existingRow){id=existingRow.id;await conn.query(`UPDATE contracts SET id_client=?,id_employee=?,is_joint=?,second_employee_id=?,contract_type=?,expert_id=?,representative_id=?,docs_status=?,contract_date=?,amount=?,paid_amount=?,status=?,title=?,description=?,office_id=?,terminated_at=?,refund_amount=?,refund_confirmed=?,refund_confirmed_by=?,refund_confirmed_at=?,refund_payment_method=?,contract_number=?,registered_by=?,signed_by=?,appointment_id=?,needs_lawyer_input=?,document_types=NULL,custom_documents=NULL,circumstances=NULL,expert_deadline_days=NULL,expert_deadline=NULL,expert_deadline_comment=NULL,updated_at=NOW() WHERE id=?`,[...vals,id])}else{const [r]=await conn.query(`INSERT INTO contracts(id_client,id_employee,is_joint,second_employee_id,contract_type,expert_id,representative_id,docs_status,contract_date,amount,paid_amount,status,title,description,office_id,terminated_at,refund_amount,refund_confirmed,refund_confirmed_by,refund_confirmed_at,refund_payment_method,contract_number,registered_by,signed_by,appointment_id,needs_lawyer_input) VALUES(${vals.map(()=>'?').join(',')})`,vals);id=r.insertId}contractIdByCn.set(canon(c.contract_number),id);
   for(const e of [l1,l2,rep].filter(Boolean)){if(e.user_id)await conn.query(`INSERT IGNORE INTO contract_assignments(contract_id,user_id,role,assignment_type,status) VALUES(?,?,?,'manual','completed')`,[id,e.user_id,e===rep?'representative':'lawyer'])}
  }
  // Payment details.
  for(const p of pkg.payments){const id=contractIdByCn.get(canon(p.contract_number));await conn.query(`INSERT INTO contract_payments(contract_id,amount,payment_date,payment_method,payment_type,comment,created_by,confirmed,confirmed_by,confirmed_at) VALUES(?,?,?,?,?,?,?,1,?,CONCAT(?, ' 12:00:00'))`,[id,p.amount,p.date,p.method,p.type,p.comment,ADMIN_USER,ADMIN_USER,p.date])}
  // Cash register exactly as source detail rows.
  for(const x of pkg.cash_entries){const e=employeeFor(x.lawyer_raw);await conn.query(`INSERT INTO cash_register(office_id,entry_date,client_name,contract_number,action,lawyer_name,employee_id,cash_amount,noncash_amount,bank_amount,expense_amount,comment,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,[OFFICE_ID,x.date,x.client_name,x.contract_number,x.action,x.lawyer_raw,e?.id||null,x.cash,x.noncash,x.bank,x.expense,'Импорт из Google Sheets',ADMIN_USER])}
  // Acts.
  for(const a of pkg.acts){const id=contractIdByCn.get(canon(a.contract_number)),e=employeeFor(a.lawyer_raw);await conn.query(`INSERT INTO acts(office_id,contract_id,act_date,amount,type,responsible_id,status,description,created_by,confirmed_at) VALUES(?,?,?,?,?,?,'confirmed',?,?,CONCAT(?, ' 12:00:00'))`,[OFFICE_ID,id,a.date,a.amount,a.type,e?.id||null,`Импорт Google Sheets${a.representative?'; представитель: '+a.representative:''}`,ADMIN_USER,a.date])}
  // Clients and appointments/consultations.
  const phoneByName=new Map(pkg.contracts.filter(c=>c.phone).map(c=>[norm(c.client_name),c.phone]));const appointmentByName=[];
  for(const a of pkg.appointments){const ph=phoneByName.get(norm(a.client_name))||'';const cid=await upsertClient(a.client_name,ph,a.birth_date);const lawyer=employeeFor(a.lawyer_raw);const meta=[a.topic&&`Тема: ${a.topic}`,a.pin&&`Пин: ${a.pin}`,a.secondary&&`Вторично: ${a.secondary}`,a.yupp&&`ЮПП: ${a.yupp}`,a.docs_issue&&`Выдача документов: ${a.docs_issue}`,a.result_raw&&`Исходная отметка: ${a.result_raw}`].filter(Boolean).join('\n');const [r]=await conn.query(`INSERT INTO appointments(office_id,client_id,client_name,client_phone,source,appointment_date,appointment_time,comment,operator_id,operator_name,status,consultation_result,contract_signed_by,manager_comment,is_technical,assigned_lawyer_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,CONCAT(?, ' ',?),CONCAT(?, ' ',?))`,[OFFICE_ID,cid,a.client_name,ph,'Импорт Google Sheets',a.date,a.time,meta,ADMIN_USER,'Общий аккаунт администратора',a.status,a.consultation_result,a.consultation_result==='contract_signed'?(lawyer?.user_id||null):null,'Исторический импорт',lawyer?.id||null,a.date,a.time,a.date,a.time]);if(a.consultation_result==='contract_signed')appointmentByName.push({name:norm(a.client_name),id:r.insertId,date:a.date})}
  for(const c of pkg.contracts){const cand=appointmentByName.filter(a=>a.name===norm(c.client_name)).sort((a,b)=>Math.abs(new Date(a.date)-new Date(c.contract_date))-Math.abs(new Date(b.date)-new Date(c.contract_date)))[0];if(cand)await conn.query('UPDATE contracts SET appointment_id=? WHERE id=?',[cand.id,contractIdByCn.get(canon(c.contract_number))])}
  // Financial expenses from daily balance; refunds are already cash-register expense rows.
  for(const e of pkg.balance_expenses){if(/расторж/i.test(e.title))continue;await conn.query(`INSERT INTO expenses(office_id,category,amount,expense_type,payment_method,is_auto,source_type,title,description,spent_on,created_by) VALUES(?,?,?,'Разовый',?,0,'google_sheets_import',?,?,?,?)`,[OFFICE_ID,e.category,e.amount,e.method,e.title,e.raw,e.date,ADMIN_USER])}
  // Salary history. Marina and Oksana aggregate into shared admin; IT/Marakin/Experts remain only expenses from balance.
  const salaryMap={'курбановэи':aliases['курбанов'],'давтянae':aliases['давтян'],'давтянaе':aliases['давтян'],'виолетта':aliases['березина'],'мезенцеваюа':aliases['мезенцева'],'откидачнд':aliases['откидач'],'вожеговати':aliases['вожигова'],'марина':emps.find(e=>e.id===94),'оксана':emps.find(e=>e.id===94),'деметьева':aliases['дементьева'],'березина':aliases['березина'],'турбина':aliases['турбина'],'менщеряков':aliases['мещеряков']};
  const grouped=new Map();for(const s of pkg.salary){let keyName=norm(s.name);let e=salaryMap[keyName]||employeeFor(s.name);if(!e)throw new Error('Salary employee not mapped '+s.name);const k=`${e.id}|${s.period_from}|${s.period_to}`;const g=grouped.get(k)||{employee:e,period_from:s.period_from,period_to:s.period_to,amount:0,rows:[]};g.amount+=s.total;g.rows.push(s);grouped.set(k,g)}
  for(const g of grouped.values())await conn.query(`INSERT INTO salary_payments(office_id,employee_id,period_from,period_to,amount,payment_method,status,active_flag,calculation_snapshot,paid_by,paid_at) VALUES(?,?,?,?,?,'noncash','paid',1,?,?,CONCAT(?, ' 18:00:00'))`,[OFFICE_ID,g.employee.id,g.period_from,g.period_to,g.amount,JSON.stringify({source:'Google Sheets',rows:g.rows}),DIRECTOR_USER,g.period_to]);
  // Source closing balance becomes authoritative baseline for all future movements.
  await conn.query(`INSERT INTO office_balance_opening(office_id,start_date,opening_cash,opening_noncash,opening_bank,created_by) VALUES(?,?,?,?,?,?)`,[OFFICE_ID,pkg.closing_balance.date,pkg.closing_balance.cash,pkg.closing_balance.noncash,pkg.closing_balance.bank,DIRECTOR_USER]);
  // Soft-hide clients absent from either contracts or imported consultations and not referenced.
  const keepIds=[...clientByName.values()].map(x=>x.id);if(keepIds.length)await conn.query(`UPDATE clients SET deleted_at=NOW(),deleted_by=? WHERE office_id=? AND id NOT IN (${keepIds.map(()=>'?').join(',')})`,[DIRECTOR_USER,OFFICE_ID,...keepIds]);
  await conn.commit();
  console.log('MIGRATION_COMMITTED');
  conn.release();
 }catch(e){try{if(APPLY)await conn.rollback()}catch{};try{conn.release()}catch{};throw e}
}
main().catch(e=>{console.error(e.stack||e);process.exit(1)});