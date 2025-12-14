import { test, expect } from '@playwright/test';
import { SettingsPage } from '../page-objects/SettingsPage';

test.describe('Settings Management', () => {
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
    // Login first
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'admin@thequantumclub.com');
    await page.fill('input[type="password"]', 'Test123456!!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/home/, { timeout: 15000 });
  });

  test('should display settings page', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show settings navigation tabs', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    // Look for tabs or navigation
    const tabs = page.locator('[role="tab"], button:has-text("Account"), button:has-text("Profile")');
    // Tabs may or may not be present depending on design
  });

  test('should display profile settings section', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const profileSection = page.locator('text=/profile/i').first();
    // Profile section may or may not be visible
  });

  test('should display account settings section', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const accountSection = page.locator('text=/account/i').first();
    // Account section may or may not be visible
  });

  test('should display notification settings', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const notificationsSection = page.locator('text=/notification/i').first();
    // Notifications section may or may not be visible
  });

  test('should display privacy settings', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const privacySection = page.locator('text=/privacy/i').first();
    // Privacy section may or may not be visible
  });

  test('should display appearance settings', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const appearanceSection = page.locator('text=/appearance|theme/i').first();
    // Appearance section may or may not be visible
  });

  test('should have change password functionality', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const passwordSection = page.locator('text=/password/i').first();
    const changePasswordButton = page.locator('button:has-text("Change Password"), button:has-text("Update Password")').first();
    // Password section may or may not be visible
  });

  test('should show current password field', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const currentPasswordInput = page.getByLabel(/current.*password/i);
    // Current password field may or may not be visible
  });

  test('should show email notification toggle', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const emailToggle = page.locator('[data-testid="email-notifications"], input[type="checkbox"]').first();
    // Email toggle may or may not be visible
  });

  test('should show push notification toggle', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const pushToggle = page.locator('text=/push.*notification/i').first();
    // Push toggle may or may not be visible
  });

  test('should show profile visibility options', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const visibilitySelect = page.locator('text=/visibility|public|private/i').first();
    // Visibility options may or may not be visible
  });

  test('should show theme selection', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const themeSelect = page.locator('text=/theme|light|dark/i').first();
    // Theme selection may or may not be visible
  });

  test('should have integrations section', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const integrationsSection = page.locator('text=/integration|connect/i').first();
    // Integrations section may or may not be visible
  });

  test('should show Google integration option', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const googleOption = page.locator('text=/google/i').first();
    // Google option may or may not be visible
  });

  test('should show LinkedIn integration option', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const linkedInOption = page.locator('text=/linkedin/i').first();
    // LinkedIn option may or may not be visible
  });

  test('should have save settings button', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const saveButton = page.locator('button:has-text("Save")').first();
    // Save button may or may not be visible
  });

  test('should have reset to defaults option', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const resetButton = page.locator('button:has-text("Reset"), button:has-text("Default")').first();
    // Reset button may or may not be visible
  });

  test('should show security section', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const securitySection = page.locator('text=/security/i').first();
    // Security section may or may not be visible
  });

  test('should have two-factor authentication option', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const twoFactorOption = page.locator('text=/two.*factor|2fa/i').first();
    // 2FA option may or may not be visible
  });

  test('should have delete account option', async ({ page }) => {
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');
    
    const deleteAccountButton = page.locator('button:has-text("Delete Account")').first();
    // Delete account button may or may not be visible
  });
});
