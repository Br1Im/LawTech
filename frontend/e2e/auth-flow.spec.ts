import { test, expect, request } from '@playwright/test';

/**
 * E2E auth flow:
 *  - Seed a user via the API (deterministic credentials).
 *  - Open /auth and login through the UI.
 *  - Verify token landed in localStorage.
 */
test.describe('Auth flow', () => {
  const stamp = Date.now();
  const email = `e2e-${stamp}@test.local`;
  const password = 'TestPass123!';
  const name = 'E2E User';

  test('registers a user via the API and then logs in via UI', async ({ page }) => {
    const apiCtx = await request.newContext();
    const reg = await apiCtx.post('http://localhost:3001/api/auth/register', {
      data: { name, email, password, userType: 'lawyer' },
    });
    expect(reg.status()).toBe(201);

    await page.goto('/auth');
    await page.getByPlaceholder('Ваш логин').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);

    // Click submit and wait for the POST to /auth/login to resolve.
    const [loginResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/auth/login') && r.request().method() === 'POST',
        { timeout: 15_000 }
      ),
      page.getByRole('button', { name: /Войти/i }).click(),
    ]);
    expect(loginResp.status()).toBe(200);

    // Token landed in localStorage.
    await expect.poll(
      async () => await page.evaluate(() => localStorage.getItem('token')),
      { timeout: 10_000 }
    ).toBeTruthy();
  });

  test('shows an error for invalid credentials', async ({ page }) => {
    await page.goto('/auth');
    await page.evaluate(() => localStorage.removeItem('token'));

    await page.getByPlaceholder('Ваш логин').fill('nobody@nowhere.local');
    await page.getByPlaceholder('••••••••').fill('wrong-password');

    const [loginResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/auth/login') && r.request().method() === 'POST',
        { timeout: 15_000 }
      ),
      page.getByRole('button', { name: /Войти/i }).click(),
    ]);
    expect(loginResp.status()).toBe(401);

    // Wait briefly for any toast/re-render, then verify no token landed.
    await page.waitForTimeout(500);
    const token = await page.evaluate(() => localStorage.getItem('token')).catch(() => null);
    expect(token).toBeFalsy();
  });
});
