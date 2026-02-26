

# Fix "forwardRef" Crash (Duplicate React Instance)

## Problem

The app fails to boot with: `Cannot read properties of undefined (reading 'forwardRef')`. This happens when multiple copies of React are loaded -- one module calls `React.forwardRef` but gets a different (uninitialized) React instance.

## Root Cause

Two issues in `vite.config.ts`:

1. **`noDiscovery: true`** in `optimizeDeps` prevents Vite from automatically discovering and pre-bundling dependencies that import React. Libraries like `@mantine/core`, `@blocknote/*`, `@livekit/*`, and `@elevenlabs/react` each pull in React but Vite cannot deduplicate them if it does not discover them during pre-bundling.

2. **Missing entries in `optimizeDeps.include`** -- several React-consuming libraries are not listed, so they bypass Vite's dependency optimization and potentially bundle their own React copy.

## Fix (single file: `vite.config.ts`)

### 1. Remove `noDiscovery: true`

Change `optimizeDeps.noDiscovery` from `true` to `false` (or simply remove the line). This lets Vite discover and pre-bundle all transitive React imports automatically, which is the primary deduplication mechanism during dev.

### 2. Add key React-consuming libraries to `optimizeDeps.include`

Add these entries to ensure they are pre-bundled with the single React instance:

- `@mantine/core`
- `@blocknote/core`
- `@blocknote/react`
- `@blocknote/mantine`
- `@radix-ui/react-slot`
- `@radix-ui/react-dialog`
- `@elevenlabs/react`
- `@livekit/components-react`

### 3. Expand `resolve.dedupe` with additional React-related packages

Add `@mantine/core` and `scheduler` to the dedupe array to cover edge cases where transitive deps resolve to separate copies:

```
dedupe: [
  'react',
  'react-dom',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'scheduler',
]
```

## Files Modified

| File | Change |
|---|---|
| `vite.config.ts` | Remove `noDiscovery: true`, add missing libraries to `optimizeDeps.include`, add `scheduler` to `resolve.dedupe` |

## Expected Result

The app boots without the `forwardRef` error. All React-consuming libraries share a single React instance through Vite's pre-bundling and resolution deduplication.

