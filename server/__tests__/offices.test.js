/**
 * Integration tests for /api/offices CRUD.
 */
const request = require('supertest');
const { app } = require('./setup/app');
const { registerDirector } = require('./setup/factories');
const db = require('../db');

describe('POST /api/offices', () => {
  it('creates an office and sets owner_id + binds to user', async () => {
    const { token, user } = await registerDirector(app);

    const res = await request(app)
      .post('/api/offices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Юридическая контора N1',
        address: 'г. Москва, ул. Тверская, 5',
        contact_phone: '+7-495-100-20-30',
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Юридическая контора N1');

    const officeId = Number(res.body.id);
    const [offices] = await db.query('SELECT * FROM offices WHERE id = ?', [officeId]);
    expect(offices[0]).toBeTruthy();
    expect(offices[0].owner_id).toBe(user.id);

    const [users] = await db.query('SELECT office_id FROM users WHERE id = ?', [user.id]);
    expect(users[0].office_id).toBe(officeId);
  });

  it('rejects creation without a name with 400', async () => {
    const { token } = await registerDirector(app);
    const res = await request(app)
      .post('/api/offices')
      .set('Authorization', `Bearer ${token}`)
      .send({ address: 'No-name' });
    expect(res.status).toBe(400);
  });

  it('rejects creation without a token with 401', async () => {
    const res = await request(app).post('/api/offices').send({ name: 'Sneaky' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/offices/my', () => {
  it('returns offices owned by the user', async () => {
    const { token } = await registerDirector(app);

    await request(app)
      .post('/api/offices')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Office X' });

    const res = await request(app)
      .get('/api/offices/my')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const names = (res.body.data || res.body).map((o) => o.name);
    expect(names).toContain('Office X');
  });
});

describe('PUT /api/offices/:officeId', () => {
  it('updates office fields', async () => {
    const { token } = await registerDirector(app);
    const created = await request(app)
      .post('/api/offices')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Original Office', address: 'addr1' });

    const officeId = created.body.id;
    const res = await request(app)
      .put(`/api/offices/${officeId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Office-Id', String(officeId))
      .send({ name: 'Renamed Office', address: 'addr2' });

    expect([200, 204]).toContain(res.status);

    const [rows] = await db.query('SELECT name, address FROM offices WHERE id = ?', [officeId]);
    expect(rows[0].name).toBe('Renamed Office');
    expect(rows[0].address).toBe('addr2');
  });

  it('returns 403 when a different user tries to update someone else\'s office (IDOR)', async () => {
    const owner = await registerDirector(app);
    const stranger = await registerDirector(app);

    const created = await request(app)
      .post('/api/offices')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Owner Office', address: 'private addr' });
    const officeId = created.body.id;

    const res = await request(app)
      .put(`/api/offices/${officeId}`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ name: 'HACKED', address: 'evil addr' });

    expect(res.status).toBe(403);

    const [rows] = await db.query('SELECT name FROM offices WHERE id = ?', [officeId]);
    expect(rows[0].name).toBe('Owner Office');
  });
});

describe('DELETE /api/offices/:officeId', () => {
  it('owner can delete own office', async () => {
    const owner = await registerDirector(app);
    const created = await request(app)
      .post('/api/offices')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'To be deleted' });
    const officeId = created.body.id;

    const res = await request(app)
      .delete(`/api/offices/${officeId}`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect([200, 204]).toContain(res.status);
    const [rows] = await db.query('SELECT id FROM offices WHERE id = ?', [officeId]);
    expect(rows.length).toBe(0);
  });

  it('returns 403 when a stranger tries to delete someone else\'s office (IDOR)', async () => {
    const owner = await registerDirector(app);
    const stranger = await registerDirector(app);

    const created = await request(app)
      .post('/api/offices')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Owner Office 2' });
    const officeId = created.body.id;

    const res = await request(app)
      .delete(`/api/offices/${officeId}`)
      .set('Authorization', `Bearer ${stranger.token}`);

    expect(res.status).toBe(403);

    const [rows] = await db.query('SELECT id FROM offices WHERE id = ?', [officeId]);
    expect(rows.length).toBe(1);
  });
});
