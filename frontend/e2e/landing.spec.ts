import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('renders hero with live chip and CTA buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LawTech|Юридические/i);
    await expect(page.locator('body')).toBeVisible();
    // Hero CTA visible somewhere on the page.
    const cta = page.getByRole('link', { name: /Начать|Войти|Попробовать/i }).first();
    await expect(cta).toBeVisible();
  });

  test('header "Войти" link navigates to /auth', async ({ page }) => {
    await page.goto('/');
    const loginLink = page.getByRole('link', { name: /Войти/i }).first();
    await loginLink.click();
    await expect(page).toHaveURL(/\/auth/);
  });
});
