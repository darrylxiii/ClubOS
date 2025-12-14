# Testing Guide - The Quantum Club

## Overview

Comprehensive E2E testing infrastructure using Playwright with Page Object Models.

## Quick Start

```bash
# Run all tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific file
npx playwright test tests/e2e/auth.spec.ts

# Debug mode
npx playwright test --debug
```

## Test Structure

```
tests/
├── e2e/                    # E2E test specs
│   ├── auth.spec.ts        # Authentication flows
│   ├── jobs.spec.ts        # Job browsing
│   ├── booking.spec.ts     # Booking system
│   ├── pipeline.spec.ts    # Hiring pipeline
│   ├── messages.spec.ts    # Messaging
│   ├── crm.spec.ts         # CRM workflows
│   ├── navigation.spec.ts  # Navigation & accessibility
│   └── visual-regression.spec.ts
├── page-objects/           # Page Object Models
├── fixtures/               # Test data factories
└── utils/                  # Helper utilities
```

## Coverage Goals

| Category | Target |
|----------|--------|
| Critical paths | 90%+ |
| Authentication | 100% |
| Core business logic | 85%+ |

## Commands

- `npx playwright test` - Run all tests
- `npx playwright show-report` - View HTML report
- `npx playwright test --project=chromium` - Specific browser
