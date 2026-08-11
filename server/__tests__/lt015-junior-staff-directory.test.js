const fs=require('fs');const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'..','controllers','employeeManagementController.js'),'utf8');
describe('LT-015 junior staff directory',()=>{
 test('junior roles receive role-scoped directories',()=>{expect(source).toContain("new Set(['lawyer', 'expert', 'representative'])");expect(source).toContain("u.id = ? OR u.role = 'expert'");expect(source).toContain("query += ' AND u.id = ?'");});
 test('junior responses redact contacts and logins',()=>{expect(source).toContain('if (isJuniorDirectory) return common');expect(source).not.toContain('if (isJuniorDirectory) return { ...employee');});
});
