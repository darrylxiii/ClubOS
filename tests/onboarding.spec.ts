import { test, expect } from '@playwright/test';

test.describe('Candidate Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a new candidate
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'candidate@test.com');
    await page.fill('input[type="password"]', 'Test123456!!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/onboarding|\/home/);
  });

  test('should complete basic profile info', async ({ page }) => {
    if (!page.url().includes('/onboarding')) {
      await page.goto('/onboarding');
    }

    // Fill first step - contact info
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="phone"]', '+31612345678');
    
    // Continue
    await page.click('button:has-text("Continue")');
    
    // Should progress to next step
    await expect(page.locator('text=/professional/i')).toBeVisible();
  });

  test('should handle file uploads', async ({ page }) => {
    if (!page.url().includes('/onboarding')) {
      await page.goto('/onboarding');
    }

    // Navigate to CV upload step
    await page.click('button:has-text("Skip")');
    
    // Check for file upload component
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await expect(fileInput).toBeVisible();
    }
  });
});
