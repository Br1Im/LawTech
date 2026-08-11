const fs = require('fs');
const path = require('path');

describe('LT-002 terminated contract payments', () => {
  test('locked contract query includes termination state', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'paymentController.js'), 'utf8');
    expect(source).toContain('status, terminated_at');
    expect(source).toContain("code: 'CONTRACT_TERMINATED'");
    expect(source).toContain('Нельзя добавлять оплату по расторгнутому договору');
  });
});
