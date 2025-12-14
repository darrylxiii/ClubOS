import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Settings Page Object Model
 * Handles user settings and preferences
 */
export class SettingsPage extends BasePage {
  readonly settingsNav: Locator;
  readonly profileTab: Locator;
  readonly accountTab: Locator;
  readonly notificationsTab: Locator;
  readonly privacyTab: Locator;
  readonly appearanceTab: Locator;
  readonly integrationsTab: Locator;
  readonly securityTab: Locator;
  
  // Common elements
  readonly saveButton: Locator;
  readonly resetButton: Locator;
  
  // Account settings
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly changePasswordButton: Locator;
  readonly deleteAccountButton: Locator;
  
  // Notification toggles
  readonly emailNotificationsToggle: Locator;
  readonly pushNotificationsToggle: Locator;
  readonly smsNotificationsToggle: Locator;
  
  // Privacy settings
  readonly profileVisibilitySelect: Locator;
  readonly showEmailToggle: Locator;
  readonly showPhoneToggle: Locator;
  
  // Appearance settings
  readonly themeSelect: Locator;
  readonly fontSizeSelect: Locator;
  
  // Integration buttons
  readonly connectGoogleButton: Locator;
  readonly connectLinkedInButton: Locator;
  readonly disconnectButton: Locator;

  constructor(page: Page) {
    super(page);
    this.settingsNav = page.locator('[data-testid="settings-nav"], nav').first();
    this.profileTab = page.locator('button:has-text("Profile"), a:has-text("Profile")').first();
    this.accountTab = page.locator('button:has-text("Account"), a:has-text("Account")').first();
    this.notificationsTab = page.locator('button:has-text("Notifications"), a:has-text("Notifications")').first();
    this.privacyTab = page.locator('button:has-text("Privacy"), a:has-text("Privacy")').first();
    this.appearanceTab = page.locator('button:has-text("Appearance"), a:has-text("Appearance")').first();
    this.integrationsTab = page.locator('button:has-text("Integrations"), a:has-text("Integrations")').first();
    this.securityTab = page.locator('button:has-text("Security"), a:has-text("Security")').first();
    
    this.saveButton = page.getByRole('button', { name: /save/i });
    this.resetButton = page.getByRole('button', { name: /reset|default/i });
    
    this.currentPasswordInput = page.getByLabel(/current.*password/i);
    this.newPasswordInput = page.getByLabel(/new.*password/i);
    this.confirmPasswordInput = page.getByLabel(/confirm.*password/i);
    this.changePasswordButton = page.getByRole('button', { name: /change.*password|update.*password/i });
    this.deleteAccountButton = page.getByRole('button', { name: /delete.*account/i });
    
    this.emailNotificationsToggle = page.locator('[data-testid="email-notifications"], input[type="checkbox"]').first();
    this.pushNotificationsToggle = page.locator('[data-testid="push-notifications"], input[type="checkbox"]').nth(1);
    this.smsNotificationsToggle = page.locator('[data-testid="sms-notifications"], input[type="checkbox"]').nth(2);
    
    this.profileVisibilitySelect = page.locator('[data-testid="profile-visibility"], select').first();
    this.showEmailToggle = page.locator('[data-testid="show-email"]');
    this.showPhoneToggle = page.locator('[data-testid="show-phone"]');
    
    this.themeSelect = page.locator('[data-testid="theme-select"], select').first();
    this.fontSizeSelect = page.locator('[data-testid="font-size-select"]');
    
    this.connectGoogleButton = page.getByRole('button', { name: /connect.*google|google/i });
    this.connectLinkedInButton = page.getByRole('button', { name: /connect.*linkedin|linkedin/i });
    this.disconnectButton = page.getByRole('button', { name: /disconnect/i });
  }

  async navigateToSettings() {
    await this.goto('/settings');
  }

  async expectSettingsPage() {
    await expect(this.page).toHaveURL(/settings/);
    await this.waitForPageLoad();
  }

  async switchToTab(tabName: 'profile' | 'account' | 'notifications' | 'privacy' | 'appearance' | 'integrations' | 'security') {
    const tabMap = {
      profile: this.profileTab,
      account: this.accountTab,
      notifications: this.notificationsTab,
      privacy: this.privacyTab,
      appearance: this.appearanceTab,
      integrations: this.integrationsTab,
      security: this.securityTab,
    };
    
    await tabMap[tabName].click();
    await this.waitForPageLoad();
  }

  async changePassword(currentPassword: string, newPassword: string) {
    await this.switchToTab('account');
    await this.currentPasswordInput.fill(currentPassword);
    await this.newPasswordInput.fill(newPassword);
    await this.confirmPasswordInput.fill(newPassword);
    await this.changePasswordButton.click();
    await this.waitForToast();
  }

  async toggleEmailNotifications(enabled: boolean) {
    await this.switchToTab('notifications');
    const isChecked = await this.emailNotificationsToggle.isChecked();
    if (isChecked !== enabled) {
      await this.emailNotificationsToggle.click();
    }
  }

  async togglePushNotifications(enabled: boolean) {
    await this.switchToTab('notifications');
    const isChecked = await this.pushNotificationsToggle.isChecked();
    if (isChecked !== enabled) {
      await this.pushNotificationsToggle.click();
    }
  }

  async setProfileVisibility(visibility: 'public' | 'private' | 'connections') {
    await this.switchToTab('privacy');
    await this.profileVisibilitySelect.selectOption(visibility);
    await this.saveButton.click();
    await this.waitForToast();
  }

  async setTheme(theme: 'light' | 'dark' | 'system') {
    await this.switchToTab('appearance');
    await this.themeSelect.selectOption(theme);
    await this.saveButton.click();
  }

  async connectGoogleCalendar() {
    await this.switchToTab('integrations');
    await this.connectGoogleButton.click();
    // OAuth flow will redirect - handle in test
  }

  async disconnectIntegration(integrationName: string) {
    await this.switchToTab('integrations');
    const integration = this.page.locator(`text=${integrationName}`).first();
    const disconnectBtn = integration.locator('..').locator('button:has-text("Disconnect")');
    await disconnectBtn.click();
    await this.waitForToast();
  }

  async saveSettings() {
    await this.saveButton.click();
    await this.waitForToast();
  }

  async resetToDefaults() {
    await this.resetButton.click();
    await this.page.click('button:has-text("Confirm")');
    await this.waitForToast();
  }
}
