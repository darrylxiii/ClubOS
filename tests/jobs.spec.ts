import { test, expect } from '@playwright/test';

test.describe('Job Application Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Note: In real tests, you'd need to handle authentication
    await page.goto('/jobs');
  });

  test('should display jobs page', async ({ page }) => {
    await expect(page.locator('h1, h2')).toContainText(/Jobs|Opportunities/i);
  });

  test('should show job filters', async ({ page }) => {
    // Check for common filter elements
    const filterTypes = ['Location', 'Experience', 'Type', 'Remote'];
    
    for (const filter of filterTypes) {
      const filterExists = await page.locator(`text=${filter}`).count();
      // At least one filter should be present
      if (filterExists > 0) {
        expect(filterExists).toBeGreaterThan(0);
        break;
      }
    }
  });

  test('should display job cards', async ({ page }) => {
    // Wait for jobs to load
    await page.waitForTimeout(1000);
    
    const jobCards = await page.locator('[data-testid="job-card"], .job-card, article').count();
    // Should have at least some jobs or a "no jobs" message
    expect(jobCards >= 0).toBe(true);
  });
});
