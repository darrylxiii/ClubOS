import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('should display auth page correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Welcome Back');
    await expect(page.locator('text=INVITE ONLY')).toBeVisible();
  });

  test('should toggle between login and signup', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Welcome Back');
    
    await page.click('text=Create an account');
    await expect(page.locator('h1')).toContainText('Join The Quantum Club');
    
    await page.click('text=Already have an account?');
    await expect(page.locator('h1')).toContainText('Welcome Back');
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Invalid email address')).toBeVisible();
  });

  test('should show OAuth buttons', async ({ page }) => {
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();
    await expect(page.locator('button:has-text("Continue with Apple")')).toBeVisible();
    await expect(page.locator('button:has-text("Continue with LinkedIn")')).toBeVisible();
  });

  test('should require full name for signup', async ({ page }) => {
    await page.click('text=Create an account');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Please enter your full name')).toBeVisible();
  });

  test('should enforce password requirements on signup', async ({ page }) => {
    await page.click('text=Create an account');
    
    await page.fill('input[placeholder="Full Name"]', 'Test User');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'weak');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Password must be at least 12 characters')).toBeVisible();
  });
});
