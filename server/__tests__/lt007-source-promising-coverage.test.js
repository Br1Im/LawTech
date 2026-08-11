const fs=require('fs');const path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
describe('LT-007 promising ranking requires analysis coverage',()=>{
 test('rankings return null metrics when analyzed is zero',()=>{const s=read('controllers/consultationAnalysisController.js');expect(s).toContain('const promising=analyzed?Number(r.promising||0):null');expect(s).toContain('conversion_promising_pct:promising?');});
 test('office UI renders an em dash without analysis',()=>{const s=read('../frontend/src/components/OfficeAnalytics.tsx');expect(s).toContain("Number(r.analyzed||0)>0?(r.promising??0):'—'");});
});
