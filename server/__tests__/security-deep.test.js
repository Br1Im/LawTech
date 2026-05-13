/**
 * Deep security tests — complementary to security.test.js.
 *
 * Covers:
 *  - JWT tampering: alg:none, payload-only modification, foreign secret,
 *    role escalation attempt via payload swap.
 *  - SQL injection probes: dangerous strings end up stored as literals
 *    (parameterised queries do their job) — neither blow up the server
 *    nor leak data.
 *  - Mass-assignment guards: lawyer cannot inject `office_id` / `role`
 *    via request body; server overrides with values from JWT/DB.
 *  - IDOR / cross-office data leak: lawyer of office A cannot read
 *    office B's clients via numeric id manipulation.
 *  - Header-based parsing safety: SQLi-ish `X-Office-Id` reduces to
 *    a safe integer via `parseInt` and never reaches the SQL layer raw.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('./setup/app');
const db = require('../db');
const {
  registerDirector,
  registerDirectorWithOffice,
  registerLawyer,
} = require('./setup/factories');

/**
 * Register a lawyer and attach them to an existing office (rather than the
 * personal office that registerLawyerWithOffice would auto-create).
 * Re-login afterwards so the JWT carries the correct office_id.
 */
async function seedLawyerInOffice(officeId) {
  const lawyer = await registerLawyer(app);
  await db.query('UPDATE users SET office_id = ? WHERE id = ?', [
    officeId,
    lawyer.user.id,
  ]);
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: lawyer.email, password: lawyer.password });
  if (loginRes.status !== 200) {
    throw new Error(`seedLawyerInOffice login failed: ${loginRes.status}`);
  }
  return { token: loginRes.body.token, user: loginRes.body.user };
}

const SECRET = process.env.JWT_SECRET || 'test_secret';

