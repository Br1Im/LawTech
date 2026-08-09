const db=require('../db');
const LEADERSHIP=new Set(['admin','administrator','owner','director','manager','okk']);
async function canAccessContract(user,contractId,connection=db){
 const role=String(user?.role||'').toLowerCase();
 const [[c]]=await connection.query('SELECT id,office_id,representative_id,expert_id,id_employee FROM contracts WHERE id=?',[contractId]);
 if(!c)return false;
 const {checkOfficeAccess}=require('./ensureOffice');
 if(!await checkOfficeAccess(user,c.office_id))return false;
 if(LEADERSHIP.has(role))return true;
 if(['cc_manager','cc_operator'].includes(role))return false;
 const [[a]]=await connection.query('SELECT 1 FROM contract_assignments WHERE contract_id=? AND user_id=? LIMIT 1',[contractId,user.id]);
 if(a)return true;
 if(role==='representative')return Number(c.representative_id)===Number(user.id);
 const [[e]]=await connection.query('SELECT user_id FROM employees WHERE id=?',[c.id_employee]);
 return !!e&&Number(e.user_id)===Number(user.id);
}
module.exports={canAccessContract,LEADERSHIP};
