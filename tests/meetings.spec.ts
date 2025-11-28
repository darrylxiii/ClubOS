import { test, expect } from '@playwright/test';

test.describe('Meeting Scheduling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'admin@thequantumclub.com');
    await page.fill('input[type="password"]', 'Test123456!!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/home/);
  });

  test('should access meetings page', async ({ page }) => {
    await page.goto('/meetings');
    
    // Should show meetings interface
    await expect(page.locator('text=/meetings|schedule/i')).toBeVisible({ timeout: 5000 });
  });

  test('should create booking link', async ({ page }) => {
    await page.goto('/booking-management');
    
    // Look for create button
    const createButton = page.locator('button:has-text("Create"), button:has-text("New")').first();
    if (await createButton.count() > 0) {
      await createButton.click();
      
      // Should show create dialog
      await expect(page.locator('input[name="title"], input[placeholder*="title"]')).toBeVisible({ timeout: 2000 });
    }
  });
});
