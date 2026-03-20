

# Fix: Preview Build Error

## Root Cause

The `@mantine/hooks` package is listed in `package.json` and `bun.lock`, but Rollup still fails to resolve it from `@blocknote/mantine`. This is a peer dependency resolution issue — the package exists but isn't being found during the build because Vite doesn't pre-bundle it.

All Job Dashboard code and imports are clean — no stale references to deleted components.

## Fix

1. **Add `@mantine/hooks` to `optimizeDeps.include` in `vite.config.ts`** — This ensures Vite pre-bundles the package so Rollup can resolve it from `@blocknote/mantine`.

2. **Add `@mantine/hooks` to `resolve.dedupe`** — Prevents duplicate instances that can cause resolution failures.

Single file change: `vite.config.ts` — add two strings to existing arrays.

