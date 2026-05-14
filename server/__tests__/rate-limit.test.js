/**
 * Rate-limit smoke tests.
 *
 * Под NODE_ENV=test глобальные лимитеры в routes/api.js специально подняты
 * до 10000 запросов, чтобы не мешать integration-тестам. Поэтому здесь мы
 * проверяем сам middleware через отдельный мини-app — это гарантирует, что
 * express-rate-limit установлен, работает, возвращает 429 и стандартные
 * RateLimit-* заголовки.
 */
const express = require('express');
const request = require('supertest');
const rateLimit = require('express-rate-limit');

function buildApp({ max = 3, windowMs = 60_000, skipSuccessfulRequests = false } = {}) {
  const app = express();
  app.use(express.json());
  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    message: { success: false, message: 'Слишком много попыток входа.' },
  });
  app.post('/login', limiter, (req, res) => {
    if (req.body?.bad) return res.status(401).json({ success: false });
    return res.json({ success: true });
  });
  return app;
}

describe('express-rate-limit middleware', () => {
  it('возвращает 429 после исчерпания лимита', async () => {
    const app = buildApp({ max: 2 });

    const r1 = await request(app).post('/login').send({ bad: true });
    expect(r1.status).toBe(401);

    const r2 = await request(app).post('/login').send({ bad: true });
    expect(r2.status).toBe(401);

    const r3 = await request(app).post('/login').send({ bad: true });
    expect(r3.status).toBe(429);
    expect(r3.body).toMatchObject({ success: false, message: expect.any(String) });
  });

  it('выставляет RateLimit-* заголовки на каждом ответе', async () => {
    const app = buildApp({ max: 5 });
    const r = await request(app).post('/login').send({ bad: true });
    expect(r.headers['ratelimit-limit']).toBeDefined();
    expect(r.headers['ratelimit-remaining']).toBeDefined();
  });

  it('skipSuccessfulRequests=true не учитывает 2xx ответы в счётчике', async () => {
    const app = buildApp({ max: 2, skipSuccessfulRequests: true });

    // 5 успешных запросов подряд — не должны исчерпывать лимит
    for (let i = 0; i < 5; i++) {
      const r = await request(app).post('/login').send({});
      expect(r.status).toBe(200);
    }
  });
});
