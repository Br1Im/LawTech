import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_DIR = path.resolve(__dirname, '..', 'server');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  globalSetup: './e2e/global-setup.ts',
  webServer: [
    {
      command: 'node server.js',
      cwd: SERVER_DIR,
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        NODE_ENV: 'e2e',
        PORT: '3001',
        DB_HOST: process.env.DB_HOST || '127.0.0.1',
        DB_PORT: process.env.DB_PORT || '33307',
        DB_USER: process.env.DB_USER || 'root',
        DB_PASSWORD: process.env.DB_PASSWORD || 'testpass',
        DB_NAME: process.env.DB_NAME || 'lawtech_test',
        JWT_SECRET: process.env.JWT_SECRET || 'e2e-secret',
      },
    },
    {
      // build once, then preview-serve the static bundle: deterministic and
      // far faster than Vite's on-demand dev compilation for E2E.
      command: 'npm run build && npx vite preview --host localhost --port 5173 --strictPort',
      cwd: __dirname,
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        VITE_API_URL: 'http://localhost:3001/api',
      },
    },
  ],
});
