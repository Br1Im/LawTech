const fs = require('fs');
const path = require('path');

describe('LT-017 contract write policy', () => {
  const routes = fs.readFileSync(path.join(__dirname, '../routes/contracts.js'), 'utf8');
  const controller = fs.readFileSync(path.join(__dirname, '../controllers/contractController.js'), 'utf8');

  test('card-data requires tenant access and only leadership or assigned lawyer', () => {
    expect(routes).toContain('checkOfficeAccess(req.user, contract.office_id)');
    expect(routes).toContain("const leadership=['director','manager','okk'].includes(role)");
    expect(routes).toContain("const assignedLawyer=role==='lawyer'");
    expect(routes).not.toContain("['director','manager','okk','admin','administrator'].includes(role)");
  });

  test('full update and delete are leadership-only', () => {
    expect(controller.match(/Full change|Полное изменение договора доступно только руководству/)).toBeTruthy();
    expect(controller).toContain('Удаление договора доступно только руководству');
    expect((controller.match(/\['director', 'manager', 'okk'\]\.includes\(role\)/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
