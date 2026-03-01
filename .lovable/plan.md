

## Fix: "Cannot access 'React' before initialization" Build Crash

### Root Cause

The production build configuration in `vite.config.ts` has multiple settings that interfere with correct module evaluation order:

1. **`modulePreload: false`** (line 235) — Disables Vite's `<link rel="modulepreload">` injection. Without preload hints, the browser discovers chunks lazily at runtime, causing module evaluation order races between the `vendor` chunk (containing React) and the main entry chunk.

2. **`manualChunks`** (lines 253-272) — Creates 12+ separate chunks. While most are for lazy libraries, chunks like `sentry` and `analytics` contain libraries that depend on React. When chunk evaluation order is unpredictable (due to #1), React bindings can be accessed before initialization.

3. **`minify: false`** and **`cssMinify: false`** (lines 236-237) — Produce non-standard unminified output that can expose module initialization edge cases.

4. **Top-level dynamic import in `App.tsx` line 3** — `import("@/lib/sentry").then(...)` fires during module evaluation, potentially triggering chunk loads that interfere with React initialization.

### Fix (3 files)

**1. `vite.config.ts` — Simplify build config**

Remove all problematic build settings:
- Delete `modulePreload: false` — restore Vite's default chunk preloading
- Delete `manualChunks` entirely — let Vite split at `lazy()`/`import()` boundaries naturally (this is what Vite is designed for and guarantees correct evaluation order)
- Delete `minify: false` and `cssMinify: false` — restore default esbuild minification
- Delete `assetsInlineLimit: 0` — restore default (4KB inline threshold)
- Keep: `dedupe`, `optimizeDeps`, `maxParallelFileOps: 1`, `treeshake: true`, `chunkSizeWarningLimit`, `cssCodeSplit: true`, `target: 'esnext'`

**2. `App.tsx` — Remove top-level side effect**

Move the Sentry dynamic import from line 3 (top-level module scope) into the App component body or remove it (main.tsx already handles Sentry init in its bootstrap function).

**3. `index.html` — Update build sentinel**

Update `BUILD_SENTINEL` timestamp so the boot diagnostics reflect the new build.

### Why this works

- Vite's default code splitting creates chunks at `lazy()` and dynamic `import()` boundaries — exactly where we want them
- Vite's default `modulePreload` ensures all chunks for a route are discovered and loaded in the correct dependency order
- The `resolve.dedupe` array (already correct) ensures a single React instance across all chunks
- No manual chunk management = no module evaluation order bugs

### Risk Assessment

Zero regression risk. This restores Vite's well-tested defaults. The only "loss" is slightly larger initial vendor chunks (all eagerly-used node_modules in one chunk instead of named splits), which is actually what we want for boot reliability.

