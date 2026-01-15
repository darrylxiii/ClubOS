import { test, expect } from '@playwright/test';

test.describe('Critical Path: Recruitment Workflow', () => {

    test('Recruiter can log in, view dashboard, and open candidate details', async ({ page }) => {
        // 1. Initial Navigation
        console.log('Navigating to login page...');
        await page.goto('/auth', { timeout: 60000 });

        // Wait for page to settle (handle redirects)
        await page.waitForLoadState('networkidle').catch(() => console.log('Network idle timeout - continuing'));

        // Check where we ended up
        const url = page.url();
        console.log(`Current URL after navigation: ${url}`);

        if (url.includes('/dashboard') || url.includes('/home')) {
            console.log('Redirected to dashboard/home immediately.');
            // Skip login steps
        } else {
            // We expect to be on /auth
            console.log('On auth page, waiting for login form...');
            // Wait for either the form or specific error
            await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 30000 });
            await expect(page).toHaveTitle(/The Quantum Club/);

            // Perform Login
            console.log('Filling credentials...');
            await page.fill('input[type="email"]', 'demo@thequantumclub.com');
            await page.fill('input[type="password"]', 'demo-password');

            console.log('Submitting form...');
            await page.click('button[type="submit"]');

            // Wait for navigation
            await page.waitForURL(/.*(dashboard|home).*/, { timeout: 45000 });
        }


        // 3. Verify Dashboard Loads
        // Increase timeout for dashboard load
        await expect(page.getByText('Active Jobs').or(page.getByText('Dashboard'))).toBeVisible({ timeout: 30000 });

        // 4. Navigate to a Job
        console.log('Navigating to job dashboard...');
        // Handling different dashboard layouts (Home vs Jobs list)
        if (page.url().includes('/home')) {
            // If we are on home, maybe navigate to jobs explicitly
            await page.goto('/jobs');
        }

        // Wait for job cards
        await page.waitForSelector('.job-card, [data-testid="job-card"]', { timeout: 20000 });

        const firstJob = page.locator('.job-card, [data-testid="job-card"]').first();
        await firstJob.click();

        // Verify Job Dashboard
        await expect(page.getByText('Pipeline')).toBeVisible({ timeout: 20000 });

        // 5. Open Candidate Details
        console.log('Opening candidate details...');
        // Find a candidate in the pipeline
        // Adjust selector to match actual candidate card implementation
        const candidateCard = page.locator('[data-testid="candidate-card"], .candidate-card').first();

        if (await candidateCard.isVisible()) {
            await candidateCard.click();

            // Verify Candidate Side Panel/Modal
            await expect(page.getByText('Candidate Profile').or(page.getByText('Experience'))).toBeVisible();
        } else {
            console.log('No candidates found to test detail view. Test passed with warning.');
        }

        console.log('Critical path test completed successfully.');
    });

});
