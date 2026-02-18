
# Fix: Recharts/Lodash Loading Failure

## Root Cause

The error `The requested module '/node_modules/lodash/get.js' does not provide an export named 'default'` occurs because:

1. `vite.config.ts` has `optimizeDeps.noDiscovery: true` (line 38) -- this tells Vite to NOT auto-discover transitive dependencies
2. `recharts` depends on `lodash` (a CommonJS-only package)
3. `lodash` is not listed in `optimizeDeps.include`, so Vite never pre-bundles it for ESM compatibility
4. When `DynamicChart` dynamically imports `recharts`, the lodash CJS modules fail to load as ESM

## Fix

Add `recharts` and `lodash` to the `optimizeDeps.include` array in `vite.config.ts`. This tells Vite to pre-bundle them into ESM-compatible modules during dev server startup.

**File: `vite.config.ts` -- line 36 (inside `optimizeDeps.include`)**

Add these two entries before the closing bracket:

```
'recharts',
'lodash',
```

This is a one-line config change that resolves the chart rendering failure across the entire application.

## Why This Works

Vite's `optimizeDeps` pre-bundles CommonJS packages into ESM format. With `noDiscovery: true`, only explicitly listed packages get this treatment. Since `lodash` is CommonJS and was never listed, it breaks when imported as ESM. Adding it to the include list fixes the compatibility layer.

## Risk

None. This only affects dev-server dependency pre-bundling. Production builds already handle this via Rollup's `manualChunks` (line 243: `recharts` goes into the `charts` chunk).
