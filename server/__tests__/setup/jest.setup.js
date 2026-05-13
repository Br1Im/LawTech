/**
 * Per-test setup. Truncates all tables before each test so tests start clean.
 */
const { truncateAll } = require('./db');

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  // Close the shared pool created by server/db.js so Jest can exit cleanly.
  try {
    const db = require('../../db');
    await db.close();
  } catch {
    /* noop */
  }
});
