

# Continue Memory Optimization -- Fix 1: Move Test Packages to devDependencies

## What This Fixes

The single biggest remaining win: **~370MB** of test-only packages are listed under `dependencies` instead of `devDependencies`. This forces Vite to include them in the production dependency graph during build, consuming memory unnecessarily.

All imports of these packages are exclusively in test files (`__tests__/`, `tests/`), confirmed by search. Moving them to `devDependencies` means Vite will not process them during production builds.

## Changes

**File: `package.json`**

Move these 5 entries from `dependencies` to `devDependencies`:

| Package | Line | Estimated Size |
|---------|------|----------------|
| `@playwright/test` | line 24 | ~300MB |
| `@testing-library/dom` | line 56 | ~8MB |
| `@testing-library/jest-dom` | line 57 | ~5MB |
| `@testing-library/react` | line 58 | ~10MB |
| `vitest` | line 104 | ~50MB |

Also move the type packages that are only needed for test/dev:
| `@types/dompurify` | line 59 | ~1MB |
| `@types/qrcode` | line 60 | ~1MB |

The resulting `devDependencies` section will include all existing entries plus these 7 packages.

## Risk

Zero -- these packages have no imports in any `src/` file. They are only used in `tests/` and `__tests__/` directories, which are excluded from production builds.

## Expected Impact

~370MB freed from the production build's dependency graph, which is the single largest optimization remaining.

