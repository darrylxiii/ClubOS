import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Onboarding Page Object Model
 * Handles the multi-step candidate onboarding flow
 */
export class OnboardingPage extends BasePage {
  readonly stepIndicator: Locator;
  readonly currentStepTitle: Locator;
  readonly nextButton: Locator;
  readonly previousButton: Locator;
  readonly skipButton: Locator;
  readonly progressBar: Locator;
  
  // Step-specific elements
  readonly jobTitleInput: Locator;
  readonly dreamJobInput: Locator;
  readonly salaryRangeMin: Locator;
  readonly salaryRangeMax: Locator;
  readonly workPreferenceOptions: Locator;
  readonly resumeUploadInput: Locator;
  readonly completeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.stepIndicator = page.locator('[data-testid="step-indicator"], .step-indicator');
    this.currentStepTitle = page.locator('h1, h2').first();
    this.nextButton = page.getByRole('button', { name: /next|continue/i });
    this.previousButton = page.getByRole('button', { name: /previous|back/i });
    this.skipButton = page.getByRole('button', { name: /skip/i });
    this.progressBar = page.locator('[role="progressbar"], .progress-bar');
    
    this.jobTitleInput = page.getByLabel(/current.*job.*title|job.*title/i);
    this.dreamJobInput = page.getByLabel(/dream.*job|ideal.*role/i);
    this.salaryRangeMin = page.getByLabel(/minimum.*salary|salary.*min/i);
    this.salaryRangeMax = page.getByLabel(/maximum.*salary|salary.*max/i);
    this.workPreferenceOptions = page.locator('[data-testid="work-preference"], input[type="checkbox"], input[type="radio"]');
    this.resumeUploadInput = page.locator('input[type="file"]');
    this.completeButton = page.getByRole('button', { name: /complete|finish|get started/i });
  }

  async navigateToOnboarding() {
    await this.goto('/onboarding');
  }

  async navigateToOAuthOnboarding() {
    await this.goto('/oauth-onboarding');
  }

  async expectOnboardingPage() {
    await expect(this.page).toHaveURL(/onboarding/);
  }

  async getCurrentStep(): Promise<number> {
    const text = await this.stepIndicator.textContent() || '';
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  }

  async goToNextStep() {
    await this.nextButton.click();
    await this.waitForPageLoad();
  }

  async goToPreviousStep() {
    await this.previousButton.click();
    await this.waitForPageLoad();
  }

  async skipCurrentStep() {
    if (await this.skipButton.isVisible()) {
      await this.skipButton.click();
      await this.waitForPageLoad();
    }
  }

  async fillJobTitle(title: string) {
    await this.jobTitleInput.fill(title);
  }

  async fillDreamJob(dreamJob: string) {
    await this.dreamJobInput.fill(dreamJob);
  }

  async fillSalaryRange(min: number, max: number) {
    if (await this.salaryRangeMin.isVisible()) {
      await this.salaryRangeMin.fill(min.toString());
    }
    if (await this.salaryRangeMax.isVisible()) {
      await this.salaryRangeMax.fill(max.toString());
    }
  }

  async selectWorkPreference(preference: string) {
    const option = this.page.locator(`text=${preference}`).first();
    if (await option.isVisible()) {
      await option.click();
    }
  }

  async uploadResume(filePath: string) {
    await this.resumeUploadInput.setInputFiles(filePath);
    await this.waitForPageLoad();
  }

  async completeOnboarding() {
    await this.completeButton.click();
    await this.waitForPageLoad();
  }

  async completeFullOnboarding(data: {
    jobTitle?: string;
    dreamJob?: string;
    salaryMin?: number;
    salaryMax?: number;
    workPreference?: string;
  }) {
    // Step 1: Job title
    if (data.jobTitle && await this.jobTitleInput.isVisible()) {
      await this.fillJobTitle(data.jobTitle);
      await this.goToNextStep();
    }

    // Step 2: Dream job
    if (data.dreamJob && await this.dreamJobInput.isVisible()) {
      await this.fillDreamJob(data.dreamJob);
      await this.goToNextStep();
    }

    // Step 3: Salary range
    if (data.salaryMin && data.salaryMax) {
      await this.fillSalaryRange(data.salaryMin, data.salaryMax);
      await this.goToNextStep();
    }

    // Step 4: Work preferences
    if (data.workPreference) {
      await this.selectWorkPreference(data.workPreference);
      await this.goToNextStep();
    }

    // Complete
    if (await this.completeButton.isVisible()) {
      await this.completeOnboarding();
    }
  }

  async expectOnboardingComplete() {
    // Should redirect to home or show completion message
    await expect(this.page).toHaveURL(/\/(home|dashboard)/);
  }
}
