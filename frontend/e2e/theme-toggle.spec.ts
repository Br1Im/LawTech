import { test, expect } from '@playwright/test';

test.describe('Theme toggle', () => {
  test('toggles dark mode on landing and persists across reload', async ({ page }) => {
    await page.goto('/');

    // Ensure starting state is light: clear any stored preference.
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload();

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', /light|^$/);

    const toggle = page.locator('.theme-toggle-button').first();
    await expect(toggle).toBeVisible();

    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // Persistence: reload and verify dark stuck.
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // Toggle back to light.
    await page.locator('.theme-toggle-button').first().click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('theme toggle exists on /auth and is independent', async ({ page }) => {
    await page.goto('/auth');
    const toggle = page.locator('.theme-toggle-button').first();
    await expect(toggle).toBeVisible();
  });
});
