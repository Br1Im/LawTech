const fs=require('fs');const path=require('path');
const office=fs.readFileSync(path.join(__dirname,'..','models','office.js'),'utf8');
const salary=fs.readFileSync(path.join(__dirname,'..','controllers','salaryController.js'),'utf8');
describe('LT-012 canonical office employee roster',()=>{
 test('office enrichment joins employees through user_id',()=>{expect(office).toContain('JOIN users u ON u.id = e.user_id');expect(office).not.toContain('LEFT JOIN users u ON u.id = e.id');expect(office).toContain('u.deleted_at IS NULL');});
 test('salary roster requires active linked users assigned to the office',()=>{expect(salary).toContain('JOIN users u ON u.id = e.user_id AND u.is_active = 1');expect(salary).toContain('(u.office_id = ? OR uo.office_id IS NOT NULL)');});
});
