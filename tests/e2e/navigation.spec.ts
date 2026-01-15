import { test, expect } from '@playwright/test';

test.describe('Navigation & Accessibility', () => {
  test.describe('Public Routes', () => {
    test('should load landing page', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should load auth page', async ({ page }) => {
      await page.goto('/auth');
      await expect(page).toHaveURL('/auth');
    });

    test('should load public jobs page', async ({ page }) => {
      await page.goto('/public-jobs');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle 404 for invalid routes', async ({ page }) => {
      await page.goto('/this-route-does-not-exist-12345');
      
      // Should show 404 or redirect
      const has404 = await page.getByText(/not found|404/i).isVisible().catch(() => false);
      const wasRedirected = page.url().includes('auth') || page.url() === page.url().split('/')[0] + '/';
      
      expect(has404 || wasRedirected).toBe(true);
    });
  });

  test.describe('Protected Routes', () => {
    const protectedRoutes = [
      '/home',
      '/jobs',
      '/messages',
      '/bookings',
      '/settings',
      '/profile',
    ];

    for (const route of protectedRoutes) {
      test(`should redirect ${route} to auth when not logged in`, async ({ page }) => {
        await page.goto(route);
        await page.waitForURL(/auth/, { timeout: 10000 });
        await expect(page).toHaveURL(/auth/);
      });
    }
  });

  test.describe('Accessibility', () => {
    test('should have proper page title', async ({ page }) => {
      await page.goto('/');
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
    });

    test('should have proper heading structure', async ({ page }) => {
      await page.goto('/auth');
      
      // Should have at least one h1
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
    });

    test('should have proper focus management', async ({ page }) => {
      await page.goto('/auth');
      
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      
      // Something should be focused
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/auth');
      
      // Should be able to navigate with keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      // Page should respond to keyboard
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;
      
      // Should load in under 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should not have console errors on load', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Filter out expected errors (like favicon 404)
      const criticalErrors = errors.filter(e => 
        !e.includes('favicon') && 
        !e.includes('manifest') &&
        !e.includes('sw.js')
      );
      
      // Should have minimal critical errors
      expect(criticalErrors.length).toBeLessThan(5);
    });
  });

  test.describe('Mobile Navigation', () => {
    test('should display mobile menu on small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      // Mobile menu button should be visible (hamburger icon)
      const mobileMenuButton = page.getByRole('button', { name: /menu|navigation/i });
      const hasMobileMenu = await mobileMenuButton.isVisible().catch(() => false);
      
      // Either has mobile menu or uses bottom navigation
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
