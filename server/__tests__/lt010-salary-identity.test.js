const fs=require('fs');const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'..','controllers','salaryController.js'),'utf8');
describe('LT-010 salary identity and expert packages',()=>{
 test('all salary joins use employees.user_id',()=>{expect(source).toContain('u.id = e.user_id');expect(source).not.toContain('u.id = e.id');});
 test('expert packages are counted from persisted expert documents',()=>{expect(source).toContain("m.file_url LIKE '/uploads/contract-docs/%'");expect(source).toContain('JOIN employees e ON e.user_id = m.created_by');expect(source).toContain('expertPackagesById');});
});
