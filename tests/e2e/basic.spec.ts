import { test, expect } from '@playwright/test';

test('basic page load', async ({ page }) => {
  await page.goto('/');
  
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/QR Code Geocaching Tracker/);
  
  // Expect the main heading to be visible.
  await expect(page.locator('h1')).toContainText('QR Code Geocaching Tracker');
});
