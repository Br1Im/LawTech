const fs=require('fs');const path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
describe('LT-009 atomic employee identity',()=>{
 test('user and employee are created in one transaction',()=>{const s=read('controllers/employeeManagementController.js');expect(s).toContain('await connection.beginTransaction()');expect(s).toContain('await connection.commit()');expect(s).toContain('await connection.rollback()');expect(s).toContain('INSERT INTO employees (user_id');});
 test('employee primary key is not forced to user id',()=>{const s=read('controllers/employeeManagementController.js');expect(s).not.toContain('INSERT INTO employees (id, user_id');});
});
