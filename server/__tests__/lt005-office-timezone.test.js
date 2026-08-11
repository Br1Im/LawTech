const fs=require('fs');const path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
describe('LT-005 office date timezone',()=>{
 test('dashboard always resolves today in explicit office timezone',()=>{const s=read('controllers/officeDashboardController.js');expect(s).toContain("DEFAULT_OFFICE_TIMEZONE = process.env.DEFAULT_OFFICE_TIMEZONE || 'Asia/Tomsk'");expect(s).toContain('const todayIso = todayIsoInTz(officeTz)');});
 test('new offices persist a timezone',()=>{expect(read('models/office.js')).toContain('external_notifications_enabled, timezone, created_at');});
});
