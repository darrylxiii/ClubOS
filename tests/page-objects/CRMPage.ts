import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * CRM Page Object Model
 * Handles CRM pipeline, prospects, and deal management
 */
export class CRMPage extends BasePage {
  readonly pipelineKanban: Locator;
  readonly prospectCard: Locator;
  readonly stageColumn: Locator;
  readonly addProspectButton: Locator;
  readonly prospectNameInput: Locator;
  readonly prospectEmailInput: Locator;
  readonly companyNameInput: Locator;
  readonly saveProspectButton: Locator;
  readonly prospectDetailPanel: Locator;
  readonly activityLog: Locator;
  readonly addActivityButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pipelineKanban = page.locator('[data-testid="crm-kanban"]');
    this.prospectCard = page.locator('[data-testid="prospect-card"]');
    this.stageColumn = page.locator('[data-testid="crm-stage-column"]');
    this.addProspectButton = page.getByRole('button', { name: /add prospect|new prospect/i });
    this.prospectNameInput = page.getByLabel(/name/i);
    this.prospectEmailInput = page.getByLabel(/email/i);
    this.companyNameInput = page.getByLabel(/company/i);
    this.saveProspectButton = page.getByRole('button', { name: /save|create/i });
    this.prospectDetailPanel = page.locator('[data-testid="prospect-detail"]');
    this.activityLog = page.locator('[data-testid="activity-log"]');
    this.addActivityButton = page.getByRole('button', { name: /add activity|log activity/i });
  }

  async navigateToCRM() {
    await this.goto('/crm/prospects');
  }

  async expectCRMLoaded() {
    await this.waitForPageLoad();
    await expect(this.stageColumn.first()).toBeVisible({ timeout: 15000 });
  }

  async createProspect(data: { name: string; email: string; company?: string }) {
    await this.addProspectButton.click();
    await this.prospectNameInput.fill(data.name);
    await this.prospectEmailInput.fill(data.email);
    if (data.company) {
      await this.companyNameInput.fill(data.company);
    }
    await this.saveProspectButton.click();
    await this.waitForToast();
  }

  async clickProspect(index: number = 0) {
    await this.prospectCard.nth(index).click();
    await this.waitForPageLoad();
  }

  async dragProspectToStage(prospectIndex: number, targetStageIndex: number) {
    const prospect = this.prospectCard.nth(prospectIndex);
    const targetStage = this.stageColumn.nth(targetStageIndex);
    
    await prospect.dragTo(targetStage);
    await this.waitForPageLoad();
  }

  async logActivity(type: string, notes: string) {
    await this.addActivityButton.click();
    await this.page.getByLabel(/type/i).selectOption(type);
    await this.page.getByLabel(/notes/i).fill(notes);
    await this.clickButton('Save');
    await this.waitForToast();
  }

  async getProspectCountInStage(stageIndex: number): Promise<number> {
    const stage = this.stageColumn.nth(stageIndex);
    return await stage.locator('[data-testid="prospect-card"]').count();
  }

  async searchProspects(query: string) {
    await this.page.getByPlaceholder(/search/i).fill(query);
    await this.waitForPageLoad();
  }
}
