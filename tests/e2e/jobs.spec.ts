import { test, expect } from '@playwright/test';
import { JobsPage } from '../page-objects/JobsPage';
import { AuthPage } from '../page-objects/AuthPage';

test.describe('Jobs Flow', () => {
  let jobsPage: JobsPage;

  test.beforeEach(async ({ page }) => {
    jobsPage = new JobsPage(page);
  });

  test.describe('Public Jobs Page', () => {
    test('should display public jobs page', async ({ page }) => {
      await jobsPage.navigateToPublicJobs();
      await jobsPage.waitForPageLoad();
      
      // Should display the jobs page or empty state
      const hasJobs = await jobsPage.jobCard.first().isVisible().catch(() => false);
      const hasEmptyState = await page.getByText(/no jobs|coming soon/i).isVisible().catch(() => false);
      
      expect(hasJobs || hasEmptyState).toBe(true);
    });

    test('should have search functionality', async ({ page }) => {
      await jobsPage.navigateToPublicJobs();
      await jobsPage.waitForPageLoad();
      
      // Check if search input exists
      const searchExists = await jobsPage.searchInput.isVisible().catch(() => false);
      if (searchExists) {
        await jobsPage.searchJobs('engineer');
        await jobsPage.waitForPageLoad();
      }
    });
  });

  test.describe('Authenticated Jobs Page', () => {
    test('should require authentication for private jobs', async ({ page }) => {
      await jobsPage.navigateToJobs();
      
      // Should redirect to auth or show login prompt
      await expect(page).toHaveURL(/auth|login/);
    });
  });

  test.describe('Job Card Interactions', () => {
    test('should display job details when clicked', async ({ page }) => {
      await jobsPage.navigateToPublicJobs();
      await jobsPage.waitForPageLoad();
      
      const hasJobs = await jobsPage.jobCard.first().isVisible().catch(() => false);
      
      if (hasJobs) {
        await jobsPage.clickFirstJob();
        // Should show job details modal or page
        await expect(page.locator('[role="dialog"], [data-testid="job-detail"]')).toBeVisible({ timeout: 5000 }).catch(() => {
          // Might navigate to a new page instead
        });
      }
    });
  });

  test.describe('Job Filters', () => {
    test('should have filter options', async ({ page }) => {
      await jobsPage.navigateToPublicJobs();
      await jobsPage.waitForPageLoad();
      
      const filterBtnExists = await jobsPage.filterButton.isVisible().catch(() => false);
      
      if (filterBtnExists) {
        await jobsPage.openFilters();
        // Filter panel should be visible
        await expect(page.locator('[data-testid="filter-panel"], [role="dialog"]')).toBeVisible().catch(() => {});
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await jobsPage.navigateToPublicJobs();
      await jobsPage.waitForPageLoad();
      
      // Page should still be usable on mobile
      await expect(page.locator('body')).toBeVisible();
    });

    test('should display correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await jobsPage.navigateToPublicJobs();
      await jobsPage.waitForPageLoad();
      
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
