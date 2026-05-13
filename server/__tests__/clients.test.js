/**
 * Integration tests for /api/clients — CRUD + DB persistence.
 *
 * Verifies that data really lands in MySQL (we read straight from the test
 * schema after each API call) and that office isolation works.
 */
const request = require('supertest');
const { app } = require('./setup/app');
const { registerLawyerWithOffice } = require('./setup/factories');
const db = require('../db');

async function fetchClient(id) {
  const [rows] = await db.query('SELECT * FROM clients WHERE id = ?', [id]);
  return rows[0];
}

describe('POST /api/clients', () => {
  it('creates a client tied to the user office (verified in DB)', async () => {
    const { token, officeId } = await registerLawyerWithOffice(app);

    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Иванов Иван Иванович',
        phone: '+7-900-000-00-01',
        email: 'ivanov@example.com',
        address: 'г. Москва, ул. Тверская, 1',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      name: 'Иванов Иван Иванович',
      phone: '+7-900-000-00-01',
      email: 'ivanov@example.com',
      office_id: officeId,
    });

    const row = await fetchClient(res.body.data.id);
    expect(row).toBeTruthy();
    expect(row.name).toBe('Иванов Иван Иванович');
    expect(row.office_id).toBe(officeId);
  });

  it('rejects creation without a name with 400', async () => {
    const { token } = await registerLawyerWithOffice(app);

    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+7-900-111-22-33' });

    expect(res.status).toBe(400);
  });

  it('rejects creation without a token with 401', async () => {
    const res = await request(app).post('/api/clients').send({ name: 'X' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/clients', () => {
  it('returns clients scoped to the user office only', async () => {
    const a = await registerLawyerWithOffice(app);
    const b = await registerLawyerWithOffice(app);

    await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ name: 'Office A Client' });
    await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${b.token}`)
      .send({ name: 'Office B Client' });

    const listA = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${a.token}`);
    expect(listA.status).toBe(200);
    expect(listA.body.data).toHaveLength(1);
    expect(listA.body.data[0].name).toBe('Office A Client');
    expect(listA.body.data[0].office_id).toBe(a.officeId);

    const listB = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${b.token}`);
    expect(listB.body.data).toHaveLength(1);
    expect(listB.body.data[0].name).toBe('Office B Client');
  });
});

describe('PUT /api/clients/:id', () => {
  it('updates fields and persists to DB', async () => {
    const { token } = await registerLawyerWithOffice(app);
    const created = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Original Name', phone: '+7-900-000-00-01' });

    const id = created.body.data.id;
    const res = await request(app)
      .put(`/api/clients/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name', phone: '+7-900-999-99-99' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');

    const row = await fetchClient(id);
    expect(row.name).toBe('Updated Name');
    expect(row.phone).toBe('+7-900-999-99-99');
  });
});

describe('DELETE /api/clients/:id', () => {
  it('removes a client from the DB', async () => {
    const { token } = await registerLawyerWithOffice(app);
    const created = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'To Delete' });
    const id = created.body.data.id;

    const res = await request(app)
      .delete(`/api/clients/${id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(await fetchClient(id)).toBeUndefined();
  });
});
