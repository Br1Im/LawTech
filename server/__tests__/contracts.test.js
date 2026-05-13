/**
 * Integration tests for /api/contracts.
 *
 * Contracts are anchored to an employee row (controller derives office_id
 * from `employees.office_id`), so each test first seeds an employee + client
 * tied to the test office.
 */
const request = require('supertest');
const { app } = require('./setup/app');
const { registerDirectorWithOffice } = require('./setup/factories');
const db = require('../db');

async function seedEmployee(officeId, overrides = {}) {
  const [r] = await db.query(
    `INSERT INTO employees (first_name, last_name, position, office_id, email)
     VALUES (?, ?, ?, ?, ?)`,
    [
      overrides.first_name || 'Иван',
      overrides.last_name || 'Юрист',
      overrides.position || 'Юрист',
      officeId,
      overrides.email || `emp-${Date.now()}-${Math.random()}@test.local`,
    ]
  );
  return r.insertId;
}

async function seedClient(officeId, name = 'Тестовый клиент') {
  const [r] = await db.query(
    'INSERT INTO clients (name, office_id) VALUES (?, ?)',
    [name, officeId]
  );
  return r.insertId;
}

describe('POST /api/contracts', () => {
  it('creates a contract with paid_amount = amount and persists to DB', async () => {
    const { authHeaders, officeId } = await registerDirectorWithOffice(app);
    const employeeId = await seedEmployee(officeId);
    const clientId = await seedClient(officeId);

    const res = await request(app)
      .post('/api/contracts')
      .set(authHeaders)
      .send({
        id_employee: employeeId,
        id_client: clientId,
        amount: 100000,
        title: 'Договор оказания юр. услуг',
        contract_type: 'docs',
        status: 'active',
        contract_date: '2026-01-15',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeTruthy();

    const [rows] = await db.query('SELECT * FROM contracts WHERE id = ?', [
      res.body.data.id,
    ]);
    const row = rows[0];
    expect(row).toBeTruthy();
    expect(Number(row.amount)).toBe(100000);
    expect(Number(row.paid_amount)).toBe(100000);
    expect(row.office_id).toBe(officeId);
    expect(row.id_employee).toBe(employeeId);
    expect(row.id_client).toBe(clientId);
  });

  it('honours explicit paid_amount when smaller than amount', async () => {
    const { authHeaders, officeId } = await registerDirectorWithOffice(app);
    const employeeId = await seedEmployee(officeId);
    const clientId = await seedClient(officeId);

    const res = await request(app)
      .post('/api/contracts')
      .set(authHeaders)
      .send({
        id_employee: employeeId,
        id_client: clientId,
        amount: 100000,
        paid_amount: 25000,
        title: 'Договор с предоплатой',
        contract_date: '2026-01-15',
      });

    expect(res.status).toBe(201);
    const [rows] = await db.query('SELECT amount, paid_amount FROM contracts WHERE id = ?', [
      res.body.data.id,
    ]);
    expect(Number(rows[0].amount)).toBe(100000);
    expect(Number(rows[0].paid_amount)).toBe(25000);
  });

  it('rejects creation without id_employee/id_client/amount with 400', async () => {
    const { authHeaders } = await registerDirectorWithOffice(app);
    const res = await request(app)
      .post('/api/contracts')
      .set(authHeaders)
      .send({ title: 'incomplete' });
    expect(res.status).toBe(400);
    expect(res.body.details).toMatchObject({
      id_employee: false,
      id_client: false,
      amount: false,
    });
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/contracts')
      .send({ id_employee: 1, id_client: 1, amount: 1 });
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/contracts/:id', () => {
  it('updates fields and persists the change', async () => {
    const { authHeaders, officeId } = await registerDirectorWithOffice(app);
    const employeeId = await seedEmployee(officeId);
    const clientId = await seedClient(officeId);

    const created = await request(app)
      .post('/api/contracts')
      .set(authHeaders)
      .send({
        id_employee: employeeId,
        id_client: clientId,
        amount: 50000,
        contract_date: '2026-01-15',
      });
    const id = created.body.data.id;

    const res = await request(app)
      .put(`/api/contracts/${id}`)
      .set(authHeaders)
      .send({
        id_employee: employeeId,
        id_client: clientId,
        contract_date: '2026-01-15',
        amount: 75000,
        title: 'Изменённый договор',
      });

    expect(res.status).toBe(200);
    const [rows] = await db.query('SELECT amount, title FROM contracts WHERE id = ?', [id]);
    expect(Number(rows[0].amount)).toBe(75000);
    expect(rows[0].title).toBe('Изменённый договор');
  });
});

describe('GET /api/contracts', () => {
  it('lists contracts scoped to the user office only', async () => {
    const a = await registerDirectorWithOffice(app);
    const b = await registerDirectorWithOffice(app);

    const empA = await seedEmployee(a.officeId);
    const cliA = await seedClient(a.officeId, 'Client A');
    const empB = await seedEmployee(b.officeId);
    const cliB = await seedClient(b.officeId, 'Client B');

    await request(app)
      .post('/api/contracts')
      .set(a.authHeaders)
      .send({
        id_employee: empA,
        id_client: cliA,
        amount: 1000,
        title: 'A-contract',
        contract_date: '2026-01-15',
      });
    await request(app)
      .post('/api/contracts')
      .set(b.authHeaders)
      .send({
        id_employee: empB,
        id_client: cliB,
        amount: 2000,
        title: 'B-contract',
        contract_date: '2026-01-15',
      });

    const listA = await request(app).get('/api/contracts').set(a.authHeaders);
    expect(listA.status).toBe(200);
    const titlesA = listA.body.data.map((c) => c.title);
    expect(titlesA).toContain('A-contract');
    expect(titlesA).not.toContain('B-contract');
  });
});
