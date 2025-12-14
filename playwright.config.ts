import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Testing Configuration for The Quantum Club
 * See https://playwright.dev/docs/test-configuration
 * 
 * Run all tests: npx playwright test
 * Run specific file: npx playwright test tests/e2e/auth.spec.ts
 * Run with UI: npx playwright test --ui
 * Debug mode: npx playwright test --debug
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter configuration */
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],
  
  /* Global timeout settings */
  timeout: 30000,
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },
  
  /* Shared settings for all projects */
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  /* Configure projects for major browsers and viewports */
  projects: [
    /* Desktop browsers */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    /* Mobile viewports */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    
    /* Tablet viewport */
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro 11'] },
    },
  ],

  /* Output directory for test artifacts */
  outputDir: 'test-results/',
  
  /* Snapshot directory for visual regression tests */
  snapshotDir: './tests/snapshots',

  /* Run local dev server before starting tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
