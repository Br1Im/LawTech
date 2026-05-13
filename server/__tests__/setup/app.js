/**
 * Returns the Express app for Supertest. We require server.js after
 * NODE_ENV=test is set (jest.config.js does that) so server.listen() is
 * skipped.
 */
process.env.NODE_ENV = 'test';

const app = require('../../server');

module.exports = { app };
