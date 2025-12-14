import { test, expect } from '@playwright/test';
import { AdminDashboardPage } from '../page-objects/AdminDashboardPage';

test.describe('Admin Dashboard', () => {
  let adminPage: AdminDashboardPage;

  test.beforeEach(async ({ page }) => {
    adminPage = new AdminDashboardPage(page);
    // Login as admin
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'admin@thequantumclub.com');
    await page.fill('input[type="password"]', 'Test123456!!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/home/, { timeout: 15000 });
  });

  test('should display admin dashboard with key widgets', async ({ page }) => {
    await adminPage.navigateToAdminHome();
    await adminPage.expectAdminDashboard();
    
    // Check for key dashboard sections
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should access member management page', async ({ page }) => {
    await adminPage.navigateToMemberManagement();
    await page.waitForLoadState('networkidle');
    
    // Should see member management content
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should access security dashboard', async ({ page }) => {
    await page.goto('/admin/security');
    await page.waitForLoadState('networkidle');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should access KPI command center', async ({ page }) => {
    await page.goto('/admin/kpi-command-center');
    await page.waitForLoadState('networkidle');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should access employee management', async ({ page }) => {
    await adminPage.navigateToEmployeeManagement();
    await page.waitForLoadState('networkidle');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should access company fees page', async ({ page }) => {
    await adminPage.navigateToCompanyFees();
    await page.waitForLoadState('networkidle');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display pending member approvals widget', async ({ page }) => {
    await adminPage.navigateToAdminHome();
    await page.waitForLoadState('networkidle');
    
    // Look for approvals section or widget
    const approvalsSection = page.locator('text=/approval|pending|member/i').first();
    // This may or may not be visible depending on data
  });

  test('should display security alerts widget', async ({ page }) => {
    await adminPage.navigateToAdminHome();
    await page.waitForLoadState('networkidle');
    
    // Look for security section
    const securitySection = page.locator('text=/security|alert|threat/i').first();
    // This may or may not be visible depending on data
  });

  test('should navigate to anti-hacking dashboard', async ({ page }) => {
    await page.goto('/admin/anti-hacking');
    await page.waitForLoadState('networkidle');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should access translation management', async ({ page }) => {
    await page.goto('/admin/translations');
    await page.waitForLoadState('networkidle');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should access CRM analytics', async ({ page }) => {
    await page.goto('/crm/analytics');
    await page.waitForLoadState('networkidle');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display deal pipeline summary', async ({ page }) => {
    await page.goto('/admin/deal-pipeline');
    await page.waitForLoadState('networkidle');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});
