import { test, expect, request, APIRequestContext } from '@playwright/test';

/**
 * E2E UI Modal flow — exercise the Antd <Modal> based create-flow that lives
 * in Applications.tsx. Clicks "Добавить", fills the 4 form inputs, clicks
 * "Создать", waits for the POST, then verifies the row appears in the table
 * and that the API round-trips (GET /api/applications returns it).
 *
 * This is the closest E2E we can get to "user clicks through the UI to write
 * to the DB" without resorting to brittle selectors on the heavy CRM dashboard.
 */
const API_BASE = 'http://localhost:3001/api';

async function seedDirectorWithOffice(apiCtx: APIRequestContext) {
  const stamp = Date.now();
  const email = `e2e-modal-${stamp}@test.local`;
  const password = 'TestPass123!';

  const reg = await apiCtx.post(`${API_BASE}/auth/register`, {
    data: { name: 'E2E Modal Director', email, password, userType: 'office' },
  });
  expect(reg.status()).toBe(201);
  const { token } = await reg.json();

  const office = await apiCtx.post(`${API_BASE}/offices`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: `Modal Office ${stamp}` },
  });
  expect(office.status()).toBe(201);
  const officeJson = await office.json();

  const login = await apiCtx.post(`${API_BASE}/auth/login`, {
    data: { email, password },
  });
  expect(login.status()).toBe(200);
  const { token: freshToken, user } = await login.json();

  return { token: freshToken, user, email, password, officeId: officeJson.id };
}

test.describe('UI modal flow', () => {
  test('Antd create modal: click → fill → submit → DB row → table refresh', async ({ page }) => {
    const apiCtx = await request.newContext();
    const seed = await seedDirectorWithOffice(apiCtx);

    // Inject auth.
    await page.goto('/auth');
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      },
      { token: seed.token, user: seed.user }
    );

    // Go to CRM with the Applications tab forced via URL.
    await page.goto('/crm?tab=Заявления');
    // Wait for the toolbar "Добавить" button to be visible — that's the
    // signal the Applications panel mounted.
    const addBtn = page.getByRole('button', { name: /Добавить/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 15_000 });

    // Open modal.
    await addBtn.click();
    const modal = page.locator('.ant-modal-content').filter({ hasText: /Новое заявление/i });
    await expect(modal).toBeVisible();

    // Inputs are unlabeled <Input>'s — target by position inside the modal.
    const clientName = `UI Client ${Date.now()}`;
    const inputs = modal.locator('input.ant-input');
    await inputs.nth(0).fill(clientName);
    await inputs.nth(1).fill('Тестовая тема');
    await inputs.nth(2).fill('Иванов И.И.');
    await modal.locator('textarea').fill('UI E2E test — modal flow');

    // Submit and wait for the POST.
    const [createResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/applications') && r.request().method() === 'POST',
        { timeout: 15_000 }
      ),
      modal.getByRole('button', { name: /Создать/i }).click(),
    ]);
    expect(createResp.status()).toBe(200);

    // Modal closes.
    await expect(modal).toBeHidden({ timeout: 5_000 });

    // Row shows up in the table (table re-fetches via load()).
    await expect(page.locator('.ant-table-tbody').getByText(clientName)).toBeVisible({
      timeout: 10_000,
    });

    // DB round-trip via authenticated API.
    const list = await apiCtx.get(`${API_BASE}/applications`, {
      headers: {
        Authorization: `Bearer ${seed.token}`,
        'X-Office-Id': String(seed.officeId),
      },
    });
    expect(list.status()).toBe(200);
    const body = await list.json();
    const found = (body.data || []).find(
      (a: { client_name: string }) => a.client_name === clientName
    );
    expect(found).toBeTruthy();
    expect(found.topic).toBe('Тестовая тема');
    expect(found.lawyer_name).toBe('Иванов И.И.');
    expect(found.status).toBe('new');
  });

  test('Antd create modal can be cancelled without touching the DB', async ({ page }) => {
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

    await page.goto('/crm?tab=Заявления');
    const addBtn = page.getByRole('button', { name: /Добавить/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 15_000 });

    // Snapshot list length BEFORE.
    const before = await apiCtx.get(`${API_BASE}/applications`, {
      headers: {
        Authorization: `Bearer ${seed.token}`,
        'X-Office-Id': String(seed.officeId),
      },
    });
    const beforeCount = ((await before.json()).data || []).length;

    // Open + immediately cancel — no fields filled.
    await addBtn.click();
    const modal = page.locator('.ant-modal-content').filter({ hasText: /Новое заявление/i });
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: /Отмена/i }).click();
    await expect(modal).toBeHidden({ timeout: 5_000 });

    // List length unchanged.
    const after = await apiCtx.get(`${API_BASE}/applications`, {
      headers: {
        Authorization: `Bearer ${seed.token}`,
        'X-Office-Id': String(seed.officeId),
      },
    });
    const afterCount = ((await after.json()).data || []).length;
    expect(afterCount).toBe(beforeCount);
  });
});
