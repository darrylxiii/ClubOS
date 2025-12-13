# Phase 1: Testing Infrastructure Implementation Plan

## Executive Summary

This plan outlines the comprehensive testing infrastructure required to achieve $1B enterprise readiness. Current test coverage is at **~40%** with only 5 test files. Target: **85%+ coverage** on critical paths.

---

## 1. Current State Assessment

### Existing Infrastructure
- **Unit Tests**: Vitest configured with jsdom environment
- **E2E Tests**: Playwright configured for 5 browsers (Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari)
- **Test Files**: 5 total
  - `src/hooks/__tests__/useProfile.test.ts`
  - `src/services/__tests__/sessionTracking.test.ts`
  - `src/utils/__tests__/errorHandling.test.ts`
  - `src/test/setup.ts` (test setup)
  - `tests/README.md` (documentation)

### Critical Gaps
| Area | Current | Target | Gap |
|------|---------|--------|-----|
| Unit Test Coverage | ~5% | 80% | 75% |
| E2E Test Coverage | ~0% | 90% critical paths | 90% |
| Integration Tests | 0% | 70% | 70% |
| Performance Tests | 0% | Key flows benchmarked | 100% |
| Security Tests | 0% | OWASP Top 10 | 100% |

---

## 2. Testing Pyramid Strategy

```
                    ┌─────────────┐
                    │   E2E (10%) │  ← Critical user journeys
                    ├─────────────┤
                    │Integration  │  ← API, Database, Auth
                    │   (20%)     │
                    ├─────────────┤
                    │             │
                    │  Unit Tests │  ← Components, Hooks, Utils
                    │   (70%)     │
                    │             │
                    └─────────────┘
```

---

## 3. Unit Testing Infrastructure

### 3.1 Priority Components to Test

#### Tier 1: Authentication & Security (Week 1)
```
src/contexts/AuthContext.tsx
src/components/ProtectedRoute.tsx
src/hooks/useAuth.ts
src/services/authService.ts
src/utils/oauthCsrfProtection.ts
src/utils/securityTracking.ts
```

#### Tier 2: Core Business Logic (Week 2)
```
src/hooks/useProfile.ts
src/hooks/useApplications.ts
src/hooks/useJobs.ts
src/hooks/useCandidates.ts
src/hooks/useCompanyData.ts
src/services/applicationService.ts
src/services/jobService.ts
src/services/candidateService.ts
```

#### Tier 3: Meeting & Communication (Week 3)
```
src/hooks/useMeetings.ts
src/hooks/useWebRTC.ts
src/hooks/useConversations.ts
src/services/meetingService.ts
src/services/messagingService.ts
```

#### Tier 4: CRM & Pipeline (Week 4)
```
src/hooks/useCRMProspects.ts
src/hooks/useDealPipeline.ts
src/hooks/useRevenueMetrics.ts
src/services/crmService.ts
src/services/pipelineService.ts
```

#### Tier 5: Payments & Time Tracking (Week 5)
```
src/hooks/useTimeTracking.ts
src/hooks/useCommissions.ts
src/hooks/useReferralEarnings.ts
src/services/timeTrackingService.ts
src/services/paymentService.ts
```

### 3.2 Test File Structure

```
src/
├── __tests__/                    # Global test utilities
│   ├── mocks/
│   │   ├── supabaseMock.ts      # Supabase client mock
│   │   ├── authMock.ts          # Auth context mock
│   │   ├── routerMock.ts        # Router mock
│   │   └── testData.ts          # Reusable test fixtures
│   └── utils/
│       ├── renderWithProviders.tsx
│       └── testHelpers.ts
├── components/
│   └── __tests__/               # Component tests
├── hooks/
│   └── __tests__/               # Hook tests
├── services/
│   └── __tests__/               # Service tests
└── utils/
    └── __tests__/               # Utility tests
```

### 3.3 Unit Test Template

