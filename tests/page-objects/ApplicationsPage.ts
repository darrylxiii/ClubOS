import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Applications Page Object Model
 * Handles job applications management
 */
export class ApplicationsPage extends BasePage {
  readonly applicationsHeader: Locator;
  readonly applicationsList: Locator;
  readonly applicationCard: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly sortSelect: Locator;
  
  // Application detail
  readonly applicationDetail: Locator;
  readonly applicationStatus: Locator;
  readonly companyName: Locator;
  readonly jobTitle: Locator;
  readonly appliedDate: Locator;
  readonly withdrawButton: Locator;
  readonly viewJobButton: Locator;
  
  // Pipeline stages
  readonly pipelineStages: Locator;
  readonly currentStage: Locator;

  constructor(page: Page) {
    super(page);
    this.applicationsHeader = page.locator('h1:has-text("Applications"), [data-testid="applications-header"]').first();
    this.applicationsList = page.locator('[data-testid="applications-list"], .applications-list').first();
    this.applicationCard = page.locator('[data-testid="application-card"], .application-card');
    this.searchInput = page.getByPlaceholder(/search/i);
    this.statusFilter = page.locator('[data-testid="status-filter"], select').first();
    this.sortSelect = page.locator('[data-testid="sort-select"]');
    
    this.applicationDetail = page.locator('[data-testid="application-detail"]');
    this.applicationStatus = page.locator('[data-testid="application-status"], .status-badge').first();
    this.companyName = page.locator('[data-testid="company-name"]');
    this.jobTitle = page.locator('[data-testid="job-title"]');
    this.appliedDate = page.locator('[data-testid="applied-date"]');
    this.withdrawButton = page.getByRole('button', { name: /withdraw/i });
    this.viewJobButton = page.getByRole('button', { name: /view.*job/i });
    
    this.pipelineStages = page.locator('[data-testid="pipeline-stages"]');
    this.currentStage = page.locator('[data-testid="current-stage"], .current-stage');
  }

  async navigateToApplications() {
    await this.goto('/applications');
  }

  async navigateToMyApplications() {
    await this.goto('/my-applications');
  }

  async expectApplicationsPage() {
    await expect(this.page).toHaveURL(/application/);
    await this.waitForPageLoad();
  }

  async getApplicationCount(): Promise<number> {
    return this.applicationCard.count();
  }

  async searchApplications(query: string) {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.waitForPageLoad();
  }

  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
    await this.waitForPageLoad();
  }

  async openApplication(jobTitle: string) {
    const card = this.applicationCard.filter({ hasText: jobTitle }).first();
    await card.click();
    await this.waitForPageLoad();
  }

  async withdrawApplication() {
    await this.withdrawButton.click();
    // Confirm withdrawal dialog
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    await this.waitForToast();
  }

  async getApplicationStatus(): Promise<string> {
    return this.applicationStatus.textContent() || '';
  }

  async getCurrentStage(): Promise<string> {
    return this.currentStage.textContent() || '';
  }

  async viewJobDetails() {
    await this.viewJobButton.click();
    await this.waitForPageLoad();
  }

  async expectApplicationWithdrawn() {
    await expect(this.applicationStatus).toContainText(/withdrawn/i);
  }

  async expectNoApplications() {
    const emptyState = this.page.locator('text=/no applications|haven\'t applied/i');
    await expect(emptyState).toBeVisible();
  }

  async getApplicationDetails(index: number = 0): Promise<{
    jobTitle: string;
    company: string;
    status: string;
  }> {
    const card = this.applicationCard.nth(index);
    return {
      jobTitle: await card.locator('[data-testid="job-title"], h3, h4').first().textContent() || '',
      company: await card.locator('[data-testid="company-name"]').textContent() || '',
      status: await card.locator('[data-testid="status"], .status').textContent() || '',
    };
  }
}
