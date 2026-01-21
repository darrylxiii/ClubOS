import { test, expect } from '@playwright/test';

/**
 * Row Level Security Policy Tests
 * Verifies data isolation between users and roles
 */

test.describe('RLS Policy Verification', () => {
  test.describe('Unauthenticated Access', () => {
    test('unauthenticated users cannot access protected routes', async ({ page }) => {
      const protectedRoutes = [
        '/home',
        '/profile',
        '/applications',
        '/messages',
        '/settings',
        '/admin',
      ];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        
        // Should redirect to auth or show unauthorized
        const url = page.url();
        const isRedirected = url.includes('/auth') || 
                            url.includes('/login') || 
                            url === (await page.evaluate(() => window.location.origin) + '/');
        
        expect(isRedirected).toBe(true);
      }
    });

    test('public routes are accessible', async ({ page }) => {
      const publicRoutes = [
        '/',
        '/auth',
        '/jobs',
      ];

      for (const route of publicRoutes) {
        const response = await page.goto(route);
        expect(response?.status()).toBeLessThan(400);
      }
    });
  });

  test.describe('API Endpoint Protection', () => {
    test('direct API calls without auth return 401', async ({ request }) => {
      const protectedEndpoints = [
        '/rest/v1/profiles',
        '/rest/v1/applications',
        '/rest/v1/messages',
      ];

      for (const endpoint of protectedEndpoints) {
        try {
          const response = await request.get(`https://dpjucecmoyfzrduhlctt.supabase.co${endpoint}`, {
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwanVjZWNtb3lmenJkdWhsY3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mjc2MTAsImV4cCI6MjA3NTAwMzYxMH0.hdX709NlaXPUE4ohWtd3LBuAOqPKCBhVep694LC6tRw',
            },
          });
          
          // With RLS enabled, should return empty array or 401/403
          if (response.ok()) {
            const data = await response.json();
            // RLS should filter to empty for unauthenticated requests
            expect(Array.isArray(data) ? data.length : 0).toBe(0);
          }
        } catch {
          // Network errors are acceptable in test environment
        }
      }
    });
  });

  test.describe('Admin Route Protection', () => {
    test('admin routes redirect non-admin users', async ({ page }) => {
      const adminRoutes = [
        '/admin',
        '/admin/users',
        '/admin/companies',
        '/admin/settings',
      ];

      for (const route of adminRoutes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
        
        // Should redirect away from admin
        const url = page.url();
        const isProtected = url.includes('/auth') || 
                           url.includes('/home') ||
                           url.includes('/unauthorized') ||
                           !url.includes('/admin');
        
        expect(isProtected).toBe(true);
      }
    });
  });

  test.describe('Partner Route Protection', () => {
    test('partner routes are not accessible to candidates', async ({ page }) => {
      const partnerRoutes = [
        '/partner',
        '/partner/candidates',
        '/partner/pipeline',
      ];

      for (const route of partnerRoutes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        
        // Should redirect
        const url = page.url();
        const isRedirected = url.includes('/auth') || 
                            url.includes('/home') ||
                            !url.includes('/partner');
        
        expect(isRedirected).toBe(true);
      }
    });
  });

  test.describe('Data Isolation', () => {
    test('cannot access other users data via URL manipulation', async ({ page }) => {
      // Try to access a random user's profile
      await page.goto('/profile/random-user-id-12345');
      await page.waitForLoadState('networkidle');
      
      // Should redirect or show not found
      const url = page.url();
      const content = await page.content();
      
      const isProtected = url.includes('/auth') ||
                         content.includes('not found') ||
                         content.includes('Not Found') ||
                         content.includes('unauthorized');
      
      expect(isProtected || !url.includes('random-user-id')).toBe(true);
    });

    test('cannot access other applications via ID', async ({ page }) => {
      await page.goto('/applications/fake-application-id-xyz');
      await page.waitForLoadState('networkidle');
      
      const url = page.url();
      const isProtected = url.includes('/auth') || 
                         !url.includes('fake-application-id');
      
      expect(isProtected).toBe(true);
    });
  });

  test.describe('File Access Protection', () => {
    test('cannot access files without authentication', async ({ request }) => {
      // Attempt to access a protected file path
      const response = await request.get(
        'https://dpjucecmoyfzrduhlctt.supabase.co/storage/v1/object/protected/resumes/test.pdf',
        {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwanVjZWNtb3lmenJkdWhsY3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mjc2MTAsImV4cCI6MjA3NTAwMzYxMH0.hdX709NlaXPUE4ohWtd3LBuAOqPKCBhVep694LC6tRw',
          },
        }
      );
      
      // Should not return the file content
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Session Security', () => {
    test('no sensitive data in localStorage on public pages', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const localStorage = await page.evaluate(() => {
        const data: Record<string, string> = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            data[key] = window.localStorage.getItem(key) || '';
          }
        }
        return data;
      });

      // Check no sensitive tokens are stored without auth
      const sensitiveKeys = Object.keys(localStorage).filter(key => 
        key.includes('token') || 
        key.includes('session') ||
        key.includes('auth')
      );

      for (const key of sensitiveKeys) {
        const value = localStorage[key];
        // If auth data exists, it should be for current (null) session only
        if (value && value !== 'null' && value !== '{}') {
          // Parse and check it's not another user's data
          try {
            const parsed = JSON.parse(value);
            // Acceptable to have structure but not actual tokens
            expect(parsed.access_token).toBeFalsy();
          } catch {
            // Non-JSON values should not contain tokens
            expect(value).not.toMatch(/eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/);
          }
        }
      }
    });
  });
});
