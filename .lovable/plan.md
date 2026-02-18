
# Fix: Remove Remaining Instability Sources

## Problem
The previous round of fixes (removing `external` block, fixing RoleContext deps, replacing `process.env`) addressed the main crash triggers. However, two remaining issues can still cause intermittent 412 errors and preview instability:

1. **`optimizeDeps.exclude` still lists `@blocknote/core` and `@blocknote/react`** -- These libraries are imported across 15+ workspace editor files. Excluding them from Vite's pre-bundling forces Vite to serve them as raw ESM from `node_modules`, which leads to stale dependency tracking and 412 errors when Vite's module graph becomes inconsistent during HMR updates.

2. **`unhandledrejection` handler does not call `event.preventDefault()`** -- Unhandled promise rejections (e.g., from failed lazy imports, Supabase calls, PostHog init) still propagate to the browser's default handler. In some environments this can cause the preview iframe to treat them as fatal errors.

3. **Minor: double blank line left in `vite.config.ts`** from the previous edit (cosmetic but sloppy).

## Changes

### File: `vite.config.ts`
- Remove `@blocknote/core` and `@blocknote/react` from `optimizeDeps.exclude` (keep `mermaid` and `katex` excluded since those are only used inside lazy-loaded components and genuinely benefit from deferred bundling)
- Clean up the double blank line at line 215-216

### File: `src/utils/globalErrorHandlers.ts`
- Add `event.preventDefault()` at the end of `handleUnhandledRejection` to prevent unhandled promise rejections from propagating to the browser's default fatal error behavior

## Technical Details

### Why removing blocknote from exclude helps
When Vite pre-bundles a dependency, it creates a stable cached version that survives HMR updates. When a dependency is excluded, Vite serves the raw source on every request, and if the module graph shifts during an HMR update, Vite returns 412 because the dependency version no longer matches. Since blocknote is used in 15+ files, any edit to workspace-related code triggers this.

`mermaid` and `katex` are fine to keep excluded because they are only imported inside lazy-loaded blocks that use dynamic `import()`, so they never participate in the main module graph.

### Why preventDefault matters
Without it, the browser logs the rejection as an uncaught error. In the Lovable preview iframe, this can trigger the parent frame's error detection, which interprets it as a crash and shows the error overlay.

## Risk
- Low. Pre-bundling blocknote may slightly increase initial dev server start time (one-time cost, cached afterward). No runtime behavior change.
- `preventDefault()` on rejections is standard practice -- it just tells the browser "we handled it, don't treat it as fatal."
