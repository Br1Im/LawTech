const CashRegister = require('../models/cashRegister');
const { ensureUserOffice, checkOfficeAccess } = require('../utils/ensureOffice');

const CASH_ROLES = new Set(['admin','administrator','director','manager','okk']);
const msg = {
  denied: '\u041d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u043a \u043a\u0430\u0441\u0441\u0435',
  forbidden: '\u0414\u043e\u0441\u0442\u0443\u043f \u0437\u0430\u043f\u0440\u0435\u0449\u0451\u043d',
  invalid: '\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0434\u0430\u0442\u0443 \u0438 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u044e',
  amounts: '\u0421\u0443\u043c\u043c\u044b \u0434\u043e\u043b\u0436\u043d\u044b \u0431\u044b\u0442\u044c \u043d\u0435\u043e\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u043c\u0438 \u0447\u0438\u0441\u043b\u0430\u043c\u0438',
  notFound: '\u0417\u0430\u043f\u0438\u0441\u044c \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430',
};
const requireCashRole = (req, res) => {
  if (CASH_ROLES.has(String(req.user?.role || '').toLowerCase())) return true;
  res.status(403).json({ success:false, message:msg.denied }); return false;
};
const resolveOffice = async (req, res) => {
  const officeId = Number(req.query.office_id || req.user.office_id || await ensureUserOffice(req.user));
  if (!officeId || !await checkOfficeAccess(req.user, officeId)) { res.status(403).json({ success:false, message:msg.forbidden }); return null; }
  return officeId;
};

const cashRegisterController = {
  async list(req,res){ if(!requireCashRole(req,res))return; try{const officeId=await resolveOffice(req,res);if(!officeId)return;const{date_from,date_to}=req.query;res.json({success:true,data:await CashRegister.list(officeId,date_from||null,date_to||null)})}catch(e){console.error(e);res.status(500).json({success:false,message:'Cash register load failed'})}},
  async totals(req,res){ if(!requireCashRole(req,res))return; try{const officeId=await resolveOffice(req,res);if(!officeId)return;const{date_from,date_to}=req.query;res.json({success:true,data:await CashRegister.dailyTotals(officeId,date_from||null,date_to||null)})}catch(e){console.error(e);res.status(500).json({success:false,message:'Cash totals load failed'})}},
  async stats(req,res){ if(!requireCashRole(req,res))return; try{const officeId=await resolveOffice(req,res);if(!officeId)return;const{date_from,date_to}=req.query;res.json({success:true,data:await CashRegister.stats(officeId,date_from||null,date_to||null)})}catch(e){console.error(e);res.status(500).json({success:false,message:'Cash stats load failed'})}},
  async create(req,res){
    if(!requireCashRole(req,res))return;
    try{
      const officeId=await resolveOffice(req,res);if(!officeId)return;
      const body=req.body||{}, amountFields=['cash_amount','noncash_amount','bank_amount','expense_amount'];
      if(!body.entry_date||!body.action)return res.status(400).json({success:false,message:msg.invalid});
      if(amountFields.some(k=>body[k]!==undefined&&(!Number.isFinite(Number(body[k]))||Number(body[k])<0)))return res.status(400).json({success:false,message:msg.amounts});
      const entry=await CashRegister.create({...body,office_id:officeId,created_by:req.user.id});res.json({success:true,data:entry});
    }catch(e){console.error(e);res.status(500).json({success:false,message:'Cash entry create failed'})}
  },
  async update(req,res){ if(!requireCashRole(req,res))return; try{const officeId=await resolveOffice(req,res);if(!officeId)return;const entry=await CashRegister.update(req.params.id,officeId,req.body||{});if(!entry)return res.status(404).json({success:false,message:msg.notFound});res.json({success:true,data:entry})}catch(e){console.error(e);res.status(500).json({success:false,message:'Cash entry update failed'})}},
  async remove(req,res){ if(!requireCashRole(req,res))return; try{const officeId=await resolveOffice(req,res);if(!officeId)return;const removed=await CashRegister.remove(req.params.id,officeId);if(!removed)return res.status(404).json({success:false,message:msg.notFound});res.json({success:true,message:'OK'})}catch(e){console.error(e);res.status(500).json({success:false,message:'Cash entry delete failed'})}},
};
module.exports = cashRegisterController;
