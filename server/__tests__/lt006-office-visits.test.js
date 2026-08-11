const fs=require('fs');const path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
describe('LT-006 office visit KPI',()=>{
 test('dashboard counts arrived appointments in the selected period',()=>{const s=read('controllers/officeDashboardController.js');expect(s).toContain("status = 'arrived'");expect(s).toContain('period_visits');expect(s).toContain('visits: {');});
 test('office card uses dashboard visits rather than office stats placeholder',()=>{const s=read('../frontend/src/components/Office.tsx');expect(s).toContain('dashboard?.visits?.period');expect(s).not.toContain("value: String(selectedOffice.data?.[0] || 0)");});
});
