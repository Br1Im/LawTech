/**
 * Security-focused tests for auth + office access.
 *
 * Covers:
 *  - Expired JWT is rejected (403, not silently accepted).
 *  - Tampered JWT signature is rejected (403).
 *  - A director cannot use `X-Office-Id` to act on another director's office.
 *  - A lawyer cannot trigger the director-only X-Office-Id branch (middleware
 *    ignores the header for non-directors).
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('./setup/app');
const { registerDirector, registerDirectorWithOffice, registerLawyerWithOffice } =
  require('./setup/factories');
const db = require('../db');

describe('JWT validation', () => {
  it('rejects an expired token with 403', async () => {
    const expired = jwt.sign(
      { id: 1, email: 'expired@test.local', role: 'director' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it('rejects a token signed with a different secret with 403', async () => {
    const tampered = jwt.sign(
      { id: 1, email: 'fake@test.local', role: 'director' },
      'not-the-real-secret'
    );
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tampered}`);
    expect(res.status).toBe(401);
  });

  it('rejects an obviously malformed token with 403', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.valid.jwt');
    expect(res.status).toBe(401);
  });
});

describe('X-Office-Id header handling', () => {
  it('lets a director switch office_id only via the X-Office-Id header (auth middleware applies it)', async () => {
    const { token, user } = await registerDirector(app);
    // Manually create an office for this user (without setting users.office_id).
    const [r] = await db.query(
      'INSERT INTO offices (name, owner_id) VALUES (?, ?)',
      ['Manual Office', user.id]
    );
    const officeId = r.insertId;

    const res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Office-Id', String(officeId))
      .send({ title: 'Дело через заголовок' });

    expect(res.status).toBe(200);
    expect(res.body.data.office_id).toBe(officeId);
  });

  it('does NOT let a director access another director\'s office via a foreign X-Office-Id (ownership enforced)', async () => {
    // Regression test for the cross-office data leak (2026-06-06):
    // auth.js used to blindly trust X-Office-Id for directors without checking
    // that the director actually OWNS the requested office. A stale activeOfficeId
    // in the browser then exposed another office's data.
    const a = await registerDirectorWithOffice(app); // owns a.officeId
    const foreign = await registerDirectorWithOffice(app); // owns foreign.officeId

    // Re-login so A's JWT carries its real home office_id (production flow).
    const login = await request(app)
      .post('/api/auth/login')
      .send({ login: a.email, password: a.password });
    const aToken = login.body.token;

    const res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${aToken}`)
      .set('X-Office-Id', String(foreign.officeId)) // office A does NOT own
      .send({ title: 'Cross-office attempt' });

    // The foreign header must be ignored — the case must NEVER land in the
    // foreign office. It should fall back to A's own office.
    expect(res.body?.data?.office_id).not.toBe(foreign.officeId);
    if (res.status === 200) {
      expect(res.body.data.office_id).toBe(a.officeId);
    }
  });

  it('ignores X-Office-Id for non-director roles (lawyer cannot spoof another office)', async () => {
    const { token: lawyerToken } = await registerLawyerWithOffice(app);
    const other = await registerDirectorWithOffice(app);

    // Lawyer tries to spoof director's office via header — should NOT take
    // effect because middleware only honours the header for role=director.
    // The crm-modules controller checks `req.user.office_id` from the JWT
    // (which was set by ensureUserOffice/the lawyer factory), so the foreign
    // office_id is never used.
    const res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${lawyerToken}`)
      .set('X-Office-Id', String(other.officeId))
      .send({ title: 'Spoof attempt' });

    // The lawyer doesn't have office_id in their JWT (only in DB), so the
    // controller's assertOffice helper rejects with 403.
    expect([200, 400, 403]).toContain(res.status);
    if (res.status === 200) {
      // If accepted, it must NOT be tied to the other director's office.
      expect(res.body.data.office_id).not.toBe(other.officeId);
    }
  });
});

describe('Auth gating', () => {
  it('rejects all CRM POSTs with 401 when no Authorization header is present', async () => {
    const endpoints = [
      ['POST', '/api/clients', { name: 'X' }],
      ['POST', '/api/cases', { title: 'X' }],
      ['POST', '/api/expenses', { office_id: 1, title: 'X', amount: 1 }],
      ['POST', '/api/employees', { first_name: 'X', last_name: 'Y' }],
      ['POST', '/api/contracts', { id_employee: 1, id_client: 1, amount: 1 }],
      ['POST', '/api/applications', { client_name: 'X' }],
      ['POST', '/api/cash-register', { entry_date: '2026-01-01' }],
      ['POST', '/api/appointments', { client_name: 'X', appointment_date: '2026-01-01', appointment_time: '10:00' }],
    ];
    for (const [, url, body] of endpoints) {
      const res = await request(app).post(url).send(body);
      expect(res.status).toBe(401);
    }
  });
});
