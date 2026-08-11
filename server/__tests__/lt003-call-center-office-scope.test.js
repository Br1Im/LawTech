const fs = require('fs');
const path = require('path');

describe('LT-003 call-center office discovery scope', () => {
  test('meta offices are derived from active call-center connections', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'callCenterController.js'), 'utf8');
    const marker = 'A call-center user may only discover offices explicitly connected';
    const block = source.slice(source.indexOf(marker), source.indexOf(marker) + 900);
    expect(block).toContain('call_center_members');
    expect(block).toContain('office_call_centers');
    expect(block).toContain('occ.is_active = 1');
    expect(block).toContain('ccm.user_id = ?');
    expect(block).not.toContain('SELECT id, name FROM offices ORDER BY name');
  });
  test('cross-office flag requires more than one authorized office', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'callCenterController.js'), 'utf8');
    expect(source).toContain('cross_office: isCcRole && offices.length > 1');
  });
});
