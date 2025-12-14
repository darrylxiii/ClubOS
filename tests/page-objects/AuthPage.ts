import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Authentication Page Object Model
 * Handles login, signup, password reset, and OAuth flows
 */
export class AuthPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly fullNameInput: Locator;
  readonly loginButton: Locator;
  readonly signupButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly googleOAuthButton: Locator;
  readonly appleOAuthButton: Locator;
  readonly linkedInOAuthButton: Locator;
  readonly inviteCodeInput: Locator;
  readonly toggleAuthModeLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel(/email/i).first();
    this.passwordInput = page.getByLabel(/^password$/i).first();
    this.confirmPasswordInput = page.getByLabel(/confirm password/i);
    this.fullNameInput = page.getByLabel(/full name|name/i);
    this.loginButton = page.getByRole('button', { name: /sign in|log in|login/i });
    this.signupButton = page.getByRole('button', { name: /sign up|create account|register/i });
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password|reset password/i });
    this.googleOAuthButton = page.getByRole('button', { name: /google/i });
    this.appleOAuthButton = page.getByRole('button', { name: /apple/i });
    this.linkedInOAuthButton = page.getByRole('button', { name: /linkedin/i });
    this.inviteCodeInput = page.getByLabel(/invite code|invitation code/i);
    this.toggleAuthModeLink = page.getByRole('link', { name: /sign up|log in|create account/i });
  }

  async navigateToAuth() {
    await this.goto('/auth');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.waitForPageLoad();
  }

  async signup(email: string, password: string, fullName?: string, inviteCode?: string) {
    // Switch to signup mode if needed
    const signupTab = this.page.getByRole('tab', { name: /sign up/i });
    if (await signupTab.isVisible()) {
      await signupTab.click();
    }

    if (inviteCode) {
      await this.inviteCodeInput.fill(inviteCode);
    }

    if (fullName) {
      await this.fullNameInput.fill(fullName);
    }

    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    
    if (await this.confirmPasswordInput.isVisible()) {
      await this.confirmPasswordInput.fill(password);
    }

    await this.signupButton.click();
    await this.waitForPageLoad();
  }

  async requestPasswordReset(email: string) {
    await this.forgotPasswordLink.click();
    await this.emailInput.fill(email);
    await this.clickButton('Send Reset Link');
    await this.waitForToast();
  }

  async expectLoggedIn() {
    // After login, user should be redirected away from /auth
    await expect(this.page).not.toHaveURL(/\/auth/);
    // Should see user menu or dashboard elements
    await this.waitForPageLoad();
  }

  async expectLoginError() {
    await expect(this.errorMessage).toBeVisible({ timeout: 10000 });
  }

  async expectAuthPage() {
    await expect(this.page).toHaveURL(/\/auth/);
  }
}
