const fs=require('fs');const path=require('path');
const model=fs.readFileSync(path.join(__dirname,'..','models','contract.js'),'utf8');
const controller=fs.readFileSync(path.join(__dirname,'..','controllers','contractController.js'),'utf8');
describe('LT-013 duplicate refund confirmation',()=>{
 test('refund state is locked and duplicate is a typed conflict',()=>{expect(model).toContain('SELECT * FROM contracts WHERE id = ? FOR UPDATE');expect(model).toContain("error.statusCode = 409");expect(model).toContain("error.code = 'REFUND_ALREADY_CONFIRMED'");});
 test('controller preserves business status and code',()=>{expect(controller).toContain('res.status(error.statusCode || 500)');expect(controller).toContain("code: error.code || 'REFUND_CONFIRM_FAILED'");});
});
