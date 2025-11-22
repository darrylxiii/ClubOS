import { test, expect } from '@playwright/test';

test.describe('Social Feed', () => {
  test.beforeEach(async ({ page }) => {
    // Note: In real tests, you'd need to handle authentication
    await page.goto('/social-feed');
  });

  test('should display social feed page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Social Feed');
  });

  test('should show post creation form', async ({ page }) => {
    await expect(page.locator('textarea[placeholder*="What\'s on your mind"]')).toBeVisible();
    await expect(page.locator('button:has-text("Post")')).toBeVisible();
  });

  test('should have filter tabs', async ({ page }) => {
    await expect(page.locator('text=All Posts')).toBeVisible();
    await expect(page.locator('text=Club')).toBeVisible();
    await expect(page.locator('text=Instagram')).toBeVisible();
    await expect(page.locator('text=Twitter')).toBeVisible();
    await expect(page.locator('text=TikTok')).toBeVisible();
    await expect(page.locator('text=YouTube')).toBeVisible();
    await expect(page.locator('text=LinkedIn')).toBeVisible();
  });

  test('should allow filtering posts', async ({ page }) => {
    await page.click('text=Instagram');
    // Wait for content to load
    await page.waitForTimeout(500);
    
    await page.click('text=All Posts');
    await page.waitForTimeout(500);
  });
});
