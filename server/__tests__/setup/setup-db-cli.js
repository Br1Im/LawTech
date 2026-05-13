#!/usr/bin/env node
/**
 * Standalone CLI for preparing the E2E test database (no Jest needed).
 *
 * Usage:
 *   DB_HOST=127.0.0.1 DB_PORT=33307 DB_USER=root DB_PASSWORD=testpass \
 *     DB_NAME=lawtech_test node __tests__/setup/setup-db-cli.js
 *
 * Drops + recreates the target database, then applies the schema snapshot.
 * Refuses to run against any production-looking schema name.
 */
require('./env');
const { recreateTestDatabase, runMigrations } = require('./db');

(async () => {
  try {
    console.log(`[setup-db] target: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
    await recreateTestDatabase();
    await runMigrations();
    console.log('[setup-db] schema applied');
    process.exit(0);
  } catch (err) {
    console.error('[setup-db] failed:', err);
    process.exit(1);
  }
})();
