/**
 * Integration tests for authentication endpoints.
 * Covers: registration, login, /auth/me, and main error paths.
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { app } = require('./setup/app');
const db = require('../db');

async function fetchUser(email) {
  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0];
}

describe('POST /api/auth/register', () => {
  it('creates a new lawyer user and returns a JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Иван Петров',
        email: 'lawyer@test.local',
        password: 'secret123',
        userType: 'lawyer',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({
      email: 'lawyer@test.local',
      role: 'lawyer',
    });

    const user = await fetchUser('lawyer@test.local');
    expect(user).toBeTruthy();
    expect(user.first_name).toBe('Иван Петров');
    expect(user.role).toBe('lawyer');
    expect(user.office_id).toBeNull();

    const matches = await bcrypt.compare('secret123', user.password);
    expect(matches).toBe(true);
  });

  it('creates a director without office (needs_office_setup path)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Директор',
        email: 'director@test.local',
        password: 'secret123',
        userType: 'office',
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('director');
    expect(res.body.user.needs_office_setup).toBeTruthy();

    const user = await fetchUser('director@test.local');
    expect(user.role).toBe('director');
    expect(user.office_id).toBeNull();
  });

  it('rejects duplicate email with 409', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'A',
      email: 'dup@test.local',
      password: 'p1',
      userType: 'lawyer',
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'B',
      email: 'dup@test.local',
      password: 'p2',
      userType: 'lawyer',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/уже существует/i);
  });

  it('rejects missing required fields with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'incomplete@test.local',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/login', () => {
  async function registerUser({ email = 'login@test.local', password = 'secret123' } = {}) {
    await request(app).post('/api/auth/register').send({
      name: 'Login User',
      email,
      password,
      userType: 'lawyer',
    });
    return { email, password };
  }

  it('returns a JWT for valid credentials', async () => {
    const { email, password } = await registerUser();

    const res = await request(app).post('/api/auth/login').send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(email);
  });

  it('rejects wrong password with 401', async () => {
    const { email } = await registerUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.local', password: 'whatever' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user for a valid token', async () => {
    const register = await request(app).post('/api/auth/register').send({
      name: 'Me User',
      email: 'me@test.local',
      password: 'secret123',
      userType: 'lawyer',
    });

    const token = register.body.token;
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@test.local');
    expect(res.body.user.role).toBe('lawyer');
  });

  it('rejects requests without an Authorization header with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid token with 403', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect([401, 403]).toContain(res.status);
  });
});
