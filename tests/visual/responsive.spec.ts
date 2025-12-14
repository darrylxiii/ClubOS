import { test, expect } from '@playwright/test';

/**
 * Responsive Layout Visual Tests
 * Tests layout consistency across different viewport sizes
 */

const viewports = {
  mobile_small: { width: 320, height: 568 },   // iPhone SE
  mobile: { width: 375, height: 812 },          // iPhone X
  mobile_large: { width: 414, height: 896 },    // iPhone 11 Pro Max
  tablet: { width: 768, height: 1024 },         // iPad
  tablet_landscape: { width: 1024, height: 768 },
  laptop: { width: 1280, height: 800 },
  desktop: { width: 1920, height: 1080 },
};

test.describe('Responsive Layout Tests', () => {
  test.describe('Navigation', () => {
    test('mobile navigation hamburger menu', async ({ page }) => {
      await page.setViewportSize(viewports.mobile);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check for mobile menu button
      const menuButton = page.locator('[data-testid="mobile-menu-button"], button[aria-label*="menu"]').first();
      
      if (await menuButton.isVisible()) {
        await expect(menuButton).toHaveScreenshot('mobile-nav-closed.png');
        
        await menuButton.click();
        await page.waitForTimeout(300);
        
        await expect(page).toHaveScreenshot('mobile-nav-open.png', {
          maxDiffPixels: 100,
        });
      }
    });

    test('tablet navigation', async ({ page }) => {
      await page.setViewportSize(viewports.tablet);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const nav = page.locator('nav').first();
      if (await nav.isVisible()) {
        await expect(nav).toHaveScreenshot('tablet-navigation.png');
      }
    });

    test('desktop navigation', async ({ page }) => {
      await page.setViewportSize(viewports.desktop);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const nav = page.locator('nav').first();
      if (await nav.isVisible()) {
        await expect(nav).toHaveScreenshot('desktop-navigation.png');
      }
    });
  });

  test.describe('Auth Page Responsiveness', () => {
    for (const [name, viewport] of Object.entries(viewports)) {
      test(`auth page at ${name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/auth');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
        
        await expect(page).toHaveScreenshot(`auth-${name}.png`, {
          maxDiffPixels: 100,
        });
      });
    }
  });

  test.describe('Jobs Page Responsiveness', () => {
    test('jobs page mobile layout', async ({ page }) => {
      await page.setViewportSize(viewports.mobile);
      await page.goto('/jobs');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('jobs-mobile.png', {
        maxDiffPixels: 150,
        fullPage: false,
      });
    });

    test('jobs page tablet layout', async ({ page }) => {
      await page.setViewportSize(viewports.tablet);
      await page.goto('/jobs');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('jobs-tablet.png', {
        maxDiffPixels: 150,
        fullPage: false,
      });
    });

    test('jobs page desktop layout', async ({ page }) => {
      await page.setViewportSize(viewports.desktop);
      await page.goto('/jobs');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('jobs-desktop.png', {
        maxDiffPixels: 150,
        fullPage: false,
      });
    });
  });

  test.describe('Form Responsiveness', () => {
    test('login form mobile', async ({ page }) => {
      await page.setViewportSize(viewports.mobile);
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      
      const form = page.locator('form').first();
      if (await form.isVisible()) {
        await expect(form).toHaveScreenshot('login-form-mobile.png');
      }
    });

    test('login form desktop', async ({ page }) => {
      await page.setViewportSize(viewports.desktop);
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      
      const form = page.locator('form').first();
      if (await form.isVisible()) {
        await expect(form).toHaveScreenshot('login-form-desktop.png');
      }
    });
  });

  test.describe('Touch Target Sizes', () => {
    test('buttons meet minimum touch target (44x44)', async ({ page }) => {
      await page.setViewportSize(viewports.mobile);
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');
      
      const buttons = page.locator('button');
      const count = await buttons.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const box = await button.boundingBox();
          if (box) {
            // Minimum touch target is 44x44 pixels
            expect(box.width).toBeGreaterThanOrEqual(44);
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
        }
      }
    });
  });

  test.describe('Text Readability', () => {
    test('body text is readable on mobile', async ({ page }) => {
      await page.setViewportSize(viewports.mobile);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check font sizes
      const paragraphs = page.locator('p');
      const count = await paragraphs.count();
      
      for (let i = 0; i < Math.min(count, 3); i++) {
        const p = paragraphs.nth(i);
        if (await p.isVisible()) {
          const fontSize = await p.evaluate(el => 
            parseFloat(window.getComputedStyle(el).fontSize)
          );
          // Minimum readable font size is 14px
          expect(fontSize).toBeGreaterThanOrEqual(14);
        }
      }
    });
  });

  test.describe('Overflow Prevention', () => {
    test('no horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize(viewports.mobile);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      expect(hasHorizontalScroll).toBe(false);
    });

    test('no horizontal scroll on tablet', async ({ page }) => {
      await page.setViewportSize(viewports.tablet);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      expect(hasHorizontalScroll).toBe(false);
    });
  });
});
