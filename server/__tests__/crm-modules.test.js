/**
 * Integration tests for /api/cases, /api/expenses, /api/employees.
 *
 * These endpoints rely on `req.user.office_id` set via the X-Office-Id header
 * (the production director flow), so tests use `registerDirectorWithOffice`
 * which produces a token + matching X-Office-Id header bundle.
 */
const request = require('supertest');
const { app } = require('./setup/app');
const { registerDirectorWithOffice } = require('./setup/factories');
const db = require('../db');

async function fetchOne(table, id) {
  const [rows] = await db.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
  return rows[0];
}

describe('POST /api/cases', () => {
  it('creates a case and persists it to the cases table', async () => {
    const { authHeaders, officeId } = await registerDirectorWithOffice(app);

    const res = await request(app)
      .post('/api/cases')
      .set(authHeaders)
      .send({
        title: 'Дело о возмещении ущерба',
        category: 'Гражданское',
        status: 'in_progress',
        priority: 'high',
        description: 'Иск к ООО Ромашка',
        start_date: '2026-01-15',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      title: 'Дело о возмещении ущерба',
      status: 'in_progress',
      priority: 'high',
      office_id: officeId,
    });

    const row = await fetchOne('cases', res.body.data.id);
    expect(row.title).toBe('Дело о возмещении ущерба');
    expect(row.office_id).toBe(officeId);
    expect(row.workflow_status).toBe('with_manager');
  });

  it('rejects creation without a title with 400', async () => {
    const { authHeaders } = await registerDirectorWithOffice(app);
    const res = await request(app)
      .post('/api/cases')
      .set(authHeaders)
      .send({ category: 'Гражданское' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/expenses', () => {
  it('creates an expense and persists it', async () => {
    const { authHeaders, officeId, user } = await registerDirectorWithOffice(app);

    const res = await request(app)
      .post('/api/expenses')
      .set(authHeaders)
      .send({
        office_id: officeId,
        category: 'Аренда',
        amount: 50000,
        title: 'Аренда офиса январь',
        description: 'г. Москва',
        spent_on: '2026-01-31',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toEqual(expect.any(Number));

    const row = await fetchOne('expenses', res.body.data.id);
    expect(row).toBeTruthy();
    expect(row.title).toBe('Аренда офиса январь');
    expect(row.category).toBe('Аренда');
    expect(Number(row.amount)).toBe(50000);
    expect(row.office_id).toBe(officeId);
    expect(row.created_by).toBe(user.id);
  });

  it('rejects without required fields (office_id/title/amount)', async () => {
    const { authHeaders } = await registerDirectorWithOffice(app);
    const res = await request(app)
      .post('/api/expenses')
      .set(authHeaders)
      .send({ category: 'Прочее' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/office_id|title|amount/i);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .send({ office_id: 1, title: 'x', amount: 1, spent_on: '2026-01-01' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/employees', () => {
  it('creates an employee tied to the office', async () => {
    const { authHeaders, officeId } = await registerDirectorWithOffice(app);

    const res = await request(app)
      .post('/api/employees')
      .set(authHeaders)
      .send({
        first_name: 'Анна',
        last_name: 'Сидорова',
        position: 'Юрист',
        email: 'anna@office.local',
        phone: '+7-900-111-22-33',
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      first_name: 'Анна',
      last_name: 'Сидорова',
      office_id: officeId,
    });

    const row = await fetchOne('employees', res.body.data.id);
    expect(row.first_name).toBe('Анна');
    expect(row.office_id).toBe(officeId);
  });

  it('rejects without first_name/last_name with 400', async () => {
    const { authHeaders } = await registerDirectorWithOffice(app);
    const res = await request(app)
      .post('/api/employees')
      .set(authHeaders)
      .send({ position: 'Юрист' });
    expect(res.status).toBe(400);
  });
});
