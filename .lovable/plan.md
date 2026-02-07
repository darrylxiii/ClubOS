

# Fix: Persistent Build Error with `@lovable.dev/cloud-auth-js`

## Problem

The preview keeps crashing in a loop because TypeScript cannot resolve the `@lovable.dev/cloud-auth-js` module, even though the package exists in `node_modules`. Clicking "Try to Fix" or "Dismiss" does not help because the build error remains.

## Solution

Replace the external package import with inline type declarations and a dynamic import fallback. This eliminates the dependency resolution issue entirely while keeping the exact same functionality.

## What Changes

| File | Change |
|------|--------|
| `src/integrations/lovable/index.ts` | Replace the `import { createLovableAuth }` from the external package with inline types and a `require`/dynamic approach that won't break the build |

Specifically, the file will:
1. Define the necessary types inline (copied from the package's own type declarations)
2. Use a dynamic import pattern that Vite can resolve at runtime
3. Keep the exact same public API (`lovable.auth.signInWithOAuth`)

This is a single-file change. No other files need updating since `Auth.tsx` and `InviteAcceptance.tsx` already import from `@/integrations/lovable/index` which stays the same.

