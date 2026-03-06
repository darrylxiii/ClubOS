

# Fix: Production Crash — "Cannot access 'A' before initialization"

## Root Cause

The `manualChunks` configuration added in the speed optimization is splitting React-consuming libraries (`recharts`, `@blocknote`, `@tiptap`, `@mantine`, `@supabase`, `date-fns`) into separate chunks from React itself. This creates circular initialization dependencies at the chunk boundary — Rollup minifies the variable names (hence `'A'`), and the separate chunks try to use React before it's initialized.

The project's own stability memory note states: **"manualChunks must NOT split core React consumers into separate chunks; they must reside in the main vendor chunk with React."**

The entry file `index-RPSf2gU5.js` loads, but `__MAIN_LOADED__` is never set to `true` — the crash happens during import resolution before `main.tsx` even executes.

## Fix

**Remove `manualChunks` entirely.** The separate vendor chunks (`vendor-charts`, `vendor-editor`, `vendor-supabase`, `vendor-date`) all contain React consumers and cannot safely be split from React. Vite's default code-splitting via lazy routes already provides good chunking without the initialization hazard.

### File: `vite.config.ts`

Remove the `manualChunks` function (lines 252–296) from `rollupOptions.output`. Keep all other build settings intact.

This is a single-file, surgical fix that directly addresses the production crash.

