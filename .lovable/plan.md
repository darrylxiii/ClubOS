

# Fix "forwardRef" Crash in Production Build

## Problem

The production build crashes with `Cannot read properties of undefined (reading 'forwardRef')`. The app never boots (`Main: false`, `Booting: false`).

## Root Cause

The `manualChunks` function in `vite.config.ts` (line 261) splits React into a separate `react-vendor` chunk, while libraries like `sonner` that call `React.forwardRef()` at the top level end up in the `vendor` catch-all chunk.

Rollup does not guarantee that `react-vendor` executes before `vendor`. When `vendor` initializes first, `sonner` calls `React.forwardRef()` on an undefined React reference, crashing the app.

Additionally, `scheduler` (a required dependency of `react-dom`) is not included in `react-vendor` -- it falls to the `vendor` catch-all, creating another potential initialization mismatch.

## Fix (single file: `vite.config.ts`)

**Remove the separate `react-vendor` chunk.** Delete line 261:

```typescript
// REMOVE THIS LINE:
if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react-vendor';
```

React, react-dom, and scheduler will then all land in the `vendor` catch-all chunk alongside libraries that depend on them (sonner, radix, etc.). This eliminates the initialization order problem entirely. `resolve.dedupe` (already configured) continues to ensure a single React instance.

## Why This Is Safe

- `resolve.dedupe` handles React deduplication at the module resolution level, independent of chunk splitting
- Having React in the `vendor` chunk alongside its consumers guarantees correct initialization order
- The chunk will be slightly larger but eliminates the fatal boot crash

## File Changed

| File | Change |
|---|---|
| `vite.config.ts` | Remove the `react-vendor` manualChunk rule (line 261) |

