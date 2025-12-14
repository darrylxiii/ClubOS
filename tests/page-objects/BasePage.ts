import { Page, Locator, expect } from '@playwright/test';

/**
 * Base Page Object Model
 * Contains common methods and selectors used across all pages
 */
export class BasePage {
  readonly page: Page;
  readonly loadingSpinner: Locator;
  readonly toast: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"], .animate-spin');
    this.toast = page.locator('[data-sonner-toast]');
    this.errorMessage = page.locator('[role="alert"]');
  }

  async goto(path: string) {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForToast(message?: string) {
    if (message) {
      await expect(this.toast.filter({ hasText: message })).toBeVisible({ timeout: 10000 });
    } else {
      await expect(this.toast.first()).toBeVisible({ timeout: 10000 });
    }
  }

  async waitForNoLoading() {
    await expect(this.loadingSpinner).toBeHidden({ timeout: 15000 });
  }

  async clickButton(text: string) {
    await this.page.getByRole('button', { name: text }).click();
  }

  async fillInput(label: string, value: string) {
    await this.page.getByLabel(label).fill(value);
  }

  async selectOption(label: string, value: string) {
    await this.page.getByLabel(label).selectOption(value);
  }

  async expectUrl(path: string | RegExp) {
    await expect(this.page).toHaveURL(path);
  }

  async expectVisible(text: string) {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  async expectHidden(text: string) {
    await expect(this.page.getByText(text)).toBeHidden();
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png` });
  }
}
