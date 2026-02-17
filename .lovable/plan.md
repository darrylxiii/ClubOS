

# Memory Optimization Audit -- Remaining Heavy Dependencies

## Current State

The previous rounds successfully migrated Recharts to lazy loading, made Sentry lazy in error boundaries and logger, and converted confetti/jsPDF to dynamic imports. However, Sentry is **still** being pulled into the root chunk through 4 forgotten files, and PostHog (~90KB) is eagerly loaded on every page. Several dead-code files also contribute to build memory.

---

## Issues Found (ordered by memory impact)

### 1. Sentry STILL eagerly imported in 4 files (~150KB back in root chunk)

Despite the previous fix, these files use `import * as Sentry from '@sentry/react'` at the top level, pulling the entire Sentry bundle back in:

| File | Used by anything? |
|------|-------------------|
| `src/lib/sentry.ts` (line 6) | Yes -- lazy-loaded from App.tsx, but also re-exports `Sentry` which other files may statically import |
| `src/lib/errorGrouping.ts` (line 7) | **NO** -- dead code, nothing imports it |
| `src/hooks/useSentryTransaction.ts` (line 2) | **NO** -- dead code, nothing imports it |
| `src/components/ui/SectionErrorBoundary.tsx` (line 12) | **NO** -- dead code, nothing imports it |
| `src/utils/performanceMonitoring.ts` (line 8) | Yes -- imported by `PerformanceMonitor.tsx`, `usePerformanceTracking.ts`, `Home.tsx` |

The first file (`sentry.ts`) is fine since it is only reached via dynamic import. But `performanceMonitoring.ts` is imported eagerly by `Home.tsx` (a lazy page) and `PerformanceMonitor.tsx`. If `PerformanceMonitor` is used in the root layout, Sentry gets pulled in.

### 2. PostHog eagerly loaded in root chunk (~90KB)

`PostHogProvider` is imported directly in `App.tsx` line 13, which imports `src/lib/posthog.ts`, which does `import posthog from 'posthog-js'`. This puts the entire PostHog SDK (~90KB) into the initial chunk -- even though PostHog is not configured (API key missing per console logs).

### 3. Dead code files with heavy imports (build processes them anyway)

Three files import `@sentry/react` but are **never used anywhere**:
- `src/lib/errorGrouping.ts` -- 249 lines, imports Sentry
- `src/hooks/useSentryTransaction.ts` -- imports Sentry
- `src/components/ui/SectionErrorBoundary.tsx` -- imports Sentry

While tree-shaking should remove dead code, the build still **parses and processes** these files, consuming memory during bundling.

### 4. `performanceMonitoring.ts` eagerly imports Sentry

This utility file does `import * as Sentry from '@sentry/react'` at the top. It is imported by `Home.tsx` and `PerformanceMonitor.tsx`. The Sentry usage is minimal (just `setMeasurement` and `getClient`), and can be converted to a dynamic import.

### 5. `framer-motion` in 332 files (already chunked but adds build pressure)

framer-motion is imported in 332 files. The `manualChunks` config already splits it into a `motion` chunk, so it does not bloat the root bundle. However, the sheer number of import sites increases Rollup's internal graph size during build. No immediate action needed, but noted for future optimization.

---

## Fix Plan

### Step 1: Delete 3 dead-code files (instant memory savings)

Remove these unused files entirely -- they are never imported anywhere:
- `src/lib/errorGrouping.ts`
- `src/hooks/useSentryTransaction.ts`
- `src/components/ui/SectionErrorBoundary.tsx`

This removes 3 files that the bundler currently parses and processes, each importing Sentry.

### Step 2: Lazy-load PostHog (~90KB savings)

Convert the `PostHogProvider` import in `App.tsx` to a lazy wrapper:

```typescript
// Instead of eager import:
// import { PostHogProvider } from "@/providers/PostHogProvider";

// Use a lazy wrapper:
const LazyPostHogProvider = lazy(() => 
  import("@/providers/PostHogProvider").then(m => ({ default: m.PostHogProvider }))
);
```

Since PostHog is not even configured (no API key), this is zero-risk. The entire `posthog-js` SDK (~90KB) will be deferred.

### Step 3: Convert `performanceMonitoring.ts` to lazy Sentry

Replace the eager `import * as Sentry from '@sentry/react'` in `src/utils/performanceMonitoring.ts` with a dynamic import pattern (same as was done in `logger.ts`):

```typescript
let _sentry: typeof import('@sentry/react') | null = null;
const getSentry = async () => {
  if (!_sentry) {
    try { _sentry = await import('@sentry/react'); } catch {}
  }
  return _sentry;
};
```

### Step 4: Add `posthog-js` to manualChunks (safety net)

Add PostHog to the Vite `manualChunks` config so even if it gets pulled in through other paths, it stays in its own chunk:

```typescript
if (id.includes('posthog')) return 'analytics';  // already present
```

This is already configured -- just verifying it stays in place.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/errorGrouping.ts` | **DELETE** (dead code) |
| `src/hooks/useSentryTransaction.ts` | **DELETE** (dead code) |
| `src/components/ui/SectionErrorBoundary.tsx` | **DELETE** (dead code) |
| `src/App.tsx` | Lazy-load PostHogProvider |
| `src/utils/performanceMonitoring.ts` | Replace eager Sentry import with lazy getter |

## Expected Result

- Removing PostHog from root chunk: **~90KB** savings
- Removing dead Sentry import files: **~150KB** less for bundler to process
- Lazy Sentry in performanceMonitoring: prevents accidental re-introduction

Total estimated reduction: **~240KB** from the eager bundle, plus reduced build-time memory from 3 fewer files to parse.

