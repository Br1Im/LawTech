const fs=require('fs');const path=require('path');
const access=fs.readFileSync(path.join(__dirname,'..','utils','contractAccess.js'),'utf8');
const routes=fs.readFileSync(path.join(__dirname,'..','routes','contracts.js'),'utf8');
describe('LT-011 expert contract visibility',()=>{
 test('expert_id is compared through employees.user_id',()=>{expect(access).toContain("role === 'expert'");expect(access).toContain('SELECT id FROM employees WHERE user_id = ?');expect(access).toContain('contract.expert_id');});
 test('document status uses the same identity',()=>{expect(routes).toContain('SELECT id FROM employees WHERE user_id = ?');});
});
