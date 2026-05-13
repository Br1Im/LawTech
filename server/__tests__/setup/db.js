/**
 * Test DB helpers. Manage isolated test schema and migrations.
 *
 * Connection details come from env vars (set by `npm run test`):
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 * DB_NAME MUST be different from production (`lawtech_crm`). The helper refuses
 * to operate on `lawtech_crm` to prevent data loss.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const PROTECTED_DATABASES = new Set(['lawtech_crm', 'lawtech', 'mysql', 'information_schema']);

function readDbEnv() {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 33307),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'testpass',
    database: process.env.DB_NAME || 'lawtech_test',
  };
}

function assertNotProtected(name) {
  if (PROTECTED_DATABASES.has(name)) {
    throw new Error(
      `Refusing to operate on protected database "${name}". Use DB_NAME=lawtech_test (or another non-production name).`
    );
  }
}

async function rawConnect(withoutDatabase = false) {
  const cfg = readDbEnv();
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    ...(withoutDatabase ? {} : { database: cfg.database }),
    multipleStatements: true,
  });
  return conn;
}

async function recreateTestDatabase() {
  const cfg = readDbEnv();
  assertNotProtected(cfg.database);
  const conn = await rawConnect(true);
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${cfg.database}\``);
    await conn.query(
      `CREATE DATABASE \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await conn.end();
  }
}

function loadSchema() {
  // Test schema is generated from production:
  //   docker exec lawtech-db mysqldump --no-data --routines --triggers \
  //     --skip-comments --no-tablespaces --set-gtid-purged=OFF lawtech_crm
  // Saved under server/__tests__/fixtures/schema.sql so tests don't depend on
  // the (sometimes MariaDB-flavoured) raw migration files.
  const schemaPath = path.join(__dirname, '..', 'fixtures', 'schema.sql');
  return fs.readFileSync(schemaPath, 'utf8');
}

function splitStatements(sql) {
  // Strip `-- ...` line comments before splitting; otherwise leading comments
  // make a CREATE TABLE statement look like it starts with `--` and get
  // filtered out.
  const stripped = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  return stripped
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function runMigrations() {
  const cfg = readDbEnv();
  assertNotProtected(cfg.database);
  const conn = await rawConnect();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const stmt of splitStatements(loadSchema())) {
      try {
        await conn.query(stmt);
      } catch (err) {
        if (!/already exists|Duplicate/i.test(err.message)) {
          // eslint-disable-next-line no-console
          console.error(`[schema] ${err.message}\n  in: ${stmt.slice(0, 200)}`);
        }
      }
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    await conn.end();
  }
}

async function truncateAll() {
  const cfg = readDbEnv();
  assertNotProtected(cfg.database);
  const conn = await rawConnect();
  try {
    const [tables] = await conn.query(
      'SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema = ?',
      [cfg.database]
    );
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const { name } of tables) {
      await conn.query(`TRUNCATE TABLE \`${name}\``);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    await conn.end();
  }
}

module.exports = {
  readDbEnv,
  recreateTestDatabase,
  runMigrations,
  truncateAll,
  assertNotProtected,
};
