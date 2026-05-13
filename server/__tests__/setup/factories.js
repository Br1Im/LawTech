/**
 * Test factory helpers — create authenticated users + offices via the public
 * API so tests stay close to real flow. Returns the JWT + user record.
 */
const request = require('supertest');
const db = require('../../db');

let counter = 0;
function uniqueEmail(prefix = 'user') {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@test.local`;
}

async function registerLawyer(app, overrides = {}) {
  const email = overrides.email || uniqueEmail('lawyer');
  const res = await request(app).post('/api/auth/register').send({
    name: overrides.name || 'Test Lawyer',
    email,
    password: overrides.password || 'secret123',
    userType: 'lawyer',
    ...overrides,
  });
  if (res.status !== 201) {
    throw new Error(`registerLawyer failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user, email, password: 'secret123' };
}

async function registerDirector(app, overrides = {}) {
  const email = overrides.email || uniqueEmail('director');
  const res = await request(app).post('/api/auth/register').send({
    name: overrides.name || 'Test Director',
    email,
    password: overrides.password || 'secret123',
    userType: 'office',
    ...overrides,
  });
  if (res.status !== 201) {
    throw new Error(`registerDirector failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user, email, password: 'secret123' };
}

async function createOfficeForUser(userId, name = 'Test Office') {
  const [result] = await db.query(
    'INSERT INTO offices (name, owner_id) VALUES (?, ?)',
    [name, userId]
  );
  const officeId = result.insertId;
  await db.query('UPDATE users SET office_id = ? WHERE id = ?', [officeId, userId]);
  return officeId;
}

async function registerLawyerWithOffice(app, overrides = {}) {
  const lawyer = await registerLawyer(app, overrides);
  const officeId = await createOfficeForUser(lawyer.user.id, overrides.officeName);
  return { ...lawyer, officeId };
}

/**
 * Register a director and create an office they own. Returns headers helper
 * that includes the X-Office-Id (production flow for directors).
 */
async function registerDirectorWithOffice(app, overrides = {}) {
  const director = await registerDirector(app, overrides);
  const officeId = await createOfficeForUser(director.user.id, overrides.officeName);
  return {
    ...director,
    officeId,
    authHeaders: {
      Authorization: `Bearer ${director.token}`,
      'X-Office-Id': String(officeId),
    },
  };
}

module.exports = {
  uniqueEmail,
  registerLawyer,
  registerDirector,
  registerDirectorWithOffice,
  createOfficeForUser,
  registerLawyerWithOffice,
};
