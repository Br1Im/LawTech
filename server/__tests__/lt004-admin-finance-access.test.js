const fs = require('fs');
const path = require('path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('LT-004 administrator finance boundaries', () => {
  test('admin is not a finance reader or balance role', () => {
    expect(read('utils/financeSecurity.js')).toContain("FINANCE_READ_ROLES = new Set(['director', 'manager', 'okk'])");
    expect(read('controllers/balanceController.js')).toContain("COMPOSITION_ROLES = ['director','manager','okk']");
  });
  test('individual salary response is restricted and redacted', () => {
    const source = read('controllers/salaryController.js');
    expect(source).toContain("canViewOfficePayroll = ['owner','director','manager','okk'].includes(viewerRole)");
    expect(source).toContain('office_cash: canViewOfficePayroll ? officeCash : null');
    expect(source).toContain('settings: canViewOfficePayroll ? settings : null');
  });
});
