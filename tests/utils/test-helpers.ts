import { Page, expect } from '@playwright/test';

/**
 * Test helper utilities for E2E tests
 */

/**
 * Wait for network to be idle with a custom timeout
 */
export async function waitForNetworkIdle(page: Page, timeout = 10000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for a specific API response
 */
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse(response => 
    response.url().match(urlPattern) !== null && response.status() === 200
  );
}

/**
 * Clear all browser storage
 */
export async function clearBrowserStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Set localStorage item
 */
export async function setLocalStorage(page: Page, key: string, value: string) {
  await page.evaluate(([k, v]) => {
    localStorage.setItem(k, v);
  }, [key, value]);
}

/**
 * Get localStorage item
 */
export async function getLocalStorage(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

/**
 * Mock API response
 */
export async function mockApiResponse(page: Page, urlPattern: string, response: object) {
  await page.route(urlPattern, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Take screenshot with consistent naming
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ 
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true 
  });
}

/**
 * Wait for toast notification and verify message
 */
export async function expectToast(page: Page, message: string | RegExp) {
  const toast = page.locator('[data-sonner-toast]').filter({ 
    hasText: message instanceof RegExp ? message : new RegExp(message, 'i') 
  });
  await expect(toast).toBeVisible({ timeout: 10000 });
}

/**
 * Dismiss all toasts
 */
export async function dismissToasts(page: Page) {
  const closeButtons = page.locator('[data-sonner-toast] button[aria-label="Close"]');
  const count = await closeButtons.count();
  for (let i = 0; i < count; i++) {
    await closeButtons.nth(i).click().catch(() => {});
  }
}

/**
 * Check if element is in viewport
 */
export async function isInViewport(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }, selector);
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(page: Page, selector: string) {
  await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, selector);
  await page.waitForTimeout(500); // Wait for scroll animation
}

/**
 * Fill form fields from an object
 */
export async function fillForm(page: Page, fields: Record<string, string>) {
  for (const [label, value] of Object.entries(fields)) {
    const input = page.getByLabel(label);
    if (await input.isVisible()) {
      await input.fill(value);
    }
  }
}

/**
 * Check accessibility violations using axe-core
 */
export async function checkAccessibility(page: Page) {
  // This would require @axe-core/playwright package
  // For now, we do basic checks
  const issues: string[] = [];
  
  // Check for images without alt text
  const imagesWithoutAlt = await page.locator('img:not([alt])').count();
  if (imagesWithoutAlt > 0) {
    issues.push(`${imagesWithoutAlt} images without alt text`);
  }
  
  // Check for buttons without accessible name
  const buttonsWithoutName = await page.locator('button:not([aria-label]):not(:has-text(*))').count();
  if (buttonsWithoutName > 0) {
    issues.push(`${buttonsWithoutName} buttons without accessible name`);
  }
  
  // Check for form inputs without labels
  const inputsWithoutLabels = await page.locator('input:not([aria-label]):not([id])').count();
  if (inputsWithoutLabels > 0) {
    issues.push(`${inputsWithoutLabels} inputs without labels`);
  }
  
  return issues;
}

/**
 * Generate random string for unique test data
 */
export function randomString(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Wait for element to stop animating
 */
export async function waitForAnimationEnd(page: Page, selector: string) {
  await page.waitForFunction((sel) => {
    const element = document.querySelector(sel);
    if (!element) return true;
    
    const animations = element.getAnimations();
    return animations.length === 0 || animations.every(a => a.playState === 'finished');
  }, selector);
}
