/**
 * Sets default env vars for tests. Real values can override via shell.
 */
process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '33307';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'testpass';
process.env.DB_NAME = process.env.DB_NAME || 'lawtech_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.PORT = process.env.PORT || '0';
