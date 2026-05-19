import { test, expect } from '@playwright/test';

test.describe('Home page — mobile NFR', () => {
  test('has a correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/QR Code Geocaching Tracker/);
  });

  test('h1 is visible and legible on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('QR Code Geocaching Tracker');
  });

  test('page loads within 3 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  test('scan error page renders the error heading', async ({ page }) => {
    await page.goto('/scan');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('buttons and links meet minimum touch-target size', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const links = page.locator('a');
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      if (box) {
        expect(box.height, `link ${i} height`).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
