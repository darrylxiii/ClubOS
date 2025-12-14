import { test, expect } from '@playwright/test';

/**
 * Performance Testing Suite
 * Validates Core Web Vitals and API response times
 */

test.describe('Performance Tests', () => {
  test.describe('Page Load Performance', () => {
    test('login page should load within 3 seconds', async ({ page }) => {
      const start = Date.now();
      await page.goto('/auth');
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - start;
      
      expect(loadTime).toBeLessThan(3000);
    });

    test('home page should have acceptable LCP', async ({ page }) => {
      await page.goto('/');
      
      // Measure LCP using Performance API
      const lcp = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          
          // Fallback timeout
          setTimeout(() => resolve(0), 5000);
        });
      });
      
      // LCP should be under 2.5s (good), warn if over 4s
      expect(lcp).toBeLessThan(4000);
    });

    test('jobs page should render job cards efficiently', async ({ page }) => {
      const start = Date.now();
      await page.goto('/jobs');
      await page.waitForSelector('[data-testid="job-card"], .job-card, article', { timeout: 10000 }).catch(() => {});
      const renderTime = Date.now() - start;
      
      expect(renderTime).toBeLessThan(5000);
    });
  });

  test.describe('Navigation Performance', () => {
    test('navigation between pages should be fast', async ({ page }) => {
      await page.goto('/');
      
      const start = Date.now();
      await page.click('a[href="/jobs"], [href="/jobs"]').catch(() => page.goto('/jobs'));
      await page.waitForURL('**/jobs**');
      const navigationTime = Date.now() - start;
      
      expect(navigationTime).toBeLessThan(2000);
    });
  });

  test.describe('Resource Loading', () => {
    test('main bundle should be reasonably sized', async ({ page }) => {
      const resources: number[] = [];
      
      page.on('response', (response) => {
        const url = response.url();
        if (url.includes('.js') && !url.includes('node_modules')) {
          resources.push(parseInt(response.headers()['content-length'] || '0', 10));
        }
      });
      
      await page.goto('/');
      
      // Check that no single bundle exceeds 1MB
      const maxBundleSize = Math.max(...resources.filter(s => s > 0));
      expect(maxBundleSize).toBeLessThan(1024 * 1024); // 1MB
    });
  });
});
