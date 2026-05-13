/**
 * Jest globalSetup — creates the test database and runs all migrations once
 * per test run. Per-test isolation is handled by truncateAll() in
 * jest.setup.js.
 */
const { recreateTestDatabase, runMigrations, assertNotProtected, readDbEnv } = require('./db');

module.exports = async () => {
  const cfg = readDbEnv();
  assertNotProtected(cfg.database);
  // eslint-disable-next-line no-console
  console.log(`[test setup] recreating ${cfg.database} @ ${cfg.host}:${cfg.port}`);
  await recreateTestDatabase();
  await runMigrations();
};
