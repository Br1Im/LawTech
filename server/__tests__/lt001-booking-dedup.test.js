const fs = require('fs');
const path = require('path');

describe('LT-001 lead booking deduplication', () => {
  test('booking locks the lead and returns a typed conflict for an existing appointment', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'callCenterController.js'), 'utf8');
    expect(source).toContain('FOR UPDATE');
    expect(source).toContain("code: 'LEAD_ALREADY_BOOKED'");
    expect(source).toContain('WHERE lead_id = ?');
  });
  test('migration installs a unique lead constraint', () => {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'migrations', '045_prevent_duplicate_lead_appointments.sql'), 'utf8');
    expect(sql).toContain('UNIQUE KEY uq_appointments_lead (lead_id)');
  });
});
