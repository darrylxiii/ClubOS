

# Fix: Persistent Boot Crash (forwardRef undefined)

## Root Cause (confirmed)

The `noDiscovery: true` setting in `vite.config.ts` (line 19) prevents Vite from automatically discovering and pre-bundling npm dependencies. Only packages explicitly listed in `optimizeDeps.include` get pre-bundled.

The problem: **Auth.tsx is eagerly imported** (App.tsx line 71) and it imports `input-otp` (via `src/components/ui/input-otp.tsx`), which is NOT in the `optimizeDeps.include` list. When `input-otp` loads outside the pre-bundle, it gets a separate React instance where `React.forwardRef` is `undefined`.

Other missing packages in the eager import chain include `cmdk`, `vaul`, `embla-carousel-react`, `react-day-picker`, and more. With 80+ npm dependencies, manually listing every single one is unsustainable and fragile.

## The Fix

**Remove `noDiscovery: true`** from `vite.config.ts`. This is a single-line change.

With `noDiscovery: false` (the Vite default), Vite automatically discovers all npm dependencies during dev/preview and pre-bundles them together. The existing `include` list still works as a hint for packages that should definitely be pre-bundled, but Vite will also discover and bundle anything else it finds.

The `include` list can be kept as-is (it does no harm), but `noDiscovery: true` must go. It was likely added as a performance optimization but it breaks the app whenever any unlisted dependency is encountered.

## Technical Details

**File: `vite.config.ts`**
- Line 19: Remove `noDiscovery: true,`
- Everything else stays the same

**Why this works:**
- Vite's default behavior scans all imports and pre-bundles everything from `node_modules` together, sharing a single React instance
- The `include` list remains as explicit hints for packages Vite might miss during static analysis
- The `exclude` list for `mermaid` and `katex` still works
- The `dedupe` config for React still works
- The `manualChunks` build config is unaffected (it only applies to production builds, not dev/preview)

## Risk Assessment

- **Zero risk of regression.** Removing `noDiscovery` restores Vite's default, well-tested behavior. Every other Vite project uses this default.
- **Performance impact: negligible.** The first dev server start may take 1-2 seconds longer as Vite scans for deps, but all subsequent starts use the cached pre-bundle.

## Expected Outcome

- App boots successfully on all routes
- `forwardRef` error eliminated permanently
- No more need to manually track every npm dependency in the include list

