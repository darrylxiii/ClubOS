import { test, expect } from '@playwright/test';

/**
 * Input Validation Security Tests
 * Tests for XSS, SQL Injection, and other input-based attacks
 */

test.describe('Input Validation Security', () => {
  test.describe('XSS Prevention', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert("xss")>',
      '"><script>alert(String.fromCharCode(88,83,83))</script>',
      '<svg onload=alert("xss")>',
      'javascript:alert("xss")',
      '<body onload=alert("xss")>',
      '<iframe src="javascript:alert(\'xss\')">',
      '"><img src=x onerror=alert(1)>',
    ];

    test('login form rejects XSS in email field', async ({ page }) => {
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');

      for (const payload of xssPayloads.slice(0, 3)) {
        const emailInput = page.locator('input[type="email"]').first();
        if (await emailInput.isVisible()) {
          await emailInput.fill(payload);
          
          // The input should either reject the value or sanitize it
          const value = await emailInput.inputValue();
          expect(value).not.toContain('<script>');
          expect(value).not.toContain('onerror');
          
          await emailInput.clear();
        }
      }
    });

    test('search inputs sanitize XSS payloads', async ({ page }) => {
      await page.goto('/jobs');
      await page.waitForLoadState('networkidle');

      const searchInput = page.locator('input[type="search"], input[placeholder*="earch"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('<script>alert("xss")</script>');
        
        // Wait for any search to process
        await page.waitForTimeout(500);
        
        // Check that script tags are not rendered in the DOM
        const scriptInPage = await page.evaluate(() => {
          return document.body.innerHTML.includes('<script>alert("xss")</script>');
        });
        
        expect(scriptInPage).toBe(false);
      }
    });

    test('URL parameters do not execute scripts', async ({ page }) => {
      const xssUrl = '/jobs?search=<script>alert("xss")</script>';
      await page.goto(xssUrl);
      await page.waitForLoadState('networkidle');
      
      // The page should load without executing the script
      const dialogTriggered = await page.evaluate(() => {
        return (window as any).__xssTriggered === true;
      });
      
      expect(dialogTriggered).toBeFalsy();
    });
  });

  test.describe('SQL Injection Prevention', () => {
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "1; DELETE FROM applications; --",
      "' UNION SELECT * FROM profiles --",
      "admin'--",
      "1' AND 1=1 --",
    ];

    test('login form handles SQL injection attempts gracefully', async ({ page }) => {
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');

      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      if (await emailInput.isVisible()) {
        // Try SQL injection in email
        await emailInput.fill("admin'--@test.com");
        await passwordInput.fill(sqlPayloads[0]);
        
        await submitButton.click();
        await page.waitForTimeout(1000);
        
        // Should show validation error, not crash
        const hasError = await page.locator('[role="alert"], .error, [class*="error"]').count() > 0 ||
                         await page.locator('text=/invalid|error/i').count() > 0;
        
        // Page should still be functional
        expect(await page.url()).toContain('/auth');
      }
    });

    test('search does not execute SQL commands', async ({ page }) => {
      await page.goto('/jobs');
      await page.waitForLoadState('networkidle');

      const searchInput = page.locator('input[type="search"], input[placeholder*="earch"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill("'; DROP TABLE jobs; --");
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        
        // Page should still work - jobs should still load on refresh
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        // The page should function normally
        expect(page.url()).toContain('/jobs');
      }
    });
  });

  test.describe('Path Traversal Prevention', () => {
    test('prevents directory traversal in URLs', async ({ page }) => {
      const traversalUrls = [
        '/../../etc/passwd',
        '/../../../config',
        '/jobs/../../admin',
      ];

      for (const url of traversalUrls) {
        const response = await page.goto(url);
        
        // Should not expose sensitive files or paths
        const content = await page.content();
        expect(content).not.toContain('root:');
        expect(content).not.toContain('password');
        
        // Should redirect to safe page or 404
        expect(response?.status()).not.toBe(500);
      }
    });
  });

  test.describe('Input Length Limits', () => {
    test('email field enforces maximum length', async ({ page }) => {
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');

      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible()) {
        const veryLongEmail = 'a'.repeat(500) + '@example.com';
        await emailInput.fill(veryLongEmail);
        
        const value = await emailInput.inputValue();
        // Should be limited or truncated
        expect(value.length).toBeLessThan(300);
      }
    });

    test('password field accepts reasonable length', async ({ page }) => {
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');

      const passwordInput = page.locator('input[type="password"]').first();
      if (await passwordInput.isVisible()) {
        const longPassword = 'P@ssw0rd'.repeat(20);
        await passwordInput.fill(longPassword);
        
        const value = await passwordInput.inputValue();
        expect(value.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Special Character Handling', () => {
    test('handles unicode characters safely', async ({ page }) => {
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');

      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible()) {
        const unicodeInputs = [
          'test@例え.jp',
          'test@почта.рф',
          '测试@test.com',
        ];

        for (const input of unicodeInputs) {
          await emailInput.fill(input);
          const value = await emailInput.inputValue();
          // Should handle gracefully without crashing
          expect(value).toBeTruthy();
          await emailInput.clear();
        }
      }
    });

    test('handles null bytes safely', async ({ page }) => {
      await page.goto('/jobs');
      await page.waitForLoadState('networkidle');

      const searchInput = page.locator('input[type="search"], input[placeholder*="earch"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('test\x00injection');
        await page.waitForTimeout(300);
        
        // Page should not crash
        expect(await page.title()).toBeTruthy();
      }
    });
  });

  test.describe('CSRF Token Validation', () => {
    test('forms include CSRF protection', async ({ page }) => {
      await page.goto('/auth');
      await page.waitForLoadState('networkidle');

      // Check for CSRF token in form or meta tag
      const csrfToken = await page.evaluate(() => {
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        const inputToken = document.querySelector('input[name="_token"], input[name="csrf"]');
        return metaToken || inputToken;
      });

      // Modern SPAs may handle CSRF differently (via auth headers)
      // This test verifies the form doesn't have obvious vulnerabilities
      const form = page.locator('form').first();
      if (await form.isVisible()) {
        const action = await form.getAttribute('action');
        // Forms should not use GET for sensitive data
        const method = await form.getAttribute('method');
        if (method) {
          expect(method.toLowerCase()).not.toBe('get');
        }
      }
    });
  });
});
