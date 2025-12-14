import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Home/Dashboard Page Object Model
 * Handles the main dashboard for different user roles
 */
export class HomePage extends BasePage {
  readonly welcomeMessage: Locator;
  readonly quickActions: Locator;
  readonly statsCards: Locator;
  readonly navigationSidebar: Locator;
  readonly userMenu: Locator;
  readonly notificationsButton: Locator;

  constructor(page: Page) {
    super(page);
    this.welcomeMessage = page.locator('h1, h2').filter({ hasText: /welcome|dashboard|home/i });
    this.quickActions = page.locator('[data-testid="quick-actions"]');
    this.statsCards = page.locator('[data-testid="stats-card"]');
    this.navigationSidebar = page.locator('nav, aside').first();
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.notificationsButton = page.getByRole('button', { name: /notifications/i });
  }

  async navigateToHome() {
    await this.goto('/home');
  }

  async expectDashboardLoaded() {
    await this.waitForPageLoad();
    await this.waitForNoLoading();
    // Check for common dashboard elements
    await expect(this.navigationSidebar).toBeVisible();
  }

  async navigateToSection(section: string) {
    await this.page.getByRole('link', { name: new RegExp(section, 'i') }).click();
    await this.waitForPageLoad();
  }

  async openUserMenu() {
    await this.userMenu.click();
  }

  async logout() {
    await this.openUserMenu();
    await this.page.getByRole('menuitem', { name: /log out|sign out/i }).click();
    await this.waitForPageLoad();
  }

  async expectStatsVisible() {
    await expect(this.statsCards.first()).toBeVisible();
  }
}
