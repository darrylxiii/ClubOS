import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests for Critical Pages
 * These tests capture screenshots of key pages for visual comparison
 */

test.describe('Visual Regression - Critical Pages', () => {
  test.describe('Authentication Pages', () => {
    test('login page visual consistency', async ({ page }) => {
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      
      // Wait for animations to complete
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('auth-login-page.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });

    test('login page mobile view', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('auth-login-mobile.png', {
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('Public Pages', () => {
    test('landing page hero section', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Wait for animations
      
      // Capture above-the-fold content
      await expect(page.locator('main').first()).toHaveScreenshot('landing-hero.png', {
        maxDiffPixels: 150,
      });
    });

    test('jobs listing page', async ({ page }) => {
      await page.goto('/jobs');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('jobs-listing.png', {
        maxDiffPixels: 200,
        fullPage: false,
      });
    });
  });

  test.describe('Component Visual Tests', () => {
    test('button variants', async ({ page }) => {
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      
      // Find and screenshot buttons
      const primaryButton = page.locator('button[type="submit"]').first();
      if (await primaryButton.isVisible()) {
        await expect(primaryButton).toHaveScreenshot('button-primary.png');
      }
    });

    test('form inputs', async ({ page }) => {
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible()) {
        await expect(emailInput).toHaveScreenshot('input-email.png');
      }
    });

    test('card components', async ({ page }) => {
      await page.goto('/jobs');
      await page.waitForLoadState('networkidle');
      
      const jobCard = page.locator('[data-testid="job-card"]').first();
      if (await jobCard.isVisible()) {
        await expect(jobCard).toHaveScreenshot('job-card.png', {
          maxDiffPixels: 50,
        });
      }
    });
  });

  test.describe('Dark Mode Consistency', () => {
    test('auth page in dark mode', async ({ page }) => {
      await page.goto('/auth');
      
      // Force dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('auth-dark-mode.png', {
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('Loading States', () => {
    test('skeleton loading state', async ({ page }) => {
      await page.goto('/jobs');
      
      // Capture initial loading state before data loads
      const skeleton = page.locator('[data-testid="loading-skeleton"]').first();
      if (await skeleton.isVisible()) {
        await expect(skeleton).toHaveScreenshot('skeleton-loader.png');
      }
    });
  });

  test.describe('Error States', () => {
    test('404 page visual', async ({ page }) => {
      await page.goto('/non-existent-page-12345');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('404-page.png', {
        maxDiffPixels: 100,
      });
    });
  });
});
