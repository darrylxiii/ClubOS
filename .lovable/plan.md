

# Memory Optimization Audit -- Fix Plan

## Diagnosis

The build is hitting the Vite memory ceiling (OOM / HTTP 412). The previous fix migrated Recharts to lazy loading, but several other heavy dependencies are still eagerly pulled into the root chunk via import chains.

## Issues Found (ordered by impact)

### 1. Sentry still eagerly loaded via error boundaries (~150KB)

Even though `initSentry()` is now lazy-loaded, `@sentry/react` is **still** pulled into the root chunk through three eager import paths:

- `SentryErrorBoundary.tsx` (line 2: `import * as Sentry from '@sentry/react'`) -- used directly in `App.tsx`
- `RouteErrorBoundary.tsx` (line 6: `import * as Sentry from '@sentry/react'`) -- used in every route wrapper in `App.tsx`
- `logger.ts` (line 2: `import * as Sentry from '@sentry/react'`) -- imported by `RouteErrorBoundary` and many other files

**This completely negates the lazy-load fix from the previous round.** Sentry's ~150KB is still in the initial bundle.

### 2. `canvas-confetti` imported eagerly in 17 files (~30KB each import site)

`canvas-confetti` is imported directly (not lazily) in 17 components. While each import resolves to the same module, the build still processes it as part of the dependency graph for those chunks. Lazy-loading it would remove it from the critical path.

### 3. `jsPDF` + `jspdf-autotable` imported eagerly in 2 files (~250KB combined)

`CoverLetterPreview.tsx` and `FinancialExportMenu.tsx` import jsPDF at the top level. These are heavy libraries only needed when a user clicks "Download PDF".

### 4. `@blocknote` imported eagerly in 15 workspace editor files

While these are marked external in dev mode, in **production builds** they are bundled. The 15 files importing from `@blocknote/react`, `@blocknote/core`, and `@blocknote/mantine` should be consolidated behind a single lazy boundary.

### 5. `react-markdown` imported eagerly in 7 files (~60KB)

A `LazyMarkdown` wrapper already exists at `src/components/ui/LazyMarkdown.tsx` but 7 files bypass it and import `react-markdown` directly.

---

## Fix Plan

### Step 1: Remove Sentry from root chunk (highest impact)

Replace all eager `import * as Sentry from '@sentry/react'` with dynamic imports in the three root-chain files:

- **`SentryErrorBoundary.tsx`**: Remove the Sentry import. In the `componentDidCatch` method, use `import('@sentry/react').then(s => s.captureException(error))` instead.
- **`RouteErrorBoundary.tsx`**: Same pattern -- dynamic import in `componentDidCatch` only.
- **`logger.ts`**: Replace the top-level Sentry import with a lazy getter that caches the module after first load. All existing Sentry calls become async (fire-and-forget for logging, which is acceptable).

This removes ~150KB from the initial chunk.

### Step 2: Lazy-load `canvas-confetti` in all 17 files

Replace every `import confetti from 'canvas-confetti'` with a dynamic import wrapper:

```typescript
const fireConfetti = async (opts?: any) => {
  const { default: confetti } = await import('canvas-confetti');
  confetti(opts);
};
```

This is safe because confetti is always triggered by a user action (click), never on mount.

### Step 3: Lazy-load jsPDF in 2 files

Move `import jsPDF` inside the download handler functions in `CoverLetterPreview.tsx` and `FinancialExportMenu.tsx`. These only fire on button click.

### Step 4: Migrate 7 files from `react-markdown` to `LazyMarkdown`

Replace direct `import ReactMarkdown from 'react-markdown'` with the existing `LazyMarkdown` wrapper in:
- `ClubAI.tsx`
- `UnifiedTaskDetailSheet.tsx`
- `DisasterRecoveryDashboard.tsx`
- `CourseAIChat.tsx`
- `AIModuleAssistant.tsx`
- `ClubAIHomeChatWidget.tsx`
- `MessageFormatter.tsx`

### Step 5: Verify BlockNote is behind lazy boundary

Confirm all `@blocknote` imports are only reachable through lazy-loaded page components (they appear to be, through the workspace routes). No code change expected, just verification.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/SentryErrorBoundary.tsx` | Dynamic import for Sentry |
| `src/components/RouteErrorBoundary.tsx` | Dynamic import for Sentry |
| `src/lib/logger.ts` | Lazy Sentry getter |
| 17 files with `canvas-confetti` | Dynamic import wrapper |
| `src/components/applications/CoverLetterPreview.tsx` | Move jsPDF inside handler |
| `src/components/financial/FinancialExportMenu.tsx` | Move jsPDF + autotable inside handler |
| 7 files with `react-markdown` | Switch to `LazyMarkdown` |

## Expected Result

Removing Sentry (~150KB), canvas-confetti (~30KB), jsPDF (~250KB), and react-markdown (~60KB) from the eager dependency graph should reduce peak build memory by ~400-500KB of parsed JS, bringing the build well under the OOM threshold.

