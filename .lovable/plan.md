
# Fix: Add React Dedupe to Resolve Duplicate React Instances

## Problem
The error `"does not provide an export named 'Fragment'"` means multiple incompatible copies of React are being loaded. With `noDiscovery: true` enabled in the last change, Vite no longer automatically deduplicates dependencies, so different libraries resolve their own copy of React instead of sharing one.

## Fix

### File: `vite.config.ts` (line 207-211)

Add `dedupe` to the existing `resolve` block to force all React imports to resolve to a single instance:

```typescript
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
  dedupe: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    'react/jsx-dev-runtime',
  ],
},
```

This tells Vite: "No matter which dependency asks for React, always use the same single copy." This is a standard fix for large projects with many React-dependent libraries.

## Why This Happened
The `noDiscovery: true` change (to fix memory exhaustion) stopped Vite from automatically scanning and deduplicating dependencies. Without deduplication, libraries like `@radix-ui`, `framer-motion`, `react-hook-form`, etc. each resolve their own React copy, which breaks shared features like `Fragment`, `createContext`, and hooks.

## Risk
None. This is a standard Vite configuration recommended in the official docs for monorepos and large projects. It does not change any application code.