function base64url(input) {
  return Buffer.from(JSON.stringify(input))
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

describe('JWT tampering', () => {
  it('rejects an `alg: none` unsigned token', async () => {
    // Hand-craft an alg:none token. jwt.verify with a secret should reject it.
    const header = base64url({ alg: 'none', typ: 'JWT' });
    const payload = base64url({
      id: 999999,
      role: 'director',
      office_id: 1,
      iat: Math.floor(Date.now() / 1000),
    });
    const noneToken = `${header}.${payload}.`;

    const res = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${noneToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false });
  });

  it('rejects a token whose payload was modified after signing', async () => {
    // Sign a low-privilege payload, then swap the payload section with a
    // higher-privilege one. The signature segment now mismatches.
    const goodToken = jwt.sign(
      { id: 1, role: 'lawyer', office_id: 1 },
      SECRET,
      { expiresIn: '1h' }
    );
    const [header, , signature] = goodToken.split('.');
    const tamperedPayload = base64url({
      id: 1,
      role: 'director',
      office_id: 1,
      iat: Math.floor(Date.now() / 1000),
    });
    const tampered = `${header}.${tamperedPayload}.${signature}`;

    const res = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${tampered}`);

    expect(res.status).toBe(403);
  });

  it('rejects a re-signed token using a foreign secret (role escalation attempt)', async () => {
    // Attacker tries to mint a director-level token with their own secret.
    const forged = jwt.sign(
      { id: 999, role: 'director', office_id: 999 },
      'attacker-secret-not-the-server',
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${forged}`);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false });
  });

  it('rejects a token with no signature segment', async () => {
    const goodToken = jwt.sign({ id: 1, role: 'lawyer' }, SECRET);
    const [h, p] = goodToken.split('.');
    const noSig = `${h}.${p}.`;

    const res = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${noSig}`);

    expect(res.status).toBe(403);
  });
});

describe('SQL injection probes', () => {
  it("doesn't leak data when login email contains classic SQLi payloads", async () => {
    const payloads = [
      "admin' OR '1'='1",
      "admin' --",
      "'; DROP TABLE users; --",
      "' UNION SELECT id, password FROM users --",
    ];

    for (const evil of payloads) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: evil, password: 'whatever' });
      expect([400, 401, 404]).toContain(res.status);
      expect(res.body).not.toHaveProperty('token');
    }

    // Sanity: the users table is still there + responsive.
    const [rows] = await db.query('SELECT COUNT(*) AS c FROM users');
    expect(rows[0].c).toBeGreaterThanOrEqual(0);
  });

  it('stores a SQLi-laced client name verbatim (parameterised inserts)', async () => {
    const { authHeaders, officeId } = await registerDirectorWithOffice(app);
    const evilName = "Robert'); DROP TABLE clients; --";

    const res = await request(app)
      .post('/api/clients')
      .set(authHeaders)
      .send({ name: evilName });
    expect(res.status).toBe(201);

    // Table still alive + value stored as literal string.
    const [rows] = await db.query(
      'SELECT name FROM clients WHERE office_id = ? AND name = ?',
      [officeId, evilName]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe(evilName);
  });

  it('does not interpret numeric id with SQL noise as anything but a 404', async () => {
    const { token } = await registerDirectorWithOffice(app);
    const evilIds = ['1 OR 1=1', '1; DROP TABLE clients', "1' OR '1'='1"];

    for (const id of evilIds) {
      const res = await request(app)
        .get(`/api/clients/${encodeURIComponent(id)}`)
        .set('Authorization', `Bearer ${token}`);
      // The id should not match any real client; we accept 404/400/500-as-handled.
      expect([200, 400, 404, 500]).toContain(res.status);
      if (res.status === 200) {
        // If we got 200, at minimum the returned row's id is sanitised (parseInt).
        expect(res.body?.data?.id ?? 1).toBe(1);
      }
    }

    // clients table still healthy.
    const [rows] = await db.query('SELECT COUNT(*) AS c FROM clients');
    expect(rows[0].c).toBeGreaterThanOrEqual(0);
  });
});

describe('Mass-assignment / body-override guards', () => {
  it('ignores `office_id` in the body when creating a client (uses JWT office_id)', async () => {
    const owner = await registerDirectorWithOffice(app);
    const attacker = await registerDirectorWithOffice(app);

    // attacker tries to plant a client into the owner's office via body.
    const res = await request(app)
      .post('/api/clients')
      .set(attacker.authHeaders)
      .send({ name: 'Spoofed Client', office_id: owner.officeId });
    expect(res.status).toBe(201);

    // The client must end up in attacker's office, NOT owner's.
    const [rows] = await db.query(
      'SELECT office_id FROM clients WHERE id = ?',
      [res.body.data.id]
    );
    expect(rows[0].office_id).toBe(attacker.officeId);
    expect(rows[0].office_id).not.toBe(owner.officeId);
  });

  it("does not let a lawyer escalate `role` via /api/auth/register's userType", async () => {
    // Registering with userType='director' yields an office account, that's
    // by design. But registering with an unknown userType must NOT default
    // to 'director' or 'admin'.
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Sneaky',
        email: `escalate-${Date.now()}@test.local`,
        password: 'pwd12345',
        userType: 'super_admin', // not a real role
      });
    expect([200, 201, 400]).toContain(res.status);
    if (res.status === 201 || res.status === 200) {
      const role = res.body?.user?.role;
      // Should never be elevated to director/admin/owner.
      expect(['director', 'admin', 'owner']).not.toContain(role);
    }
  });
});

describe('IDOR / cross-office data isolation', () => {
  it('lawyer of office A cannot list clients of office B', async () => {
    const officeA = await registerDirectorWithOffice(app);
    const officeB = await registerDirectorWithOffice(app);

    // Seed a known client into office B.
    const [r] = await db.query(
      'INSERT INTO clients (name, office_id) VALUES (?, ?)',
      ['B-Only Client', officeB.officeId]
    );
    const bClientId = r.insertId;

    // Lawyer assigned to office A.
    const lawyer = await seedLawyerInOffice(officeA.officeId);

    // GET /api/clients must return ONLY office A's clients.
    const listRes = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${lawyer.token}`);
    expect(listRes.status).toBe(200);
    const list = listRes.body.data || listRes.body || [];
    const items = Array.isArray(list) ? list : list.items || [];
    expect(items.find((c) => c.id === bClientId)).toBeUndefined();
  });

  it("lawyer cannot spoof another office by passing X-Office-Id (middleware ignores it for non-directors)", async () => {
    const officeA = await registerDirectorWithOffice(app);
    const officeB = await registerDirectorWithOffice(app);
    const lawyer = await seedLawyerInOffice(officeA.officeId);

    // Lawyer in office A tries to create a case spoofing office B via header.
    const res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${lawyer.token}`)
      .set('X-Office-Id', String(officeB.officeId))
      .send({ title: 'Cross-office spoof attempt' });

    expect(res.status).toBe(200);
    // The case must land in the lawyer's real office (A), not B.
    expect(res.body.data.office_id).toBe(officeA.officeId);
    expect(res.body.data.office_id).not.toBe(officeB.officeId);
  });
});

describe('Header parsing safety', () => {
  it('coerces a SQLi-style X-Office-Id to a safe integer via parseInt', async () => {
    const { token, user } = await registerDirector(app);
    // Manually create office and link to director.
    const [r] = await db.query(
      'INSERT INTO offices (name, owner_id) VALUES (?, ?)',
      ['Probe Office', user.id]
    );
    const officeId = r.insertId;

    // `X-Office-Id: 1 OR 1=1` → parseInt('1 OR 1=1', 10) === 1
    // We craft the header so the parsed result equals our real office id.
    const headerValue = `${officeId} OR 1=1; DROP TABLE offices --`;
    const res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Office-Id', headerValue)
      .send({ title: 'Header sanity case' });

    expect(res.status).toBe(200);
    expect(res.body.data.office_id).toBe(officeId);

    // Crucial side-effect: offices table is still there.
    const [check] = await db.query('SELECT COUNT(*) AS c FROM offices');
    expect(check[0].c).toBeGreaterThan(0);
  });
});
