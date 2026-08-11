const db=require('../db');
const ROLES=new Set(['director','manager','okk']);
const CATEGORIES=new Set(['LEAD_QUALITY','SALES_PROCESS','CLIENT_DELAY','SERVICE_PROBLEM','NON_TARGET','UNRESOLVED','OTHER']);
const REASON_CATEGORY={
 NEED_THINK:'CLIENT_DELAY',CONSULT_OTHERS:'CLIENT_DELAY',NOT_READY:'CLIENT_DELAY',RETURN_LATER:'CLIENT_DELAY',DELAY_OTHER:'CLIENT_DELAY',
 PRICE:'SERVICE_PROBLEM',NO_MONEY_NOW:'SERVICE_PROBLEM',PAYMENT_SCHEME:'SERVICE_PROBLEM',FINANCE_OTHER:'SERVICE_PROBLEM',CONDITIONS:'SERVICE_PROBLEM',SERVICE_SCOPE:'SERVICE_PROBLEM',VALUE_NOT_CLEAR:'SERVICE_PROBLEM',SOLUTION_REJECTED:'SERVICE_PROBLEM',PRODUCT_OTHER:'SERVICE_PROBLEM',
 NEED_NOT_IDENTIFIED:'SALES_PROCESS',SOLUTION_NOT_CLEAR:'SALES_PROCESS',VALUE_NOT_FORMED:'SALES_PROCESS',OBJECTION_NOT_HANDLED:'SALES_PROCESS',OFFER_NOT_MADE:'SALES_PROCESS',ARGUMENTS_INSUFFICIENT:'SALES_PROCESS',
 LOW_POTENTIAL:'LEAD_QUALITY',ECONOMICALLY_UNVIABLE:'LEAD_QUALITY',NO_SUPPORT_NEEDED:'LEAD_QUALITY',NOT_LEGALLY_SOLVABLE:'LEAD_QUALITY',
 NON_TARGET_SERVICE:'NON_TARGET',OUT_OF_PROFILE:'NON_TARGET',OTHER:'OTHER',INSUFFICIENT_DATA:'UNRESOLVED'
};
const FIELDS=['employee_id','source_id','topic','lead_quality','commercial_potential','service_fit','legally_solvable','need_identified','decision_maker_identified','solution_understood','offer_made','objection_identified','objection_processed','client_objection','proposed_service','proposed_price','next_step','loss_category','loss_reason','manager_comment','evidence_sources','data_sufficiency','missing_data_reason','classification_basis','confidence_score','analysis_status'];
function bad(res,n,m){return res.status(n).json({success:false,message:m});}
function office(user){return Number(user.office_id);}
function manager(user){return ROLES.has(String(user.role||'').toLowerCase());}
function dates(q){const to=q.date_to||new Date().toISOString().slice(0,10);const d=new Date(to);d.setDate(d.getDate()-29);return [q.date_from||d.toISOString().slice(0,10),to];}
function valid(body){
 const action=String(body.action||'SAVE_DRAFT');
 if(action==='SAVE_DRAFT') return null;
 const required=['legally_solvable','commercial_potential','service_fit','need_identified','decision_maker_identified','objection_identified','offer_made'];
 for(const field of required) if(!body[field]||body[field]==='UNKNOWN') return 'Ответьте на все обязательные вопросы';
 if(body.objection_identified!=='NONE'){
   if(!['YES','PARTIAL','NO'].includes(body.objection_processed)) return 'Укажите, было ли отработано возражение';
   if(!String(body.client_objection||'').trim()) return 'Запишите возражение клиента';
 }
 return null;
}
async function appointment(id,user){const [r]=await db.query(`SELECT a.*,EXISTS(SELECT 1 FROM contracts c JOIN contract_payments p ON p.contract_id=c.id AND p.confirmed=1 AND p.amount>0 WHERE c.appointment_id=a.id) has_confirmed_payment FROM appointments a WHERE a.id=? AND a.office_id=? LIMIT 1`,[id,office(user)]);return r[0];}
function payload(body,a,user){const o={};for(const f of FIELDS)o[f]=body[f]??null;o.analysis_status='DRAFT';o.employee_id=o.employee_id||a.assigned_lawyer_id||null;o.source_id=o.source_id||a.source_id||null;o.topic=o.topic||a.comment||null;o.evidence_sources=JSON.stringify(Array.isArray(body.evidence_sources)?body.evidence_sources:['CRM']);o.lead_quality=o.lead_quality||'UNKNOWN';o.commercial_potential=o.commercial_potential||'UNKNOWN';o.service_fit=o.service_fit||'UNKNOWN';o.legally_solvable=o.legally_solvable||'UNKNOWN';o.need_identified=o.need_identified||'UNKNOWN';o.decision_maker_identified=o.decision_maker_identified||'UNKNOWN';o.solution_understood=o.solution_understood||'UNKNOWN';o.offer_made=o.offer_made||'UNKNOWN';o.objection_identified=o.objection_identified||'UNKNOWN';o.objection_processed=o.objection_processed||'UNKNOWN';o.next_step=o.next_step||'NOT_FIXED';o.loss_category=o.loss_category||'UNRESOLVED';o.loss_reason=o.loss_reason||'INSUFFICIENT_DATA';o.data_sufficiency=o.data_sufficiency||'INSUFFICIENT';o.missing_data_reason=o.missing_data_reason||'AI-анализ ещё не выполнен';o.classification_basis=o.classification_basis||'MIXED';o.confidence_score=Math.max(0,Math.min(100,Number(body.confidence_score)||0));o.updated_by=user.id;return o;}
const api={
 async getOne(req,res){try{if(!manager(req.user))return bad(res,403,'Нет доступа');const a=await appointment(req.params.consultationId,req.user);if(!a)return bad(res,404,'Консультация не найдена');const [r]=await db.query('SELECT * FROM consultation_analysis WHERE consultation_id=? AND deleted_at IS NULL',[a.id]);const [settings]=await db.query('SELECT analysis_enabled,ai_enabled FROM consultation_analysis_settings WHERE office_id=?',[office(req.user)]);return res.json({success:true,data:r[0]||null,consultation:a,capabilities:{analysis_enabled:settings[0]?.analysis_enabled!==0,ai_enabled:!!settings[0]?.ai_enabled}});}catch(e){console.error(e);return bad(res,500,'Ошибка загрузки разбора');}},
 async upsert(req,res){const cx=await db.getClient();try{if(!manager(req.user))return bad(res,403,'Редактирование доступно только руководству');const a=await appointment(req.params.consultationId,req.user);if(!a)return bad(res,404,'Консультация не найдена');if(a.status!=='arrived'||a.consultation_result!=='not_signed'||Number(a.has_confirmed_payment))return bad(res,400,'Разбор доступен только для состоявшейся консультации без договора');const er=valid(req.body);if(er)return bad(res,400,er);const data=payload(req.body,a,req.user);await cx.beginTransaction();const [rows]=await cx.query('SELECT * FROM consultation_analysis WHERE consultation_id=? FOR UPDATE',[a.id]);let row=rows[0];if(row){if(Number(req.body.version)!==Number(row.version)){await cx.rollback();return res.status(409).json({success:false,message:'Разбор уже изменён другим руководителем',data:row});}const set=FIELDS.map(f=>`${f}=?`).join(',');const vals=FIELDS.map(f=>data[f]);await cx.query(`UPDATE consultation_analysis SET ${set},updated_by=?,version=version+1,deleted_at=NULL,deleted_by=NULL WHERE id=?`,[...vals,req.user.id,row.id]);const [n]=await cx.query('SELECT * FROM consultation_analysis WHERE id=?',[row.id]);await cx.query(`INSERT INTO consultation_analysis_history(analysis_id,consultation_id,office_id,version,action,old_values,new_values,changed_by) VALUES (?,?,?,?,?,?,?,?)`,[row.id,a.id,a.office_id,n[0].version,'UPDATE',JSON.stringify(row),JSON.stringify(n[0]),req.user.id]);row=n[0];}else{const cols=['consultation_id','office_id',...FIELDS,'created_by','updated_by'];const vals=[a.id,a.office_id,...FIELDS.map(f=>data[f]),req.user.id,req.user.id];const [r]=await cx.query(`INSERT INTO consultation_analysis(${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`,vals);const [n]=await cx.query('SELECT * FROM consultation_analysis WHERE id=?',[r.insertId]);row=n[0];await cx.query(`INSERT INTO consultation_analysis_history(analysis_id,consultation_id,office_id,version,action,new_values,changed_by) VALUES (?,?,?,?,?,?,?)`,[row.id,a.id,a.office_id,1,'CREATE',JSON.stringify(row),req.user.id]);}await cx.commit();return res.json({success:true,data:row});}catch(e){try{await cx.rollback();}catch{}console.error(e);return bad(res,500,'Не удалось сохранить разбор');}finally{cx.release();}},
 async remove(req,res){const cx=await db.getClient();try{if(!manager(req.user))return bad(res,403,'Нет доступа');await cx.beginTransaction();const [r]=await cx.query('SELECT * FROM consultation_analysis WHERE consultation_id=? AND office_id=? AND deleted_at IS NULL FOR UPDATE',[req.params.consultationId,office(req.user)]);if(!r.length)return bad(res,404,'Разбор не найден');await cx.query('UPDATE consultation_analysis SET deleted_at=NOW(),deleted_by=?,updated_by=?,version=version+1 WHERE id=?',[req.user.id,req.user.id,r[0].id]);await cx.query(`INSERT INTO consultation_analysis_history(analysis_id,consultation_id,office_id,version,action,old_values,changed_by) VALUES (?,?,?,?,?,?,?)`,[r[0].id,r[0].consultation_id,r[0].office_id,r[0].version+1,'DELETE',JSON.stringify(r[0]),req.user.id]);await cx.commit();return res.json({success:true});}catch(e){try{await cx.rollback();}catch{}return bad(res,500,'Не удалось удалить разбор');}finally{cx.release();}},
  async summary(req,res){
    try{
      if(!manager(req.user))return bad(res,403,'Нет доступа');
      const [from,to]=dates(req.query),oid=office(req.user);
      const [[base]]=await db.query(`SELECT COUNT(*) arrived,SUM(a.consultation_result='contract_signed') contracts,SUM(a.consultation_result='not_signed') lost FROM appointments a WHERE a.office_id=? AND a.status='arrived' AND a.appointment_date BETWEEN ? AND ?`,[oid,from,to]);
      const [[stat]]=await db.query(`SELECT COUNT(*) analyzed,SUM(lead_quality IN ('HIGH','MEDIUM')) promising,SUM(data_sufficiency='INSUFFICIENT') insufficient,SUM(classification_basis='HYPOTHESIS') hypotheses FROM consultation_analysis ca JOIN appointments a ON a.id=ca.consultation_id WHERE ca.office_id=? AND ca.deleted_at IS NULL AND ca.analysis_status IN ('CONFIRMED','CORRECTED') AND a.appointment_date BETWEEN ? AND ?`,[oid,from,to]);
      const [cats]=await db.query(`SELECT loss_category category,COUNT(*) count FROM consultation_analysis ca JOIN appointments a ON a.id=ca.consultation_id WHERE ca.office_id=? AND ca.deleted_at IS NULL AND ca.analysis_status IN ('CONFIRMED','CORRECTED') AND a.appointment_date BETWEEN ? AND ? GROUP BY loss_category`,[oid,from,to]);
      const [[avg]]=await db.query(`SELECT COALESCE(AVG(amount),0) average_check FROM contracts WHERE office_id=? AND contract_date BETWEEN ? AND ? AND amount>0`,[oid,from,to]);
      const [[settings]]=await db.query(`SELECT min_sample_size,coverage_warning_pct,revenue_method FROM consultation_analysis_settings WHERE office_id=?`,[oid]);
      const arrived=Number(base.arrived||0),contracts=Number(base.contracts||0),lost=Number(base.lost||0),analyzed=Number(stat.analyzed||0),promising=Number(stat.promising||0),averageCheck=Number(avg.average_check||0);
      const potentialLostRevenue=Math.round(promising*averageCheck);
      const coverage=lost?Math.round(analyzed*10000/lost)/100:0;
      return res.json({success:true,data:{period:{from,to},arrived,contracts,lost,analyzed,coverage_pct:coverage,coverage_warning:coverage<Number(settings?.coverage_warning_pct||70),promising,conversion_all_pct:arrived?Math.round(contracts*10000/arrived)/100:0,conversion_promising_pct:promising?Math.round(contracts*10000/promising)/100:0,insufficient:Number(stat.insufficient||0),hypotheses:Number(stat.hypotheses||0),average_check:averageCheck,potential_lost_revenue:potentialLostRevenue,revenue_method:settings?.revenue_method==='TOPIC_AVG'?'OFFICE_AVG_FALLBACK':'OFFICE_AVG',min_sample_size:Number(settings?.min_sample_size||20),categories:cats}});
    }catch(e){console.error(e);return bad(res,500,'Ошибка аналитики');}
  },
  async details(req,res){
    try{
      if(!manager(req.user))return bad(res,403,'Нет доступа');
      const [from,to]=dates(req.query),limit=Math.min(Number(req.query.limit)||50,100),page=Math.max(Number(req.query.page)||1,1),oid=office(req.user),params=[oid,from,to];let filter='';
      if(req.query.category){filter=' AND ca.loss_category=?';params.push(req.query.category);}
      const [[avg]]=await db.query(`SELECT COALESCE(AVG(amount),0) average_check FROM contracts WHERE office_id=? AND contract_date BETWEEN ? AND ? AND amount>0`,[oid,from,to]);
      const [[count]]=await db.query(`SELECT COUNT(*) total FROM consultation_analysis ca JOIN appointments a ON a.id=ca.consultation_id WHERE ca.office_id=? AND ca.deleted_at IS NULL AND ca.analysis_status IN ('CONFIRMED','CORRECTED') AND a.appointment_date BETWEEN ? AND ?${filter}`,[...params]);
      const [rows]=await db.query(`SELECT ca.*,a.client_name,a.appointment_date,a.appointment_time,a.source,CONCAT(u.first_name,' ',u.last_name) employee_name,IF(ca.lead_quality IN ('HIGH','MEDIUM'),?,0) potential_lost_revenue FROM consultation_analysis ca JOIN appointments a ON a.id=ca.consultation_id LEFT JOIN users u ON u.id=ca.employee_id WHERE ca.office_id=? AND ca.deleted_at IS NULL AND ca.analysis_status IN ('CONFIRMED','CORRECTED') AND a.appointment_date BETWEEN ? AND ?${filter} ORDER BY a.appointment_date DESC,a.appointment_time DESC LIMIT ? OFFSET ?`,[Number(avg.average_check||0),...params,limit,(page-1)*limit]);
      return res.json({success:true,data:rows,total:Number(count.total),page,limit,average_check:Number(avg.average_check||0)});
    }catch(e){console.error(e);return bad(res,500,'Ошибка детализации');}
  },
  async rankings(req,res){
    try{
      if(!manager(req.user))return bad(res,403,'Нет доступа');
      const [from,to]=dates(req.query),oid=office(req.user),by=req.params.by;
      if(by==='employees'){
        const [rows]=await db.query(`SELECT COALESCE(a.assigned_lawyer_id,0) id,COALESCE(CONCAT(u.first_name,' ',u.last_name),'Не назначен') name,
          COUNT(*) consultations,SUM(a.consultation_result='contract_signed' OR c.contracts>0) contracts,
          SUM(a.consultation_result='contract_signed' OR c.contracts>0)+SUM(CASE WHEN a.consultation_result='not_signed' AND ca.lead_quality IN ('HIGH','MEDIUM') THEN 1 ELSE 0 END) promising,
          SUM(c.revenue) revenue,COUNT(ca.id) analyzed,SUM(ca.loss_category='SALES_PROCESS') sales_losses,SUM(ca.data_sufficiency='INSUFFICIENT') insufficient
          FROM appointments a LEFT JOIN users u ON u.id=a.assigned_lawyer_id LEFT JOIN consultation_analysis ca ON ca.consultation_id=a.id AND ca.deleted_at IS NULL
          LEFT JOIN (SELECT appointment_id,COUNT(*) contracts,SUM(amount) revenue FROM contracts WHERE office_id=? GROUP BY appointment_id)c ON c.appointment_id=a.id
          WHERE a.office_id=? AND a.status='arrived' AND a.appointment_date BETWEEN ? AND ? GROUP BY a.assigned_lawyer_id,name ORDER BY promising DESC`,[oid,oid,from,to]);
        return res.json({success:true,data:rows.map(r=>({...r,conversion_promising_pct:Number(r.promising)?Math.round(Number(r.contracts)*10000/Number(r.promising))/100:0}))});
      }
      const [rows]=await db.query(`SELECT MIN(a.id) id,COALESCE(a.source,'Без источника') COLLATE utf8mb4_unicode_ci name,
        COUNT(*) records,SUM(a.status='arrived') arrived,SUM(a.consultation_result='contract_signed' OR c.contracts>0) contracts,
        SUM(a.consultation_result='contract_signed' OR c.contracts>0)+SUM(CASE WHEN a.consultation_result='not_signed' AND ca.lead_quality IN ('HIGH','MEDIUM') THEN 1 ELSE 0 END) promising,
        SUM(c.revenue) revenue,COUNT(ca.id) analyzed,SUM(ca.loss_category='SALES_PROCESS') sales_losses,SUM(ca.data_sufficiency='INSUFFICIENT') insufficient
        FROM appointments a LEFT JOIN consultation_analysis ca ON ca.consultation_id=a.id AND ca.deleted_at IS NULL
        LEFT JOIN (SELECT appointment_id,COUNT(*) contracts,SUM(amount) revenue FROM contracts WHERE office_id=? GROUP BY appointment_id)c ON c.appointment_id=a.id
        WHERE a.office_id=? AND a.appointment_date BETWEEN ? AND ? GROUP BY COALESCE(a.source,'Без источника') COLLATE utf8mb4_unicode_ci ORDER BY promising DESC`,[oid,oid,from,to]);
      return res.json({success:true,data:rows.map(r=>({...r,conversion_promising_pct:Number(r.promising)?Math.round(Number(r.contracts)*10000/Number(r.promising))/100:0,average_check:Number(r.contracts)?Math.round(Number(r.revenue||0)/Number(r.contracts)):0}))});
    }catch(e){console.error(e);return bad(res,500,'Ошибка рейтинга');}
  },
  async getSettings(req,res){try{if(!manager(req.user))return bad(res,403,'Нет доступа');const [rows]=await db.query('SELECT * FROM consultation_analysis_settings WHERE office_id=?',[office(req.user)]);return res.json({success:true,data:rows[0]||{office_id:office(req.user),min_sample_size:20,coverage_warning_pct:70,revenue_method:'TOPIC_AVG'}});}catch(e){return bad(res,500,'Ошибка настроек');}},
  async updateSettings(req,res){try{if(String(req.user.role)!=='director')return bad(res,403,'Настройки доступны только генеральному директору');const min=Math.max(5,Math.min(200,Number(req.body.min_sample_size)||20)),cov=Math.max(0,Math.min(100,Number(req.body.coverage_warning_pct)||70)),method=['TOPIC_AVG','OFFICE_AVG'].includes(req.body.revenue_method)?req.body.revenue_method:'TOPIC_AVG';await db.query(`INSERT INTO consultation_analysis_settings(office_id,min_sample_size,coverage_warning_pct,revenue_method,updated_by) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE min_sample_size=VALUES(min_sample_size),coverage_warning_pct=VALUES(coverage_warning_pct),revenue_method=VALUES(revenue_method),updated_by=VALUES(updated_by)`,[office(req.user),min,cov,method,req.user.id]);return res.json({success:true});}catch(e){return bad(res,500,'Ошибка сохранения настроек');}}

};
module.exports=api;
