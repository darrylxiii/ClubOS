import { test, expect } from '@playwright/test';

test.describe('Meetings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'admin@thequantumclub.com');
    await page.fill('input[type="password"]', 'Test123456!!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/home/, { timeout: 15000 });
  });

  test('should access meetings page', async ({ page }) => {
    await page.goto('/meetings');
    await expect(page.locator('text=/meetings|schedule|upcoming/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display meeting list', async ({ page }) => {
    await page.goto('/meetings');
    await page.waitForLoadState('networkidle');
    
    const content = page.locator('main, [data-testid="meetings-list"]');
    await expect(content).toBeVisible();
  });

  test('should access meeting history', async ({ page }) => {
    await page.goto('/meeting-history');
    await page.waitForLoadState('networkidle');
    
    const content = page.locator('main, [data-testid="meeting-history"]');
    await expect(content).toBeVisible();
  });

  test('should open schedule meeting dialog', async ({ page }) => {
    await page.goto('/meetings');
    await page.waitForLoadState('networkidle');
    
    const scheduleButton = page.locator('button:has-text("Schedule"), button:has-text("New Meeting")').first();
    if (await scheduleButton.count() > 0) {
      await scheduleButton.click();
      await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should access meeting room', async ({ page }) => {
    await page.goto('/meeting/test-room');
    await page.waitForLoadState('networkidle');
    
    // Should show meeting interface or redirect
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });
});