```typescript
// Example: src/hooks/__tests__/useApplications.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApplications } from '../useApplications';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockApplications, error: null }),
    })),
  },
}));

const mockApplications = [
  { id: '1', status: 'applied', job_id: 'job-1', created_at: '2024-01-01' },
  { id: '2', status: 'interview', job_id: 'job-2', created_at: '2024-01-02' },
];

describe('useApplications', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches applications successfully', async () => {
    const { result } = renderHook(() => useApplications('user-1'), { wrapper });
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('handles fetch error gracefully', async () => {
    // Test error handling
  });

  it('filters by status correctly', async () => {
    // Test filtering logic
  });
});
```

---

## 4. E2E Testing Infrastructure

### 4.1 Critical User Journeys

#### Journey 1: Authentication Flow (Priority: Critical)
```typescript
// tests/e2e/auth.spec.ts
test.describe('Authentication', () => {
  test('complete signup flow', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.click('[data-testid="signup-button"]');
    await expect(page).toHaveURL('/oauth-onboarding');
  });

  test('login with valid credentials', async ({ page }) => {
    // Login test
  });

  test('password reset flow', async ({ page }) => {
    // Password reset test
  });

  test('OAuth Google login', async ({ page }) => {
    // OAuth test (mocked)
  });

  test('logout clears session', async ({ page }) => {
    // Logout test
  });
});
```

#### Journey 2: Candidate Onboarding (Priority: Critical)
```typescript
// tests/e2e/onboarding.spec.ts
test.describe('Candidate Onboarding', () => {
  test('complete profile setup', async ({ page }) => {
    await authenticateAsCandidate(page);
    await page.goto('/oauth-onboarding');
    
    // Step 1: Basic info
    await page.fill('[data-testid="job-title"]', 'Software Engineer');
    await page.click('[data-testid="next-step"]');
    
    // Step 2: Preferences
    await page.selectOption('[data-testid="salary-range"]', '100k-150k');
    await page.click('[data-testid="next-step"]');
    
    // Complete onboarding
    await page.click('[data-testid="complete-onboarding"]');
    await expect(page).toHaveURL('/home');
  });
});
```

#### Journey 3: Job Application Flow (Priority: Critical)
```typescript
// tests/e2e/job-application.spec.ts
test.describe('Job Application', () => {
  test('browse and apply to job', async ({ page }) => {
    await authenticateAsCandidate(page);
    await page.goto('/jobs');
    
    // Browse jobs
    await page.click('[data-testid="job-card-0"]');
    await expect(page.locator('[data-testid="job-details"]')).toBeVisible();
    
    // Apply
    await page.click('[data-testid="apply-button"]');
    await page.fill('[data-testid="cover-letter"]', 'I am interested...');
    await page.click('[data-testid="submit-application"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('track application status', async ({ page }) => {
    // Application tracking test
  });
});
```

#### Journey 4: Partner Pipeline Management (Priority: High)
```typescript
// tests/e2e/pipeline.spec.ts
test.describe('Pipeline Management', () => {
  test('view and manage candidates in pipeline', async ({ page }) => {
    await authenticateAsPartner(page);
    await page.goto('/jobs/job-1/pipeline');
    
    // View pipeline stages
    await expect(page.locator('[data-testid="pipeline-stage"]')).toHaveCount(5);
    
    // Move candidate between stages
    await page.dragAndDrop('[data-testid="candidate-card-0"]', '[data-testid="stage-interview"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });
});
```

#### Journey 5: Meeting Scheduling & Joining (Priority: High)
```typescript
// tests/e2e/meetings.spec.ts
test.describe('Meetings', () => {
  test('schedule interview meeting', async ({ page }) => {
    await authenticateAsPartner(page);
    await page.goto('/meetings/schedule');
    
    await page.fill('[data-testid="meeting-title"]', 'Technical Interview');
    await page.click('[data-testid="date-picker"]');
    await page.click('[data-testid="time-slot-10am"]');
    await page.click('[data-testid="schedule-button"]');
    
    await expect(page.locator('[data-testid="meeting-created-toast"]')).toBeVisible();
  });

  test('join meeting room', async ({ page }) => {
    // Meeting join test (WebRTC mocked)
  });
});
```

