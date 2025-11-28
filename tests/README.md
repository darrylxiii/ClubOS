# Test Suite Documentation

## Overview

This directory contains end-to-end (E2E) tests for The Quantum Club application using Playwright.

## Test Files

### `auth.spec.ts`
Tests authentication flows:
- Signup with new credentials
- Login with existing credentials
- Password reset flow
- Logout functionality

### `onboarding.spec.ts`
Tests candidate onboarding process:
- Profile information completion
- File uploads (CV, documents)
- Multi-step form navigation

### `jobs.spec.ts`
Tests job browsing and application:
- Job search and filtering
- Job detail viewing
- Application submission

### `meetings.spec.ts`
Tests meeting scheduling features:
- Meetings page access
- Booking link creation
- Calendar integration

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug specific test
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test tests/auth.spec.ts
```

## Configuration

Test configuration is in `playwright.config.ts`:
- Base URL: `http://localhost:5173`
- Browsers: Chromium, Firefox, WebKit
- Mobile: Chrome (Pixel 5), Safari (iPhone 12)
- Retries: 2 in CI, 0 locally
- Screenshots on failure
- Trace on first retry

## Writing New Tests

### Basic Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup code (login, navigate, etc.)
  });

  test('should do something', async ({ page }) => {
    // Test implementation
    await page.goto('/some-page');
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

### Best Practices

1. **Use data-testid attributes** for stable selectors
```typescript
await page.locator('[data-testid="job-card"]').click();
```

2. **Wait for navigation**
```typescript
await page.waitForURL(/\/expected-path/);
```

3. **Handle async operations**
```typescript
await page.waitForSelector('text=/loaded/i', { timeout: 5000 });
```

4. **Check element existence before interaction**
```typescript
if (await element.count() > 0) {
  await element.click();
}
```

5. **Use descriptive test names**
```typescript
test('should display validation error when email is invalid', async ({ page }) => {
  // ...
});
```

## Unit Tests

Unit tests are located in `src/` alongside their source files:
- `src/hooks/__tests__/` - Hook tests
- `src/services/__tests__/` - Service tests
- `src/utils/__tests__/` - Utility function tests

### Running Unit Tests
```bash
npm run test          # Run all unit tests
npm run test:ui       # Interactive UI
npm run test:coverage # With coverage report
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Main branch commits
- Manual workflow trigger

CI settings:
- Parallel execution disabled (`workers: 1`)
- 2 retries for flaky tests
- HTML report artifact uploaded on failure

## Troubleshooting

### Tests fail locally but pass in CI
- Clear browser cache: `npx playwright clean`
- Update browsers: `npx playwright install`

### Timeout errors
- Increase timeout in test: `{ timeout: 10000 }`
- Check network requests in headed mode

### Element not found
- Verify selector with Playwright Inspector
- Check if element is in viewport: `await element.scrollIntoViewIfNeeded()`

### Authentication issues
- Ensure test user exists in database
- Check auth cookie persistence

## Coverage Goals

| Area | Target |
|------|--------|
| Authentication | 100% |
| Core User Flows | 90% |
| Critical Features | 85% |
| Overall | 60% |

## Maintenance

- Review and update tests monthly
- Remove obsolete tests promptly
- Keep test data isolated
- Document breaking changes
