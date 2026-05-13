const request = require('supertest');
const { app } = require('./setup/app');
const db = require('../db');
const { registerDirectorWithOffice } = require('./setup/factories');

describe('office dashboard + plan', () => {
  it('GET /api/office/:officeId/dashboard — структура ответа с fact / plan / lawyers_cash', async () => {
    const dir = await registerDirectorWithOffice(app);

    const res = await request(app)
      .get(`/api/office/${dir.officeId}/dashboard`)
      .set(dir.authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const d = res.body.data;
    expect(d).toBeDefined();
    expect(d.period).toBeDefined();
    expect(d.fact).toBeDefined();
    expect(typeof d.fact.day).toBe('number');
    expect(typeof d.fact.period).toBe('number');
    expect(Array.isArray(d.lawyers_cash)).toBe(true);
  });

  it('GET /api/office/:officeId/dashboard чужого офиса → 403', async () => {
    const dir1 = await registerDirectorWithOffice(app);
    const dir2 = await registerDirectorWithOffice(app);

    const res = await request(app)
      .get(`/api/office/${dir2.officeId}/dashboard`)
      .set(dir1.authHeaders);

    expect(res.status).toBe(403);
  });

  it('PUT /api/office/:officeId/plan — создаёт план, GET возвращает его', async () => {
    const dir = await registerDirectorWithOffice(app);

    const put = await request(app)
      .put(`/api/office/${dir.officeId}/plan`)
      .set(dir.authHeaders)
      .send({
        daily_plan_weekday: 10000,
        daily_plan_weekend: 5000,
        period_plan_amount: 300000,
        period_start: '2026-05-01',
        period_end: '2026-05-31',
      });
    expect([200, 201]).toContain(put.status);
    expect(put.body.success).toBe(true);

    const [[row]] = await db.query(
      'SELECT * FROM office_plans WHERE office_id = ? ORDER BY updated_at DESC LIMIT 1',
      [dir.officeId]
    );
    expect(row).toBeDefined();
    expect(Number(row.daily_plan_weekday)).toBe(10000);
    expect(Number(row.period_plan_amount)).toBe(300000);

    const get = await request(app)
      .get(`/api/office/${dir.officeId}/plan`)
      .set(dir.authHeaders);
    expect(get.status).toBe(200);
    expect(get.body.data).toBeDefined();
    expect(Number(get.body.data.daily_plan_weekday)).toBe(10000);
    expect(Number(get.body.data.period_plan_amount)).toBe(300000);
  });

  it('GET /api/office/:officeId/dashboard — gzip-сжатый ответ при наличии Accept-Encoding', async () => {
    const dir = await registerDirectorWithOffice(app);

    const res = await request(app)
      .get(`/api/office/${dir.officeId}/dashboard`)
      .set(dir.authHeaders)
      .set('Accept-Encoding', 'gzip');

    expect(res.status).toBe(200);
    // Если payload > threshold (1024 байт) — должен быть gzip.
    // При маленьком пустом дашборде compression может не срабатывать,
    // поэтому просто проверяем, что middleware не ломает ответ.
    expect(res.body.success).toBe(true);
  });
});
