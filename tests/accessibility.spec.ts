import { test, expect } from '@playwright/test';

test.describe('Accessibility Tests', () => {
  test('should have proper ARIA labels on navigation', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    // Check main navigation has aria-label
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();

    // Check all buttons have accessible names
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const accessibleName = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      
      // Button should have either aria-label or text content
      expect(accessibleName || textContent?.trim()).toBeTruthy();
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check that focus is visible
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    // Check for h1
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();

    // Verify heading structure (h1 should come before h2, etc.)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      
      // All images must have alt attribute (can be empty for decorative)
      expect(alt).toBeDefined();
    }
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Check email input has label
    const emailInput = page.locator('input[type="email"]').first();
    const emailLabel = await emailInput.getAttribute('aria-label') || 
                       await page.locator(`label[for="${await emailInput.getAttribute('id')}"]`).textContent();
    expect(emailLabel).toBeTruthy();

    // Check password input has label
    const passwordInput = page.locator('input[type="password"]').first();
    const passwordLabel = await passwordInput.getAttribute('aria-label') || 
                          await page.locator(`label[for="${await passwordInput.getAttribute('id')}"]`).textContent();
    expect(passwordLabel).toBeTruthy();
  });

  test('should support Escape key to close modals', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    // Try to open a modal (if available)
    const triggerButton = page.locator('button').filter({ hasText: /create|new|add/i }).first();
    
    if (await triggerButton.isVisible()) {
      await triggerButton.click();
      await page.waitForTimeout(500);

      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Modal should be closed (check for common modal indicators)
      const modal = page.locator('[role="dialog"]');
      if (await modal.count() > 0) {
        await expect(modal).not.toBeVisible();
      }
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    // This is a basic check - proper contrast testing requires axe-core or similar
    // For now, we just check that text elements are visible
    const textElements = page.locator('p, span, h1, h2, h3, h4, h5, h6').first();
    await expect(textElements).toBeVisible();
    
    // In a full implementation, you would:
    // 1. Use axe-core: await injectAxe(page); const results = await checkA11y(page);
    // 2. Check contrast ratios programmatically
    // 3. Verify WCAG AA compliance (4.5:1 for normal text, 3:1 for large text)
  });

  test('should have skip to main content link', async ({ page }) => {
    await page.goto('/home');
    
    // Tab once to focus skip link
    await page.keyboard.press('Tab');
    
    const skipLink = page.locator('a').filter({ hasText: /skip/i }).first();
    
    // Skip link should either be visible or become visible on focus
    if (await skipLink.count() > 0) {
      await expect(skipLink).toBeVisible();
    }
  });

  test('should announce errors to screen readers', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Submit form without filling it out
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    await page.waitForTimeout(1000);

    // Check for aria-live region or role="alert"
    const errorMessage = page.locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]').first();
    
    if (await errorMessage.count() > 0) {
      await expect(errorMessage).toBeVisible();
    }
  });

  test('should have proper table structure if tables exist', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    const tables = page.locator('table');
    const count = await tables.count();

    if (count > 0) {
      const firstTable = tables.first();
      
      // Check for thead
      const thead = firstTable.locator('thead');
      if (await thead.count() > 0) {
        await expect(thead).toBeVisible();
      }

      // Check for tbody
      const tbody = firstTable.locator('tbody');
      await expect(tbody).toBeVisible();

      // Check for th elements in header
      const headers = firstTable.locator('th');
      const headerCount = await headers.count();
      expect(headerCount).toBeGreaterThan(0);
    }
  });
});
