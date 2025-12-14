# Testing Guide - The Quantum Club

## Overview

Comprehensive testing infrastructure with unit tests, E2E tests, integration tests, performance tests, security tests, and visual regression tests.

## Quick Start

```bash
# Unit tests
npm run test              # Run all unit tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
npm run test:ui           # Vitest UI

# E2E tests
npm run test:e2e          # Run all E2E tests
npm run test:e2e:ui       # Interactive mode
npm run test:e2e:debug    # Debug mode

# All tests
npm run test:all          # Unit + E2E
```

## Test Structure

```
tests/
├── e2e/                      # E2E test specs
│   ├── auth.spec.ts          # Authentication flows
│   ├── jobs.spec.ts          # Job browsing
│   ├── booking.spec.ts       # Booking system
│   ├── pipeline.spec.ts      # Hiring pipeline
│   ├── messages.spec.ts      # Messaging
│   ├── crm.spec.ts           # CRM workflows
│   └── navigation.spec.ts    # Navigation & accessibility
├── integration/              # Integration tests (Edge Functions)
│   ├── public-functions.spec.ts
│   ├── auth-functions.spec.ts
│   ├── ai-functions.spec.ts
│   ├── booking-functions.spec.ts
│   ├── crm-functions.spec.ts
│   ├── matching-functions.spec.ts
│   ├── notification-functions.spec.ts
│   ├── kpi-functions.spec.ts
│   ├── meeting-functions.spec.ts
│   ├── gdpr-functions.spec.ts
│   └── misc-functions.spec.ts
├── performance/              # Performance tests
│   ├── web-vitals.spec.ts    # Core Web Vitals
│   └── api-performance.spec.ts
├── security/                 # Security tests
│   ├── auth-security.spec.ts
│   ├── input-validation.spec.ts
│   └── rls-policies.spec.ts
├── visual/                   # Visual regression tests
│   ├── critical-pages.spec.ts
│   └── responsive.spec.ts
├── mocks/                    # Test mocks & fixtures
│   ├── handlers.ts           # MSW handlers
│   └── factories.ts          # Test data factories
└── snapshots/                # Visual regression baselines

src/
├── utils/__tests__/          # Utility unit tests
│   ├── urlHelpers.test.ts
│   ├── pipelineUtils.test.ts
│   ├── supabaseErrorMapper.test.ts
│   ├── oauthCsrfProtection.test.ts
│   ├── calendarLayout.test.ts
│   └── meetingStatus.test.ts
├── services/__tests__/       # Service unit tests
│   ├── memberApprovalService.test.ts
│   └── consentService.test.ts
└── hooks/__tests__/          # Hook unit tests
    ├── useAuth.test.ts
    ├── useApplications.test.ts
    ├── useJobs.test.ts
    └── useMeetings.test.ts
```

## Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| **Overall** | 85%+ | ~75% |
| **Critical Paths** | 90%+ | 85% |
| **Authentication** | 100% | 95% |
| **Core Business Logic** | 85%+ | 80% |
| **Edge Functions** | 80%+ | 75% |

## Test Categories

### Unit Tests (Vitest)

Fast, isolated tests for utilities, services, and hooks.

```bash
# Run specific test file
npm run test -- src/utils/__tests__/urlHelpers.test.ts

# Run tests matching pattern
npm run test -- --grep "URL"
```

### E2E Tests (Playwright)

Full browser-based tests for user flows.

```bash
# Run specific browser
npx playwright test --project=chromium

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Generate test
npx playwright codegen http://localhost:8080
```

### Integration Tests

Tests for edge functions and API endpoints.

```bash
npx playwright test tests/integration/
```

### Performance Tests

Core Web Vitals and API response time tests.

```bash
npx playwright test tests/performance/
```

### Security Tests

XSS, SQL injection, and RLS policy tests.

```bash
npx playwright test tests/security/
```

### Visual Regression Tests

Screenshot comparison tests for UI consistency.

```bash
# Update baselines
npx playwright test tests/visual/ --update-snapshots

# Compare against baselines
npx playwright test tests/visual/
```

## Test Data Factories

Use factories for consistent test data:

```typescript
import { createMockUser, createMockJob, createMockApplication } from 'tests/mocks/factories';

const user = createMockUser({ role: 'admin' });
const job = createMockJob({ status: 'published' });
const application = createMockApplication({ status: 'interview' });
```

## MSW Mocking

API mocking with Mock Service Worker:

```typescript
import { handlers } from 'tests/mocks/handlers';
import { setupServer } from 'msw/node';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests

Pipeline includes:
1. Unit tests with coverage
2. E2E tests (sharded across 3 workers)
3. Visual regression tests
4. Security tests
5. Performance tests

## Writing New Tests

### Unit Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('FeatureName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('scenario', () => {
    it('should behave as expected', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature', () => {
  test('should complete user flow', async ({ page }) => {
    await page.goto('/');
    await page.click('button');
    await expect(page.locator('h1')).toHaveText('Success');
  });
});
```

## Debugging Tests

### Unit Tests
```bash
npm run test -- --reporter=verbose
npm run test:ui  # Opens Vitest UI
```

### E2E Tests
```bash
npm run test:e2e:debug  # Opens Playwright Inspector
npx playwright test --headed  # See browser
npx playwright show-report  # View HTML report
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Naming**: Describe behavior, not implementation
3. **Assertions**: One logical assertion per test
4. **Data**: Use factories, not hardcoded values
5. **Cleanup**: Reset state in `beforeEach`/`afterEach`
6. **Performance**: Mock external dependencies
7. **Coverage**: Focus on critical paths first

## Troubleshooting

### Tests timeout
- Increase timeout in config
- Check for missing `await`
- Verify network mocks

### Flaky tests
- Add explicit waits
- Use `waitForLoadState('networkidle')`
- Check for race conditions

### Visual tests fail
- Update baselines with `--update-snapshots`
- Check viewport size consistency
- Verify fonts are loaded

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run test` | Run unit tests |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | With coverage |
| `npm run test:ui` | Vitest UI |
| `npm run test:e2e` | E2E tests |
| `npm run test:e2e:ui` | Playwright UI |
| `npm run test:e2e:debug` | Debug mode |
| `npm run test:all` | All tests |
