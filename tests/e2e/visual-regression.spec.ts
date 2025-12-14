import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.describe('Landing Page', () => {
    test('landing page matches snapshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Wait for any animations to complete
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('landing-page.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });
  });

  test.describe('Auth Page', () => {
    test('auth page matches snapshot', async ({ page }) => {
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('auth-page.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });
  });

  test.describe('Public Jobs Page', () => {
    test('public jobs page matches snapshot', async ({ page }) => {
      await page.goto('/public-jobs');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('public-jobs-page.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });
  });

  test.describe('Dark Mode', () => {
    test('auth page dark mode matches snapshot', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('auth-page-dark.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });
  });

  test.describe('Mobile Viewport', () => {
    test('auth page mobile matches snapshot', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('auth-page-mobile.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });

    test('landing page mobile matches snapshot', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('landing-page-mobile.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });
  });

  test.describe('Tablet Viewport', () => {
    test('auth page tablet matches snapshot', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('auth-page-tablet.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });
  });
});
