import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Pipeline/Kanban Page Object Model
 * Handles candidate pipeline management and stage transitions
 */
export class PipelinePage extends BasePage {
  readonly pipelineBoard: Locator;
  readonly stageColumn: Locator;
  readonly candidateCard: Locator;
  readonly addCandidateButton: Locator;
  readonly stageHeader: Locator;
  readonly candidateName: Locator;
  readonly moveToNextStageButton: Locator;
  readonly rejectButton: Locator;
  readonly candidateDetailModal: Locator;

  constructor(page: Page) {
    super(page);
    this.pipelineBoard = page.locator('[data-testid="pipeline-board"]');
    this.stageColumn = page.locator('[data-testid="stage-column"]');
    this.candidateCard = page.locator('[data-testid="candidate-card"]');
    this.addCandidateButton = page.getByRole('button', { name: /add candidate/i });
    this.stageHeader = page.locator('[data-testid="stage-header"]');
    this.candidateName = page.locator('[data-testid="candidate-name"]');
    this.moveToNextStageButton = page.getByRole('button', { name: /advance|move|next stage/i });
    this.rejectButton = page.getByRole('button', { name: /reject/i });
    this.candidateDetailModal = page.locator('[data-testid="candidate-detail-modal"]');
  }

  async navigateToPipeline(jobId?: string) {
    if (jobId) {
      await this.goto(`/jobs/${jobId}/pipeline`);
    } else {
      await this.goto('/pipeline');
    }
  }

  async expectPipelineLoaded() {
    await this.waitForPageLoad();
    await expect(this.stageColumn.first()).toBeVisible({ timeout: 15000 });
  }

  async getCandidateCountInStage(stageIndex: number): Promise<number> {
    const stage = this.stageColumn.nth(stageIndex);
    return await stage.locator('[data-testid="candidate-card"]').count();
  }

  async clickCandidateCard(index: number = 0) {
    await this.candidateCard.nth(index).click();
    await this.waitForPageLoad();
  }

  async advanceCandidate() {
    await this.moveToNextStageButton.click();
    await this.waitForToast();
  }

  async rejectCandidate() {
    await this.rejectButton.click();
    await this.page.getByRole('button', { name: /confirm|yes/i }).click();
    await this.waitForToast();
  }

  async dragCandidateToStage(candidateIndex: number, targetStageIndex: number) {
    const candidate = this.candidateCard.nth(candidateIndex);
    const targetStage = this.stageColumn.nth(targetStageIndex);
    
    await candidate.dragTo(targetStage);
    await this.waitForPageLoad();
  }

  async getStageNames(): Promise<string[]> {
    const stages = await this.stageHeader.allTextContents();
    return stages;
  }

  async expectCandidateInStage(candidateName: string, stageIndex: number) {
    const stage = this.stageColumn.nth(stageIndex);
    await expect(stage.getByText(candidateName)).toBeVisible();
  }
}