#### Journey 6: CRM Lead Management (Priority: High)
```typescript
// tests/e2e/crm.spec.ts
test.describe('CRM', () => {
  test('move prospect through pipeline', async ({ page }) => {
    await authenticateAsAdmin(page);
    await page.goto('/crm/prospects');
    
    // View Kanban
    await expect(page.locator('[data-testid="crm-kanban"]')).toBeVisible();
    
    // Move prospect
    await page.dragAndDrop('[data-testid="prospect-card-0"]', '[data-testid="stage-qualified"]');
    
    await expect(page.locator('[data-testid="stage-updated-toast"]')).toBeVisible();
  });
});
```

### 4.2 E2E Test Helpers

```typescript
// tests/helpers/auth.ts
export async function authenticateAsCandidate(page: Page) {
  await page.goto('/auth');
  await page.fill('[data-testid="email-input"]', 'candidate@test.com');
  await page.fill('[data-testid="password-input"]', 'TestPass123!');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/home');
}

export async function authenticateAsPartner(page: Page) {
  // Partner auth
}

export async function authenticateAsAdmin(page: Page) {
  // Admin auth
}

// tests/helpers/database.ts
export async function seedTestData() {
  // Create test users, jobs, applications
}

export async function cleanupTestData() {
  // Remove test data after tests
}
```

---

## 5. Integration Testing

### 5.1 Edge Function Tests

```typescript
// tests/integration/edge-functions.spec.ts
import { createClient } from '@supabase/supabase-js';

describe('Edge Functions', () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  test('ml-match-candidates returns valid scores', async () => {
    const { data, error } = await supabase.functions.invoke('ml-match-candidates', {
      body: { jobId: 'test-job', candidateIds: ['c1', 'c2'] },
    });
    
    expect(error).toBeNull();
    expect(data.matches).toHaveLength(2);
    expect(data.matches[0].score).toBeGreaterThanOrEqual(0);
    expect(data.matches[0].score).toBeLessThanOrEqual(100);
  });

  test('send-booking-confirmation sends email', async () => {
    // Email function test
  });

  test('sync-instantly-campaigns syncs data', async () => {
    // CRM sync test
  });
});
```

### 5.2 Database RLS Tests

```typescript
// tests/integration/rls-policies.spec.ts
describe('Row Level Security', () => {
  test('candidates can only see their own applications', async () => {
    const candidateClient = createAuthenticatedClient('candidate@test.com');
    
    const { data } = await candidateClient
      .from('applications')
      .select('*');
    
    // Should only return candidate's own applications
    expect(data.every(app => app.user_id === CANDIDATE_USER_ID)).toBe(true);
  });

  test('partners can only see their company candidates', async () => {
    // Partner RLS test
  });

  test('admins have full access', async () => {
    // Admin RLS test
  });
});
```

---

## 6. Performance Testing

### 6.1 Load Testing with k6

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up
    { duration: '3m', target: 50 },   // Steady state
    { duration: '1m', target: 100 },  // Peak load
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
  },
};

