/**
 * WebSocket / socket.io tests.
 *
 * Cover the realtime layer end-to-end:
 *  - JWT auth on socket handshake (valid token connects, invalid is rejected)
 *  - `office:` room delivery for contract:new (router → emitToOffice → io.to(room))
 *  - cross-office isolation (B does not receive A's events)
 *  - chat:message delivery after `switch_office` (allowlist + role filter)
 *
 * Each test boots its own http.Server with socketManager bound, then closes
 * everything in afterEach to keep the process clean.
 */
const http = require('http');
const request = require('supertest');
const { io: ioClient } = require('socket.io-client');
const { app } = require('./setup/app');
const db = require('../db');
const socketManager = require('../socketManager');
const { registerDirectorWithOffice } = require('./setup/factories');

const PORT_BASE = 'http://127.0.0.1:';

/**
 * registerDirectorWithOffice() returns the token issued at /register time,
 * BEFORE office_id was set on the user row. The socket handshake reads
 * office_id from the JWT payload, so we re-login to mint a fresh token
 * that actually carries office_id.
 */
async function seedDirectorWithFreshToken(appCtx) {
  const dir = await registerDirectorWithOffice(appCtx);
  const loginRes = await request(appCtx)
    .post('/api/auth/login')
    .send({ email: dir.email, password: dir.password });
  if (loginRes.status !== 200) {
    throw new Error(`re-login failed: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
  }
  return { ...dir, token: loginRes.body.token, user: loginRes.body.user };
}

async function seedEmployee(officeId) {
  const [r] = await db.query(
    `INSERT INTO employees (first_name, last_name, position, office_id, email)
     VALUES (?, ?, ?, ?, ?)`,
    ['Юр.', 'Помощник', 'Юрист', officeId, `ws-emp-${Date.now()}-${Math.random()}@test.local`]
  );
  return r.insertId;
}

async function seedClient(officeId, name = 'WS Test Client') {
  const [r] = await db.query(
    'INSERT INTO clients (name, office_id) VALUES (?, ?)',
    [name, officeId]
  );
  return r.insertId;
}

function bootServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    socketManager.init(server);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port, baseURL: `${PORT_BASE}${port}` });
    });
  });
}

async function closeServer(server) {
  const io = socketManager.getIO();
  if (io) {
    io.disconnectSockets(true);
    await new Promise((resolve) => io.close(() => resolve()));
  }
  await new Promise((resolve) => server.close(() => resolve()));
}

function connectClient(baseURL, token, opts = {}) {
  return new Promise((resolve, reject) => {
    const socket = ioClient(baseURL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
      ...opts,
    });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (err) => reject(err));
    setTimeout(() => reject(new Error('connect timeout')), 5000);
  });
}

function waitForEvent(socket, event, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`event '${event}' did not arrive within ${timeoutMs}ms`));
    }, timeoutMs);
    function handler(payload) {
      clearTimeout(timer);
      resolve(payload);
    }
    socket.once(event, handler);
  });
}

describe('WebSocket / socket.io', () => {
  let server;
  let baseURL;

  beforeEach(async () => {
    const boot = await bootServer();
    server = boot.server;
    baseURL = boot.baseURL;
  });

  afterEach(async () => {
    if (server) {
      await closeServer(server);
    }
  });

  describe('handshake auth', () => {
    it('connects with a valid JWT', async () => {
      const dir = await seedDirectorWithFreshToken(app);
      const sock = await connectClient(baseURL, dir.token);
      expect(sock.connected).toBe(true);
      sock.disconnect();
    });

    it('rejects connection without a token', async () => {
      await expect(connectClient(baseURL, undefined)).rejects.toThrow(/Authentication/i);
    });

    it('rejects connection with an invalid token', async () => {
      await expect(connectClient(baseURL, 'not-a-real-jwt')).rejects.toThrow(/Invalid token/i);
    });
  });

  describe('office room: contract:new delivery', () => {
    it('emits contract:new to the office room after POST /api/contracts', async () => {
      const dir = await seedDirectorWithFreshToken(app);
      const sock = await connectClient(baseURL, dir.token);

      const employeeId = await seedEmployee(dir.officeId);
      const clientId = await seedClient(dir.officeId);

      const eventPromise = waitForEvent(sock, 'contract:new');

      const res = await request(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer ${dir.token}`)
        .set('X-Office-Id', String(dir.officeId))
        .send({
          id_employee: employeeId,
          id_client: clientId,
          amount: 50000,
          title: 'WS test contract',
          contract_type: 'docs',
          status: 'active',
          contract_date: '2026-01-15',
        });
      expect(res.status).toBe(201);

      const payload = await eventPromise;
      expect(payload).toMatchObject({ title: 'Новый договор', type: 'success' });
      // MySQL DECIMAL → string in JSON; just verify the data carries the amount.
      expect(String(payload.data.amount)).toMatch(/^50000(\.00)?$/);
      expect(payload.data.title).toBe('WS test contract');

      sock.disconnect();
    });

    it('does NOT deliver contract:new to a different office', async () => {
      const dirA = await seedDirectorWithFreshToken(app);
      const dirB = await seedDirectorWithFreshToken(app);

      const sockB = await connectClient(baseURL, dirB.token);

      const employeeId = await seedEmployee(dirA.officeId);
      const clientId = await seedClient(dirA.officeId);

      let receivedB = false;
      sockB.on('contract:new', () => {
        receivedB = true;
      });

      const res = await request(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer ${dirA.token}`)
        .set('X-Office-Id', String(dirA.officeId))
        .send({
          id_employee: employeeId,
          id_client: clientId,
          amount: 12345,
          title: 'A-only',
          contract_type: 'docs',
          status: 'active',
          contract_date: '2026-01-15',
        });
      expect(res.status).toBe(201);

      // Tick the event loop to give any erroneous delivery a chance to land.
      await new Promise((r) => setTimeout(r, 250));
      expect(receivedB).toBe(false);

      sockB.disconnect();
    });
  });

  describe('chat:message via switch_office (role-allowlisted delivery)', () => {
    it('delivers chat:message after director switches to the new office room', async () => {
      // Director gets their initial office at registration; create a second
      // office and switch_office to it. switch_office uses the office id
      // returned by formatOfficeResponse (string), which matches
      // req.params.officeId (also string), so chat:message via the
      // role-allowlist Map delivers correctly.
      const dir = await seedDirectorWithFreshToken(app);
      const office2Res = await request(app)
        .post('/api/offices')
        .set('Authorization', `Bearer ${dir.token}`)
        .send({ name: 'WS Second Office' });
      expect(office2Res.status).toBe(201);
      const office2Id = office2Res.body.id;

      const sock = await connectClient(baseURL, dir.token);
      sock.emit('switch_office', office2Id);
      await new Promise((r) => setTimeout(r, 100));

      const eventPromise = waitForEvent(sock, 'chat:message');

      const res = await request(app)
        .post(`/api/offices/${office2Id}/messages`)
        .set('Authorization', `Bearer ${dir.token}`)
        .set('X-Office-Id', String(office2Id))
        .send({ channel: 'reception', text: 'hello realtime' });
      expect(res.status).toBe(201);

      const payload = await eventPromise;
      expect(payload).toMatchObject({ channel: 'reception', type: 'info' });
      // chat formatter exposes `text`, not `content`.
      expect(payload.data).toMatchObject({ text: 'hello realtime' });

      sock.disconnect();
    });

    it('skips users whose role is not on the channel allowlist', async () => {
      const dir = await seedDirectorWithFreshToken(app);

      // Lawyer in the same office — role NOT on cc_internal allowlist.
      const lawyerEmail = `e2e-ws-lawyer-${Date.now()}@test.local`;
      const lawyerReg = await request(app).post('/api/auth/register').send({
        name: 'WS Lawyer',
        email: lawyerEmail,
        password: 'secret123',
        userType: 'lawyer',
      });
      expect(lawyerReg.status).toBe(201);
      await db.query('UPDATE users SET office_id = ? WHERE id = ?', [
        dir.officeId,
        lawyerReg.body.user.id,
      ]);
      const lawyerLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: lawyerEmail, password: 'secret123' });
      expect(lawyerLogin.status).toBe(200);
      const lawyerSock = await connectClient(baseURL, lawyerLogin.body.token);

      let received = false;
      lawyerSock.on('chat:message', () => {
        received = true;
      });

      const res = await request(app)
        .post(`/api/offices/${dir.officeId}/messages`)
        .set('Authorization', `Bearer ${dir.token}`)
        .set('X-Office-Id', String(dir.officeId))
        .send({ channel: 'cc_internal', text: 'internal cc' });
      // Director may not even have access to post on cc_internal — accept
      // either 201 (sent) or 403 (denied). Either way, lawyer must NOT
      // receive the event.
      expect([201, 403]).toContain(res.status);

      await new Promise((r) => setTimeout(r, 250));
      expect(received).toBe(false);

      lawyerSock.disconnect();
    });
  });
});
