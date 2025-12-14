import { chromium, FullConfig } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

/**
 * Global Setup for Playwright E2E Tests
 * Runs once before all tests to set up authentication states
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  
  // Create authenticated sessions for each role
  for (const [role, credentials] of Object.entries(testUsers)) {
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // Navigate to auth page
      await page.goto(`${baseURL}/auth`);
      await page.waitForLoadState('networkidle');
      
      // Attempt login
      await page.fill('input[type="email"]', credentials.email);
      await page.fill('input[type="password"]', credentials.password);
      await page.click('button[type="submit"]');
      
      // Wait for successful login redirect
      await page.waitForURL(/\/(home|dashboard|onboarding)/, { timeout: 15000 }).catch(() => {
        console.log(`Note: ${role} login may require account setup`);
      });
      
      // Save authentication state
      await context.storageState({ path: `tests/.auth/${role}.json` });
      
      await context.close();
      console.log(`✓ Created auth state for ${role}`);
    } catch (error) {
      console.log(`⚠ Could not create auth state for ${role} - tests will use unauthenticated flow`);
    }
  }
  
  await browser.close();
}

export default globalSetup;
