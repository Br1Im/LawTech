/**
 * Playwright global setup — recreate the test database before any test runs.
 *
 * Re-uses the server's own setup-db-cli so the schema applied here is identical
 * to the one used by Jest backend tests.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_DIR = path.resolve(__dirname, '..', '..', 'server');

export default async function globalSetup() {
  const cliPath = path.join('__tests__', 'setup', 'setup-db-cli.js');
  // eslint-disable-next-line no-console
  console.log(`[e2e:setup] running node ${cliPath} in ${SERVER_DIR}`);
  execSync(`node ${cliPath}`, {
    cwd: SERVER_DIR,
    stdio: 'inherit',
    env: {
      ...process.env,
      DB_HOST: process.env.DB_HOST || '127.0.0.1',
      DB_PORT: process.env.DB_PORT || '33307',
      DB_USER: process.env.DB_USER || 'root',
      DB_PASSWORD: process.env.DB_PASSWORD || 'testpass',
      DB_NAME: process.env.DB_NAME || 'lawtech_test',
    },
  });
}
