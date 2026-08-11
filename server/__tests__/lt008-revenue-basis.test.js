const fs=require('fs');const path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
describe('LT-008 consistent revenue basis',()=>{
 test('analysis rankings use confirmed payments in selected period',()=>{const s=read('controllers/consultationAnalysisController.js');expect(s).toContain("p.confirmed=1 AND p.payment_date BETWEEN ? AND ?");expect(s).toContain("revenue_basis:'CONFIRMED_PAYMENTS'");});
 test('UI labels paid revenue explicitly',()=>{const s=read('../frontend/src/components/OfficeAnalytics.tsx');expect(s).toContain('Средний оплаченный чек');expect(s).toContain('Оплачено по договорам');});
});
