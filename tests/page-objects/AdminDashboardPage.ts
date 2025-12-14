import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin Dashboard Page Object Model
 * Handles admin-specific functionality and navigation
 */
export class AdminDashboardPage extends BasePage {
  readonly pendingApprovalsCard: Locator;
  readonly securityAlertsCard: Locator;
  readonly kpiSummaryCard: Locator;
  readonly activeMeetingsCard: Locator;
  readonly systemErrorsCard: Locator;
  readonly dealPipelineCard: Locator;
  readonly quickActionsSection: Locator;
  readonly memberManagementLink: Locator;
  readonly securityDashboardLink: Locator;
  readonly kpiCommandCenterLink: Locator;

  constructor(page: Page) {
    super(page);
    this.pendingApprovalsCard = page.locator('[data-testid="pending-approvals"], text=/pending.*approval/i').first();
    this.securityAlertsCard = page.locator('[data-testid="security-alerts"], text=/security.*alert/i').first();
    this.kpiSummaryCard = page.locator('[data-testid="kpi-summary"], text=/health.*score|kpi/i').first();
    this.activeMeetingsCard = page.locator('[data-testid="active-meetings"], text=/active.*meeting/i').first();
    this.systemErrorsCard = page.locator('[data-testid="system-errors"], text=/error/i').first();
    this.dealPipelineCard = page.locator('[data-testid="deal-pipeline"], text=/pipeline|deal/i').first();
    this.quickActionsSection = page.locator('[data-testid="quick-actions"], text=/quick.*action/i').first();
    this.memberManagementLink = page.locator('a[href*="member"], button:has-text("Member")').first();
    this.securityDashboardLink = page.locator('a[href*="security"], button:has-text("Security")').first();
    this.kpiCommandCenterLink = page.locator('a[href*="kpi"], button:has-text("KPI")').first();
  }

  async navigateToAdminHome() {
    await this.goto('/admin/home');
  }

  async navigateToMemberManagement() {
    await this.goto('/admin/member-management');
  }

  async navigateToSecurityDashboard() {
    await this.goto('/admin/security');
  }

  async navigateToKPICommandCenter() {
    await this.goto('/admin/kpi-command-center');
  }

  async navigateToEmployeeManagement() {
    await this.goto('/admin/employee-management');
  }

  async navigateToCompanyFees() {
    await this.goto('/admin/company-fees');
  }

  async expectAdminDashboard() {
    await expect(this.page).toHaveURL(/\/admin|\/home/);
    await this.waitForPageLoad();
  }

  async getPendingApprovalCount(): Promise<number> {
    const text = await this.pendingApprovalsCard.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async getSecurityAlertCount(): Promise<number> {
    const text = await this.securityAlertsCard.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async approveMember(memberEmail: string) {
    await this.navigateToMemberManagement();
    await this.page.fill('input[placeholder*="search"], input[type="search"]', memberEmail);
    await this.page.click(`button:has-text("Approve")`);
    await this.waitForToast();
  }

  async rejectMember(memberEmail: string, reason?: string) {
    await this.navigateToMemberManagement();
    await this.page.fill('input[placeholder*="search"], input[type="search"]', memberEmail);
    await this.page.click(`button:has-text("Reject")`);
    if (reason) {
      await this.page.fill('textarea', reason);
    }
    await this.page.click('button:has-text("Confirm")');
    await this.waitForToast();
  }

  async viewSecurityAlerts() {
    await this.securityAlertsCard.click();
    await this.waitForPageLoad();
  }

  async openKPIDetails(kpiName: string) {
    await this.page.click(`text=${kpiName}`);
    await expect(this.page.locator('[role="dialog"]')).toBeVisible();
  }
}
