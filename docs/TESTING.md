# Testing Guide

## Test Setup

### Prerequisites
```bash
npm install -D @playwright/test
npx playwright install
```

### Running Tests

**All tests:**
```bash
npm run test:e2e
```

**Specific test file:**
```bash
npx playwright test tests/auth.spec.ts
```

**Debug mode:**
```bash
npx playwright test --debug
```

**UI mode:**
```bash
npx playwright test --ui
```

## Test Structure

### E2E Tests (Playwright)

Located in `tests/` directory.

**Authentication Tests (`tests/auth.spec.ts`):**
- Login flow
- Signup flow
- Password reset
- OAuth providers
- Email verification
- MFA flow

**Social Feed Tests (`tests/social-feed.spec.ts`):**
- Post creation
- Post editing
- Post deletion
- Like/unlike
- Comments
- Feed filtering

**Job Application Tests (`tests/jobs.spec.ts`):**
- Browse jobs
- Filter jobs
- Apply to job
- Application tracking

### Unit Tests

**Running unit tests:**
```bash
npm run test:unit
```

**Writing unit tests:**
```typescript
import { describe, it, expect } from 'vitest';
import { validatePasswordStrength } from './passwordReset';

describe('validatePasswordStrength', () => {
  it('validates strong password', () => {
    const result = validatePasswordStrength('SecurePass123!');
    expect(result.valid).toBe(true);
  });
});
```

## Test Coverage Goals

- **Critical paths:** 90% coverage
- **Authentication:** 100% coverage
- **Payment flows:** 100% coverage
- **Core business logic:** 85% coverage

## Writing Good Tests

### DO:
- ✅ Test user journeys, not implementation details
- ✅ Use meaningful test descriptions
- ✅ Keep tests independent and isolated
- ✅ Use test data factories for consistent setup
- ✅ Clean up after tests (delete test users, etc.)

### DON'T:
- ❌ Don't test third-party libraries
- ❌ Don't rely on test execution order
- ❌ Don't use hardcoded waits (use waitFor instead)
- ❌ Don't test styling (use visual regression instead)

## Continuous Integration

Tests run automatically on:
- Every pull request
- Before deployment to staging
- Before deployment to production

Failed tests block deployment.

## Test Data Management

**Test users:**
```typescript
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  fullName: 'Test User'
};
```

**Cleanup:**
```typescript
test.afterEach(async () => {
  // Clean up test data
  await supabase.from('test_users').delete().eq('email', testUser.email);
});
```

## Debugging Failed Tests

1. Check test output logs
2. Review screenshot in `test-results/`
3. Run test with `--debug` flag
4. Check browser console logs
5. Verify test data setup
6. Check for race conditions

## Performance Testing

**Load testing with Artillery:**
```yaml
config:
  target: 'https://yourapp.com'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Browse jobs"
    flow:
      - get:
          url: "/jobs"
```

Run with:
```bash
artillery run load-test.yml
```
