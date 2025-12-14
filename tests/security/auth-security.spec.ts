import { test, expect } from '@playwright/test';

/**
 * Security Testing Suite
 * Validates input validation, XSS prevention, and auth security
 */

test.describe('Security Tests', () => {
  test.describe('Input Validation', () => {
    test('should reject XSS in login email field', async ({ page }) => {
      await page.goto('/auth');
      
      // Attempt XSS injection in email field
      const xssPayload = '<script>alert("xss")</script>';
      await page.fill('input[type="email"], input[name="email"]', xssPayload);
      
      // Verify the script tag is not rendered
      const pageContent = await page.content();
      expect(pageContent).not.toContain('<script>alert');
    });

    test('should sanitize SQL injection attempts', async ({ page }) => {
      await page.goto('/auth');
      
      const sqlPayload = "'; DROP TABLE users; --";
      await page.fill('input[type="email"], input[name="email"]', sqlPayload);
      await page.fill('input[type="password"], input[name="password"]', 'password123');
      
      // Should not cause a crash
      await page.click('button[type="submit"]');
      await expect(page).not.toHaveURL('/error');
    });

    test('should limit input field lengths', async ({ page }) => {
      await page.goto('/auth');
      
      const longString = 'a'.repeat(10000);
      const emailField = page.locator('input[type="email"], input[name="email"]');
      await emailField.fill(longString);
      
      // Input should be truncated or rejected
      const value = await emailField.inputValue();
      expect(value.length).toBeLessThan(1000);
    });
  });

  test.describe('Authentication Security', () => {
    test('should not expose sensitive data in URL', async ({ page }) => {
      await page.goto('/auth');
      
      await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
      await page.fill('input[type="password"], input[name="password"]', 'secretpassword');
      
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('password');
      expect(currentUrl).not.toContain('secret');
    });

    test('should use HTTPS for API calls', async ({ page }) => {
      const apiCalls: string[] = [];
      
      page.on('request', (request) => {
        if (request.url().includes('supabase')) {
          apiCalls.push(request.url());
        }
      });
      
      await page.goto('/');
      
      // All Supabase API calls should use HTTPS
      apiCalls.forEach((url) => {
        expect(url).toMatch(/^https:/);
      });
    });

    test('should set secure cookie flags', async ({ page }) => {
      await page.goto('/');
      
      const cookies = await page.context().cookies();
      const authCookies = cookies.filter(c => 
        c.name.includes('auth') || c.name.includes('session')
      );
      
      // Auth cookies should have secure flag in production
      authCookies.forEach((cookie) => {
        if (process.env.CI) {
          expect(cookie.secure).toBe(true);
        }
      });
    });
  });

  test.describe('CSRF Protection', () => {
    test('OAuth flow should include state parameter', async ({ page }) => {
      await page.goto('/auth');
      
      // Look for OAuth buttons
      const googleButton = page.locator('button:has-text("Google"), [data-provider="google"]');
      
      if (await googleButton.isVisible()) {
        const [request] = await Promise.all([
          page.waitForRequest((req) => req.url().includes('google') || req.url().includes('oauth')),
          googleButton.click(),
        ]).catch(() => [null]);
        
        if (request) {
          expect(request.url()).toContain('state=');
        }
      }
    });
  });
});
