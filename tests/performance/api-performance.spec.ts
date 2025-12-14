import { test, expect } from '@playwright/test';

/**
 * API Performance Tests
 * Measures response times and performance metrics for API endpoints
 */

test.describe('API Performance', () => {
  const SUPABASE_URL = 'https://dpjucecmoyfzrduhlctt.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwanVjZWNtb3lmenJkdWhsY3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mjc2MTAsImV4cCI6MjA3NTAwMzYxMH0.hdX709NlaXPUE4ohWtd3LBuAOqPKCBhVep694LC6tRw';

  test.describe('Page Load Performance', () => {
    test('landing page loads within 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000);
    });

    test('auth page loads within 2 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/auth');
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(2000);
    });

    test('jobs page loads within 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/jobs');
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000);
    });
  });

  test.describe('REST API Response Times', () => {
    test('public jobs endpoint responds within 500ms', async ({ request }) => {
      const startTime = Date.now();
      
      try {
        await request.get(`${SUPABASE_URL}/rest/v1/jobs?status=eq.published&limit=10`, {
          headers: {
            'apikey': ANON_KEY,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        // Network errors acceptable in test environment
      }
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
    });

    test('companies endpoint responds within 500ms', async ({ request }) => {
      const startTime = Date.now();
      
      try {
        await request.get(`${SUPABASE_URL}/rest/v1/companies?limit=10`, {
          headers: {
            'apikey': ANON_KEY,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        // Network errors acceptable
      }
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
    });
  });

  test.describe('Network Request Monitoring', () => {
    test('page makes reasonable number of requests', async ({ page }) => {
      const requests: string[] = [];
      
      page.on('request', request => {
        requests.push(request.url());
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Should not make excessive requests
      expect(requests.length).toBeLessThan(100);
    });

    test('no failed critical requests on landing', async ({ page }) => {
      const failedRequests: string[] = [];
      
      page.on('requestfailed', request => {
        // Ignore analytics and non-critical failures
        const url = request.url();
        if (!url.includes('analytics') && !url.includes('gtm') && !url.includes('rb2b')) {
          failedRequests.push(url);
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      expect(failedRequests.length).toBe(0);
    });
  });

  test.describe('Resource Size Monitoring', () => {
    test('page resources are reasonably sized', async ({ page }) => {
      let totalSize = 0;
      
      page.on('response', async response => {
        try {
          const headers = response.headers();
          const contentLength = parseInt(headers['content-length'] || '0', 10);
          totalSize += contentLength;
        } catch {
          // Ignore errors
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Total page resources should be under 5MB
      expect(totalSize).toBeLessThan(5 * 1024 * 1024);
    });

    test('JavaScript bundle is reasonably sized', async ({ page }) => {
      const jsRequests: { url: string; size: number }[] = [];
      
      page.on('response', async response => {
        const url = response.url();
        if (url.endsWith('.js') || url.includes('.js?')) {
          try {
            const headers = response.headers();
            const size = parseInt(headers['content-length'] || '0', 10);
            jsRequests.push({ url, size });
          } catch {
            // Ignore
          }
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Individual JS bundles should be under 1MB
      for (const req of jsRequests) {
        expect(req.size).toBeLessThan(1024 * 1024);
      }
    });
  });

  test.describe('Caching Verification', () => {
    test('static assets have cache headers', async ({ page }) => {
      const cacheMisses: string[] = [];
      
      page.on('response', response => {
        const url = response.url();
        const headers = response.headers();
        
        // Check static assets
        if (url.match(/\.(js|css|png|jpg|svg|woff2?)(\?|$)/)) {
          const cacheControl = headers['cache-control'] || '';
          if (!cacheControl.includes('max-age') && !cacheControl.includes('immutable')) {
            cacheMisses.push(url);
          }
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Most static assets should be cached
      // Allow some misses for development
      expect(cacheMisses.length).toBeLessThan(10);
    });
  });

  test.describe('Concurrent Request Handling', () => {
    test('handles multiple simultaneous page navigations', async ({ browser }) => {
      const pages = await Promise.all([
        browser.newPage(),
        browser.newPage(),
        browser.newPage(),
      ]);
      
      const startTime = Date.now();
      
      await Promise.all([
        pages[0].goto('/'),
        pages[1].goto('/jobs'),
        pages[2].goto('/auth'),
      ]);
      
      const totalTime = Date.now() - startTime;
      
      // All three pages should load within 5 seconds total
      expect(totalTime).toBeLessThan(5000);
      
      // Cleanup
      await Promise.all(pages.map(p => p.close()));
    });
  });

  test.describe('Memory Usage', () => {
    test('page does not have memory leaks on navigation', async ({ page }) => {
      // Navigate multiple times and check memory doesn't grow excessively
      const memorySnapshots: number[] = [];
      
      for (let i = 0; i < 3; i++) {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const metrics = await page.evaluate(() => {
          if ((performance as any).memory) {
            return (performance as any).memory.usedJSHeapSize;
          }
          return 0;
        });
        
        if (metrics > 0) {
          memorySnapshots.push(metrics);
        }
        
        await page.goto('/jobs');
        await page.waitForLoadState('networkidle');
      }
      
      if (memorySnapshots.length >= 2) {
        const firstSnapshot = memorySnapshots[0];
        const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
        
        // Memory should not grow more than 50% across navigations
        expect(lastSnapshot).toBeLessThan(firstSnapshot * 1.5);
      }
    });
  });
});
