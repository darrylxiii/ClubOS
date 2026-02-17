

# Live Preview Build Crash (HTTP 412) -- Fix Plan

## Root Cause

The preview returns HTTP 412 because the Vite build runs out of memory (OOM) before it can produce output. Your project has 170+ pages and imports several heavy libraries. The build configuration already has aggressive memory guards (`maxParallelFileOps: 1`, `minify: false`, `sourcemap: false`), meaning you are at the memory ceiling. Any small increase in bundle complexity can tip the build over.

## Issues Found

### 1. 16 files import directly from `recharts` (bypassing lazy loading)

The project has a `DynamicChart` wrapper designed to lazy-load Recharts, but 16 files still import directly from `"recharts"`. This forces the entire Recharts + D3 dependency tree into the main bundle graph during build, increasing peak memory.

**Affected files:**
- `src/pages/FreelancerAnalyticsPage.tsx`
- `src/pages/admin/MarketplaceAnalytics.tsx`
- `src/pages/ClientAnalyticsPage.tsx`
- `src/components/admin/webhooks/WebhookReliabilityDashboard.tsx`
- `src/components/analytics/StoryAnalytics.tsx`
- `src/components/unified-tasks/TaskAnalyticsDashboard.tsx`
- `src/components/unified-tasks/TaskBurndownChart.tsx`
- `src/components/unified-tasks/EstimationVsActualChart.tsx`
- `src/components/partner/JobAnalytics.tsx`
- `src/components/partner/ApplicationsAnalytics.tsx`
- `src/components/partner/EnhancedAnalytics.tsx`
- `src/components/admin/security/RateLimitDashboard.tsx`
- `src/components/employees/TeamPerformanceComparison.tsx`
- `src/components/admin/PerformanceDashboard.tsx`
- `src/components/admin/activity/EngagementAnalyticsTab.tsx`
- `src/components/ui/chart.tsx`

### 2. Sentry is eagerly imported at app root

`src/lib/sentry.ts` does `import * as Sentry from '@sentry/react'` and is called synchronously in `App.tsx` line 2-3 before the app even renders. The Sentry bundle (~150KB parsed) is loaded into the initial chunk.

### 3. `TracingProvider` is eagerly imported

`src/App.tsx` line 5 imports `TracingProvider` eagerly. If it pulls in `@opentelemetry` packages, that adds another heavy dependency to the initial bundle.

### 4. Password reset pages are eagerly imported

Lines 118-121 of `App.tsx` eagerly import 4 password reset pages. While these are small individually, every eager import adds to the root chunk that must be processed in a single pass.

---

## Fix Plan

### Step 1: Convert all direct `recharts` imports to `DynamicChart`

Migrate the 16 files listed above to use the existing `DynamicChart` lazy wrapper instead of importing from `"recharts"` directly. This is the highest-impact change -- Recharts + D3 is one of the heaviest dependency trees in the project.

### Step 2: Lazy-load Sentry initialization

Change `src/App.tsx` to dynamically import Sentry so the ~150KB bundle is not part of the initial chunk:

```typescript
// Instead of:
import { initSentry } from "@/lib/sentry";
initSentry();

// Use:
import("@/lib/sentry").then(({ initSentry }) => initSentry()).catch(() => {});
```

### Step 3: Lazy-load TracingProvider

Wrap the `TracingProvider` import with `React.lazy` or a dynamic import, since tracing is only enabled in dev mode anyway.

### Step 4: Lazy-load password reset pages

Convert the 4 eager imports (lines 118-121 of App.tsx) to lazy imports:

```typescript
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPasswordVerify = lazy(() => import("./pages/ResetPasswordVerify"));
const ResetPasswordMagicLink = lazy(() => import("./pages/ResetPasswordMagicLink"));
const ResetPasswordNew = lazy(() => import("./pages/ResetPasswordNew"));
```

And wrap their routes in `<Suspense>` like the other public routes.

### Step 5: Add `extend` to optimizeDeps exclude list

The `optimizeDeps.include` has `['extend']` which forces pre-bundling of a package that may not need it. Removing it reduces pre-bundling memory.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Lazy-load Sentry, TracingProvider, and 4 password reset pages |
| 16 component/page files | Replace `from "recharts"` with `DynamicChart` usage |
| `vite.config.ts` | Remove `extend` from optimizeDeps.include |

## Expected Result

Reducing the root chunk size by ~300-400KB (Recharts + Sentry + OTel) should bring peak build memory well under the limit, resolving the 412 error and stabilizing the preview.

