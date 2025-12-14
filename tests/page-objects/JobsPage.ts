import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Jobs Page Object Model
 * Handles job browsing, filtering, and application flows
 */
export class JobsPage extends BasePage {
  readonly jobsList: Locator;
  readonly jobCard: Locator;
  readonly searchInput: Locator;
  readonly filterButton: Locator;
  readonly applyButton: Locator;
  readonly jobTitle: Locator;
  readonly jobDescription: Locator;
  readonly salaryRange: Locator;
  readonly locationFilter: Locator;
  readonly industryFilter: Locator;
  readonly createJobButton: Locator;

  constructor(page: Page) {
    super(page);
    this.jobsList = page.locator('[data-testid="jobs-list"]');
    this.jobCard = page.locator('[data-testid="job-card"]');
    this.searchInput = page.getByPlaceholder(/search jobs|find jobs/i);
    this.filterButton = page.getByRole('button', { name: /filter/i });
    this.applyButton = page.getByRole('button', { name: /apply|quick apply/i });
    this.jobTitle = page.locator('[data-testid="job-title"]');
    this.jobDescription = page.locator('[data-testid="job-description"]');
    this.salaryRange = page.locator('[data-testid="salary-range"]');
    this.locationFilter = page.getByLabel(/location/i);
    this.industryFilter = page.getByLabel(/industry/i);
    this.createJobButton = page.getByRole('button', { name: /create job|new job|post job/i });
  }

  async navigateToJobs() {
    await this.goto('/jobs');
  }

  async navigateToPublicJobs() {
    await this.goto('/public-jobs');
  }

  async searchJobs(query: string) {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.waitForPageLoad();
  }

  async openFilters() {
    await this.filterButton.click();
  }

  async filterByLocation(location: string) {
    await this.openFilters();
    await this.locationFilter.fill(location);
    await this.clickButton('Apply Filters');
    await this.waitForPageLoad();
  }

  async clickFirstJob() {
    await this.jobCard.first().click();
    await this.waitForPageLoad();
  }

  async applyToJob() {
    await this.applyButton.click();
    await this.waitForPageLoad();
  }

  async expectJobsListVisible() {
    await expect(this.jobCard.first()).toBeVisible({ timeout: 15000 });
  }

  async expectNoJobs() {
    await expect(this.page.getByText(/no jobs found|no results/i)).toBeVisible();
  }

  async getJobCount(): Promise<number> {
    return await this.jobCard.count();
  }

  async createJob(jobData: { title: string; description: string; location?: string }) {
    await this.createJobButton.click();
    await this.page.getByLabel(/title/i).fill(jobData.title);
    await this.page.getByLabel(/description/i).fill(jobData.description);
    if (jobData.location) {
      await this.page.getByLabel(/location/i).fill(jobData.location);
    }
    await this.clickButton('Create Job');
    await this.waitForToast();
  }
}
