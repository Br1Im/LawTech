#!/usr/bin/env node
/**
 * Light load smoke for LawTech backend.
 *
 * Boots an in-process Express app against the `lawtech_test` schema,
 * seeds a director + office, and hammers a few endpoints with autocannon.
 *
 * Targets are baseline smoke thresholds (not full perf benchmarks):
 *   - p95 latency < 500 ms
 *   - non-2xx ratio < 1 %
 *
 * Run:    node __tests__/load/run.js
 * CI:     `npm run test:load` (see package.json)
 *
 * The script exits non-zero if any scenario violates its thresholds, so it can
 * gate a CI job.
 */
const path = require('path');
const http = require('http');
const autocannon = require('autocannon');

require(path.join(__dirname, '..', 'setup', 'env'));

// Silence the very chatty per-request console.log from server middleware
// while load test runs. Drops only the known-noisy prefixes; everything else
// (script output, setup-db, autocannon) stays visible.
if (!process.env.LOAD_VERBOSE) {
  // eslint-disable-next-line no-console
  const _log = console.log;
  const NOISE = ['🔐', '🎫', '✅', '📋', 'DB pool', 'DB connection'];
  // eslint-disable-next-line no-console
  console.log = (...args) => {
    const first = typeof args[0] === 'string' ? args[0] : '';
    if (NOISE.some((p) => first.startsWith(p) || first.includes(p))) return;
    _log(...args);
  };
}

const app = require(path.join(__dirname, '..', 'setup', 'app')).app;
const db = require(path.join(__dirname, '..', '..', 'db'));
const { recreateTestDatabase, runMigrations, truncateAll, assertNotProtected } = require(
  path.join(__dirname, '..', 'setup', 'db')
);
const { registerDirectorWithOffice } = require(
  path.join(__dirname, '..', 'setup', 'factories')
);

const DURATION = Number(process.env.LOAD_DURATION || 5); // seconds per scenario
const CONNECTIONS = Number(process.env.LOAD_CONNECTIONS || 10);
const PIPELINING = Number(process.env.LOAD_PIPELINING || 1);

const P95_LATENCY_MS = Number(process.env.LOAD_P95_LATENCY || 500);
const ERR_RATIO = Number(process.env.LOAD_MAX_ERR_RATIO || 0.01);

async function withListenedServer(fn) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function runScenario({ name, url, requests, connections = CONNECTIONS, duration = DURATION }) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url,
        connections,
        pipelining: PIPELINING,
        duration,
        requests,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({ name, result });
      }
    );

    // Mute the live status to keep CI logs short.
    if (process.env.LOAD_PROGRESS) {
      autocannon.track(instance, { renderProgressBar: true, renderLatencyTable: false });
    }
  });
}

function summarize({ name, result }) {
  const p95 = result.latency?.p97_5 || result.latency?.p99 || result.latency?.p95 || 0;
  // autocannon v8 uses `latency.p99` etc; the property naming varies.
  const p95Real = result.latency?.p95 ?? p95;
  const errorRate =
    (result.non2xx + result.errors + result.timeouts) / Math.max(result.requests.total, 1);
  return {
    name,
    rps: Math.round(result.requests.average),
    duration: Math.round(result.duration),
    totalRequests: result.requests.total,
    p50: result.latency?.p50 ?? 0,
    p95: p95Real,
    p99: result.latency?.p99 ?? 0,
    non2xx: result.non2xx,
    errors: result.errors,
    timeouts: result.timeouts,
    errorRate,
  };
}

async function main() {
  // Hard-stop the script from ever touching prod data.
  assertNotProtected(process.env.DB_NAME || 'lawtech_test');

  console.log('[load] resetting test schema');
  await recreateTestDatabase();
  await runMigrations();
  await truncateAll();

  console.log('[load] seeding director + office');
  const dir = await registerDirectorWithOffice(app);
  // Plant a few clients so GET /api/clients returns a non-trivial payload.
  for (let i = 0; i < 25; i++) {
    await db.query(
      'INSERT INTO clients (name, office_id, phone) VALUES (?, ?, ?)',
      [`Load Client ${i}`, dir.officeId, `+7900000${String(i).padStart(4, '0')}`]
    );
  }

  const summaries = await withListenedServer(async (baseURL) => {
    const headers = {
      authorization: `Bearer ${dir.token}`,
      'x-office-id': String(dir.officeId),
      'content-type': 'application/json',
    };

    const out = [];

    // Scenario 1: health endpoint (no auth, no DB).
    out.push(
      summarize(
        await runScenario({
          name: 'GET /api/health',
          url: `${baseURL}/api/health`,
        })
      )
    );

    // Scenario 2: authenticated list of clients (auth middleware + DB read).
    out.push(
      summarize(
        await runScenario({
          name: 'GET /api/clients',
          url: `${baseURL}/api/clients`,
          requests: [{ method: 'GET', path: '/api/clients', headers }],
        })
      )
    );

    // Scenario 3: login (bcrypt verify — typically the slowest scenario).
    out.push(
      summarize(
        await runScenario({
          name: 'POST /api/auth/login',
          url: `${baseURL}/api/auth/login`,
          // Slightly lower concurrency to keep bcrypt fair.
          connections: Math.max(2, Math.floor(CONNECTIONS / 2)),
          requests: [
            {
              method: 'POST',
              path: '/api/auth/login',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ email: dir.email, password: dir.password }),
            },
          ],
        })
      )
    );

    return out;
  });

  console.log('\n[load] results');
  for (const s of summaries) {
    console.log(
      [
        s.name.padEnd(28),
        `rps=${String(s.rps).padStart(5)}`,
        `p50=${String(s.p50).padStart(4)}ms`,
        `p95=${String(s.p95).padStart(4)}ms`,
        `p99=${String(s.p99).padStart(4)}ms`,
        `non2xx=${s.non2xx}`,
        `errors=${s.errors}`,
        `timeouts=${s.timeouts}`,
        `errRatio=${(s.errorRate * 100).toFixed(2)}%`,
        `total=${s.totalRequests}`,
      ].join(' | ')
    );
  }

  // Bcrypt makes /auth/login intentionally slow; relax thresholds for it.
  let exitCode = 0;
  for (const s of summaries) {
    const isLogin = s.name.startsWith('POST /api/auth/login');
    // bcrypt rounds=10 → ~80-150ms per request on shared CPU; allow 1500ms p95.
    const limit = isLogin ? 1500 : P95_LATENCY_MS;
    const fails = [];
    if (s.p95 > limit) fails.push(`p95 ${s.p95}ms > ${limit}ms`);
    if (s.errorRate > ERR_RATIO) {
      fails.push(`errorRate ${(s.errorRate * 100).toFixed(2)}% > ${(ERR_RATIO * 100).toFixed(2)}%`);
    }
    if (fails.length) {
      console.error(`[load] FAIL ${s.name}: ${fails.join(', ')}`);
      exitCode = 1;
    } else {
      console.log(`[load] PASS ${s.name}`);
    }
  }

  await db.close?.();
  // Ensure mysql2 pool doesn't keep the event loop alive.
  try {
    await db.end?.();
  } catch (_) {
    /* noop */
  }
  process.exit(exitCode);
}

main().catch((err) => {
  console.error('[load] error', err);
  process.exit(1);
});
