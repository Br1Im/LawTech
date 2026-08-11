const fs=require('fs');const path=require('path');
const analytics=fs.readFileSync(path.join(__dirname,'..','controllers','analyticsController.js'),'utf8');
const controller=fs.readFileSync(path.join(__dirname,'..','controllers','callCenterController.js'),'utf8');
describe('LT-016 technical appointment analytics',()=>{
 test('all appointment analytics exclude technical rows centrally',()=>{expect(analytics).toContain("COALESCE(a.is_technical, 0) = 0");});
 test('technical flag requires an internal operation header',()=>{expect(controller).toContain("req.get('x-internal-operation') === 'technical-cleanup'");expect(controller).toContain("updates.push('is_technical = 1')");});
});
