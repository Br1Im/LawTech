const request = require('supertest');
const { app } = require('./setup/app');
const db = require('../db');
const { registerDirectorWithOffice } = require('./setup/factories');

async function createClientAndContract(officeId) {
  const [clientRow] = await db.query(
    `INSERT INTO clients (name, office_id) VALUES ('Test Client', ?)`,
    [officeId]
  );
  const [empRow] = await db.query(
    `INSERT INTO employees (office_id, first_name, last_name, position)
     VALUES (?, 'Юрист', 'Тестов', 'lawyer')`,
    [officeId]
  );
  const [contractRow] = await db.query(
    `INSERT INTO contracts (id_client, id_employee, contract_type, contract_date, amount, paid_amount, office_id)
     VALUES (?, ?, 'docs', CURDATE(), 100000, 50000, ?)`,
    [clientRow.insertId, empRow.insertId, officeId]
  );
  return {
    clientId: clientRow.insertId,
    employeeId: empRow.insertId,
    contractId: contractRow.insertId,
  };
}

describe('acts', () => {
  it('POST /api/contracts/:id/acts — создаётся акт и записывается в БД', async () => {
    const dir = await registerDirectorWithOffice(app);
    const { contractId } = await createClientAndContract(dir.officeId);

    const res = await request(app)
      .post(`/api/contracts/${contractId}/acts`)
      .set(dir.authHeaders)
      .send({ amount: 25000, description: 'Подготовка иска' });

    expect(res.status).toBe(200);
    const body = res.body.data || res.body;
    expect(body.id).toBeDefined();
    expect(Number(body.amount)).toBe(25000);
    expect(body.status).toBe('draft');

    const [[row]] = await db.query('SELECT * FROM acts WHERE id = ?', [body.id]);
    expect(row).toBeDefined();
    expect(Number(row.amount)).toBe(25000);
    expect(row.contract_id).toBe(contractId);
    expect(row.office_id).toBe(dir.officeId);
    expect(row.description).toBe('Подготовка иска');
  });

  it('POST /api/contracts/:id/acts — без суммы возвращает 400', async () => {
    const dir = await registerDirectorWithOffice(app);
    const { contractId } = await createClientAndContract(dir.officeId);

    const res = await request(app)
      .post(`/api/contracts/${contractId}/acts`)
      .set(dir.authHeaders)
      .send({ description: 'Только текст без суммы' });

    expect(res.status).toBe(400);
  });

  it('POST /api/contracts/:id/acts — c суммой <= 0 возвращает 400', async () => {
    const dir = await registerDirectorWithOffice(app);
    const { contractId } = await createClientAndContract(dir.officeId);

    const res = await request(app)
      .post(`/api/contracts/${contractId}/acts`)
      .set(dir.authHeaders)
      .send({ amount: -100, description: 'Отрицательная сумма' });

    expect(res.status).toBe(400);
  });

  it('GET /api/acts — возвращает акты только своего офиса', async () => {
    const dirA = await registerDirectorWithOffice(app);
    const dirB = await registerDirectorWithOffice(app);
    const aCtx = await createClientAndContract(dirA.officeId);
    const bCtx = await createClientAndContract(dirB.officeId);

    await request(app)
      .post(`/api/contracts/${aCtx.contractId}/acts`)
      .set(dirA.authHeaders)
      .send({ amount: 1000, description: 'A act' });

    await request(app)
      .post(`/api/contracts/${bCtx.contractId}/acts`)
      .set(dirB.authHeaders)
      .send({ amount: 9999, description: 'B act' });

    const res = await request(app).get('/api/acts').set(dirA.authHeaders);
    expect(res.status).toBe(200);
    const items = res.body.data || res.body;
    expect(Array.isArray(items)).toBe(true);
    for (const a of items) {
      expect(a.office_id).toBe(dirA.officeId);
    }
  });
});