export default function () {
  // Test job listing endpoint
  const jobsRes = http.get('https://app.thequantumclub.com/api/jobs');
  check(jobsRes, {
    'jobs status is 200': (r) => r.status === 200,
    'jobs response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### 6.2 Core Web Vitals Benchmarks

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| LCP | 7.8s | <2.5s | Lighthouse CI |
| FID | N/A | <100ms | Web Vitals |
| CLS | N/A | <0.1 | Lighthouse CI |
| FCP | 4.6s | <1.8s | Lighthouse CI |
| TTI | 8.0s | <3.8s | Lighthouse CI |

---

## 7. Security Testing

### 7.1 OWASP Top 10 Coverage

| Vulnerability | Test Type | Tool |
|--------------|-----------|------|
| Injection | Automated | SQLMap, Custom |
| Broken Auth | E2E | Playwright |
| Sensitive Data | Manual + Automated | Custom |
| XXE | Automated | OWASP ZAP |
| Broken Access | E2E + Integration | Custom |
| Misconfig | Automated | Security Scanner |
| XSS | E2E | Playwright + ZAP |
| Deserialization | Automated | Custom |
| Components | Automated | npm audit, Snyk |
| Logging | Manual | Audit |

### 7.2 Security Test Examples

```typescript
// tests/security/auth-security.spec.ts
describe('Authentication Security', () => {
  test('rate limiting prevents brute force', async () => {
    for (let i = 0; i < 10; i++) {
      await attemptLogin('test@example.com', 'wrongpassword');
    }
    
    const response = await attemptLogin('test@example.com', 'wrongpassword');
    expect(response.status).toBe(429); // Too Many Requests
  });

  test('session tokens expire correctly', async () => {
    // Session expiry test
  });

  test('CSRF protection is enforced', async () => {
    // CSRF test
  });
});
```

---

## 8. CI/CD Integration

### 8.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run npm audit
        run: npm audit --audit-level=high
      
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  lighthouse:
    runs-on: ubuntu-latest
    needs: e2e-tests
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            https://staging.thequantumclub.com/
            https://staging.thequantumclub.com/jobs
            https://staging.thequantumclub.com/auth
          budgetPath: ./lighthouse-budget.json
```

### 8.2 Pre-commit Hooks

```json
// package.json (conceptual - scripts section)
{
  "scripts": {
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:unit:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:all": "npm run test:unit && npm run test:e2e",
    "test:ci": "npm run test:unit:coverage && npm run test:e2e"
  }
}
```

### 8.3 Quality Gates

| Gate | Threshold | Blocking |
|------|-----------|----------|
| Unit Test Coverage | ≥80% | Yes |
| E2E Tests Passing | 100% | Yes |
| Security Vulnerabilities | 0 High/Critical | Yes |
| Lighthouse Performance | ≥70 | No (Warning) |
| Lighthouse Accessibility | ≥90 | Yes |
| Bundle Size | <2MB | No (Warning) |

---

## 9. Implementation Timeline

### Week 1: Foundation
- [ ] Set up test utilities and mocks
- [ ] Create authentication test suite (unit + E2E)
- [ ] Configure CI/CD pipeline
- [ ] Set up code coverage reporting

### Week 2: Core Business Logic
- [ ] Job and application hooks tests
- [ ] Candidate profile tests
- [ ] Company data tests
- [ ] E2E: Job application flow

### Week 3: Communication & Meetings
- [ ] Messaging tests
- [ ] Meeting scheduling tests
- [ ] WebRTC connection tests (mocked)
- [ ] E2E: Meeting flow

### Week 4: CRM & Pipeline
- [ ] CRM prospect tests
- [ ] Pipeline management tests
- [ ] Revenue metrics tests
- [ ] E2E: CRM flow

### Week 5: Security & Performance
- [ ] Security test suite
- [ ] Performance benchmarks
- [ ] Load testing setup
- [ ] Full regression suite

### Week 6: Hardening
- [ ] Edge case coverage
- [ ] Error handling tests
- [ ] Documentation
- [ ] Team training

---

## 10. Success Metrics

### Coverage Targets
| Category | Target | Measurement |
|----------|--------|-------------|
| Statement Coverage | 80% | Istanbul/V8 |
| Branch Coverage | 75% | Istanbul/V8 |
| Function Coverage | 85% | Istanbul/V8 |
| Critical Path E2E | 100% | Playwright |

### Quality Metrics
| Metric | Target |
|--------|--------|
| Test Flakiness | <2% |
| CI Pipeline Duration | <15 min |
| Mean Time to Fix | <4 hours |
| Regression Detection | <1 hour |

---

## 11. Resource Requirements

### Team
- 1 Senior QA Engineer (lead)
- 2 QA Engineers (execution)
- Developer support (test writing)

### Tools
- Vitest (unit testing)
- Playwright (E2E testing)
- k6 (load testing)
- Codecov (coverage reporting)
- Snyk (security scanning)
- Lighthouse CI (performance)

### Infrastructure
- CI/CD runners (GitHub Actions)
- Test database instance
- Staging environment

---

## 12. Next Steps

1. **Approve this plan** and allocate resources
2. **Create test utilities** and mock infrastructure
3. **Write first test suite** (Authentication - highest priority)
4. **Configure CI/CD** pipeline with quality gates
5. **Begin systematic test coverage** following weekly schedule

---

*Document Version: 1.0*  
*Last Updated: December 2024*  
*Owner: Engineering Team*
