/* eslint-disable react-hooks/rules-of-hooks -- Playwright 'use' function is not a React hook */
import { Page, test as base } from '@playwright/test';
import { testUsers } from './fixtures/test-data';
import * as fs from 'fs';
import * as path from 'path';

export type UserRole = 'candidate' | 'partner' | 'admin' | 'strategist';

/**
 * Authentication Helper for E2E Tests
 * Provides utilities for role-based authentication
 */
export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Login as a specific role
   */
  async loginAs(role: UserRole): Promise<void> {
    const credentials = testUsers[role];
    if (!credentials) {
      throw new Error(`Unknown role: ${role}`);
    }

    await this.page.goto('/auth');
    await this.page.waitForLoadState('networkidle');
    
    await this.page.fill('input[type="email"]', credentials.email);
    await this.page.fill('input[type="password"]', credentials.password);
    await this.page.click('button[type="submit"]');
    
    // Wait for redirect after successful login
    await this.page.waitForURL(/\/(home|dashboard|onboarding)/, { timeout: 15000 });
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    // Try clicking user menu and logout
    const userMenu = this.page.locator('[data-testid="user-menu"], button:has-text("Account")').first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
      const logoutButton = this.page.locator('button:has-text("Logout"), button:has-text("Sign out")').first();
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      }
    }
    
    // Clear storage as fallback
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await this.page.goto('/auth');
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return this.page.evaluate(() => {
      const storage = localStorage.getItem('sb-dpjucecmoyfzrduhlctt-auth-token');
      return storage !== null;
    });
  }

  /**
   * Get current user role from page context
   */
  async getCurrentRole(): Promise<string | null> {
    return this.page.evaluate(() => {
      const storage = localStorage.getItem('sb-dpjucecmoyfzrduhlctt-auth-token');
      if (!storage) return null;
      try {
        const data = JSON.parse(storage);
        return data?.user?.user_metadata?.role || null;
      } catch {
        return null;
      }
    });
  }
}

/**
 * Check if auth state file exists for a role
 */
export function hasAuthState(role: UserRole): boolean {
  const authPath = path.join(__dirname, '.auth', `${role}.json`);
  return fs.existsSync(authPath);
}

/**
 * Get auth state path for a role
 */
export function getAuthStatePath(role: UserRole): string {
  return path.join(__dirname, '.auth', `${role}.json`);
}

/**
 * Extended test fixture with authentication support
 */
export const test = base.extend<{
  authHelper: AuthHelper;
  authenticatedPage: Page;
}>({
  authHelper: async ({ page }, use) => {
    const helper = new AuthHelper(page);
    await use(helper);
  },
  authenticatedPage: async ({ page }, use) => {
    // Automatically login as candidate for authenticated tests
    const helper = new AuthHelper(page);
    await helper.loginAs('candidate');
    await use(page);
  },
});

export { expect } from '@playwright/test';
