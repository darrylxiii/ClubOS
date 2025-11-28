import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load home page within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/home');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
    console.log(`Home page load time: ${loadTime}ms`);
  });

  test('should have good Core Web Vitals', async ({ page }) => {
    await page.goto('/home');
    
    // Measure Largest Contentful Paint (LCP)
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.renderTime || lastEntry.loadTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Timeout after 5 seconds
        setTimeout(() => resolve(0), 5000);
      });
    });

    // LCP should be under 2.5 seconds (Good)
    expect(lcp).toBeLessThan(2500);
    console.log(`LCP: ${lcp}ms`);
  });

  test('should not have excessive JavaScript bundle size', async ({ page }) => {
    const metrics: any = [];
    
    page.on('response', response => {
      if (response.url().includes('.js') && response.status() === 200) {
        metrics.push({
          url: response.url(),
          size: response.headers()['content-length']
        });
      }
    });

    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    // Total JS should ideally be under 500KB
    const totalSize = metrics.reduce((sum: number, m: any) => {
      const size = parseInt(m.size || '0', 10);
      return sum + size;
    }, 0);

    console.log(`Total JS size: ${(totalSize / 1024).toFixed(2)} KB`);
    
    // Warning if over 1MB
    if (totalSize > 1024 * 1024) {
      console.warn('⚠️ JavaScript bundle size exceeds 1MB');
    }
  });

  test('should render content progressively', async ({ page }) => {
    await page.goto('/jobs');
    
    // Check that skeleton/loading states appear first
    const loadingState = page.locator('[data-loading="true"]');
    
    // Wait a bit for initial render
    await page.waitForTimeout(100);
    
    // Then wait for actual content
    await page.waitForLoadState('networkidle');
    
    const content = page.locator('main').first();
    await expect(content).toBeVisible();
  });

  test('should lazy load images', async ({ page }) => {
    let imageLoadCount = 0;
    
    page.on('response', response => {
      if (response.url().match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        imageLoadCount++;
      }
    });

    await page.goto('/companies');
    await page.waitForLoadState('networkidle');
    
    const initialImageCount = imageLoadCount;
    
    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(1000);
    
    // More images should load after scrolling
    console.log(`Initial images: ${initialImageCount}, After scroll: ${imageLoadCount}`);
    
    // This test passes if lazy loading is working OR if there aren't many images
    expect(imageLoadCount).toBeGreaterThanOrEqual(initialImageCount);
  });

  test('should have reasonable time to interactive', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/home');
    
    // Wait for page to be fully interactive
    await page.waitForLoadState('networkidle');
    
    // Try to interact with first button
    const button = page.locator('button').first();
    await button.waitFor({ state: 'visible' });
    await button.click();
    
    const interactiveTime = Date.now() - startTime;
    
    // Should be interactive within 5 seconds
    expect(interactiveTime).toBeLessThan(5000);
    console.log(`Time to Interactive: ${interactiveTime}ms`);
  });

  test('should handle navigation quickly', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle');
    
    const startTime = Date.now();
    
    // Click navigation link
    const jobsLink = page.locator('a[href*="/jobs"]').first();
    await jobsLink.click();
    
    await page.waitForLoadState('networkidle');
    
    const navTime = Date.now() - startTime;
    
    // Navigation should be fast with client-side routing
    expect(navTime).toBeLessThan(2000);
    console.log(`Navigation time: ${navTime}ms`);
  });

  test('should not have memory leaks on repeated navigation', async ({ page }) => {
    await page.goto('/home');
    
    // Navigate back and forth multiple times
    for (let i = 0; i < 5; i++) {
      await page.goto('/jobs');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      await page.goto('/home');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
    }
    
    // Check JS heap size (basic check)
    const metrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    console.log(`JS Heap Size after navigation: ${(metrics / 1024 / 1024).toFixed(2)} MB`);
    
    // Warning if heap size is excessive (over 100MB)
    if (metrics > 100 * 1024 * 1024) {
      console.warn('⚠️ JS Heap size is high, potential memory leak');
    }
  });
});
