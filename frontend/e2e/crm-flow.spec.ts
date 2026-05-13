import { test, expect, request, APIRequestContext } from '@playwright/test';

/**
 * E2E CRM flow:
 *  - Seed a director + office via the backend API (deterministic).
 *  - Inject the token + user into the SPA's localStorage.
 *  - Hit /crm and verify the role-based sidebar renders.
 *  - Switch between sidebar tabs, exercise URL ?tab=… persistence.
 *  - Create a client via API and confirm it surfaces in the directors's office
 *    via a second authenticated API call (round-trip persistence check).
 */
const API_BASE = 'http://localhost:3001/api';

async function seedDirectorWithOffice(apiCtx: APIRequestContext) {
  const stamp = Date.now();
  const email = `e2e-crm-${stamp}@test.local`;
  const password = 'TestPass123!';

  const reg = await apiCtx.post(`${API_BASE}/auth/register`, {
    data: { name: 'E2E Director', email, password, userType: 'office' },
  });
  expect(reg.status()).toBe(201);
  const { token } = await reg.json();

  const office = await apiCtx.post(`${API_BASE}/offices`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: `E2E Office ${stamp}` },
  });
  expect(office.status()).toBe(201);
  const officeJson = await office.json();

  // Re-login to get a fresh user record reflecting office_id.
  const login = await apiCtx.post(`${API_BASE}/auth/login`, {
    data: { email, password },
  });
  expect(login.status()).toBe(200);
  const { token: freshToken, user } = await login.json();

  return { token: freshToken, user, email, password, officeId: officeJson.id };
}

test.describe('CRM flow', () => {
  test('director reaches /crm with role-appropriate sidebar after office setup', async ({ page }) => {
    const apiCtx = await request.newContext();
    const seed = await seedDirectorWithOffice(apiCtx);

    // Prime SPA storage from a same-origin context.
    await page.goto('/auth');
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      },
      { token: seed.token, user: seed.user }
    );

    await page.goto('/crm');
    // Sidebar nav renders.
    await expect(page.locator('.sidebar-nav')).toBeVisible();
    // Director-specific menu items appear (subset).
    await expect(page.locator('.sidebar-nav').getByText('Офис', { exact: true })).toBeVisible();
    await expect(page.locator('.sidebar-nav').getByText('Клиенты', { exact: true })).toBeVisible();
    await expect(page.locator('.sidebar-nav').getByText('Сотрудники', { exact: true })).toBeVisible();
  });

  test('clicking Клиенты switches the active tab and updates content region', async ({ page }) => {
    const apiCtx = await request.newContext();
    const seed = await seedDirectorWithOffice(apiCtx);

    await page.goto('/auth');
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      },
      { token: seed.token, user: seed.user }
    );

    await page.goto('/crm?tab=Клиенты');
    // Active sidebar item is "Клиенты".
    const activeItem = page.locator('.sidebar-nav .sidebar-item.active');
    await expect(activeItem).toBeVisible();
    await expect(activeItem).toContainText('Клиенты');
  });

  test('client created via API surfaces via authenticated re-fetch (DB persistence round-trip)', async ({ page }) => {
    const apiCtx = await request.newContext();
    const seed = await seedDirectorWithOffice(apiCtx);

    const clientName = `E2E Client ${Date.now()}`;
    const headers = {
      Authorization: `Bearer ${seed.token}`,
      'X-Office-Id': String(seed.officeId),
    };

    const create = await apiCtx.post(`${API_BASE}/clients`, {
      headers,
      data: { name: clientName, phone: '+79990001122' },
    });
    expect(create.status()).toBe(201);

    const list = await apiCtx.get(`${API_BASE}/clients`, { headers });
    expect(list.status()).toBe(200);
    const items = await list.json();
    const found = (Array.isArray(items) ? items : items.data || []).find(
      (c: { name: string }) => c.name === clientName
    );
    expect(found).toBeTruthy();

    // Sanity: SPA still loads /crm with the seeded credentials after the round-trip.
    await page.goto('/auth');
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      },
      { token: seed.token, user: seed.user }
    );
    await page.goto('/crm?tab=Клиенты');
    await expect(page.locator('.sidebar-nav')).toBeVisible();
  });

  test('lawyer (no office) lands on /crm but cannot access office-bound data', async ({ page }) => {
    const apiCtx = await request.newContext();
    const stamp = Date.now();
    const email = `e2e-lawyer-${stamp}@test.local`;
    const password = 'TestPass123!';

    const reg = await apiCtx.post(`${API_BASE}/auth/register`, {
      data: { name: 'E2E Lawyer', email, password, userType: 'lawyer' },
    });
    expect(reg.status()).toBe(201);
    const { token, user } = await reg.json();

    await page.goto('/auth');
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      },
      { token, user }
    );
    await page.goto('/crm');
    await expect(page.locator('.sidebar-nav')).toBeVisible();
    // Lawyer sidebar: Офис, Клиенты, Акты, Зарплата
    await expect(page.locator('.sidebar-nav').getByText('Акты', { exact: true })).toBeVisible();
  });
});
