const request = require('supertest');
const { app } = require('./setup/app');
const db = require('../db');
const { registerDirectorWithOffice } = require('./setup/factories');

describe('chat', () => {
  it('GET /api/chat/channels — директор видит reception и call_center', async () => {
    const dir = await registerDirectorWithOffice(app);

    const res = await request(app).get('/api/chat/channels').set(dir.authHeaders);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.channels)).toBe(true);
    const keys = res.body.channels.map((c) => c.key);
    expect(keys).toContain('reception');
    expect(keys).toContain('call_center');
    expect(keys).not.toContain('cc_internal');
  });

  it('POST /api/offices/:officeId/messages — отправляет сообщение в reception, сохраняется в БД', async () => {
    const dir = await registerDirectorWithOffice(app);

    const res = await request(app)
      .post(`/api/offices/${dir.officeId}/messages`)
      .set(dir.authHeaders)
      .send({ text: 'Привет из теста', channel: 'reception' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.text).toBe('Привет из теста');

    const [[row]] = await db.query(
      'SELECT * FROM messages WHERE id = ?',
      [res.body.id]
    );
    expect(row).toBeDefined();
    expect(row.office_id).toBe(dir.officeId);
    expect(row.sender_id).toBe(dir.user.id);
    expect(row.channel).toBe('reception');
    expect(row.content).toBe('Привет из теста');
  });

  it('POST без текста и без файла → 400', async () => {
    const dir = await registerDirectorWithOffice(app);
    const res = await request(app)
      .post(`/api/offices/${dir.officeId}/messages`)
      .set(dir.authHeaders)
      .send({ channel: 'reception' });
    expect(res.status).toBe(400);
  });

  it('GET /api/offices/:officeId/messages?channel=reception — возвращает только что отправленное сообщение', async () => {
    const dir = await registerDirectorWithOffice(app);

    const stamp = `marker-${Date.now()}`;
    await request(app)
      .post(`/api/offices/${dir.officeId}/messages`)
      .set(dir.authHeaders)
      .send({ text: stamp, channel: 'reception' });

    const list = await request(app)
      .get(`/api/offices/${dir.officeId}/messages?channel=reception`)
      .set(dir.authHeaders);
    expect(list.status).toBe(200);
    const items = list.body.messages || list.body.data || list.body;
    expect(Array.isArray(items)).toBe(true);
    expect(items.find((m) => m.text === stamp || m.content === stamp)).toBeTruthy();
  });
});
