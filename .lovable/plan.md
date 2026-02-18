
# Fix: Add `use-sync-external-store` to optimizeDeps.include

## Problem
Same root cause as the previous `Fragment` fix. With `noDiscovery: true`, Vite only pre-bundles explicitly listed packages. The `use-sync-external-store/shim` module (used internally by React Query, Zustand, and other state libraries) is CommonJS and needs pre-bundling to expose proper ESM named exports like `useSyncExternalStore`.

## Fix

### File: `vite.config.ts` (line 33)

Add `use-sync-external-store/shim` and `use-sync-external-store/shim/with-selector` to the `optimizeDeps.include` array:

```typescript
include: [
  'react', 'react-dom', 'react-dom/client',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-router-dom',
  '@supabase/supabase-js',
  '@tanstack/react-query',
  'use-sync-external-store/shim',
  'use-sync-external-store/shim/with-selector',
  'sonner', 'clsx', 'tailwind-merge',
  'class-variance-authority',
  'lucide-react', 'date-fns',
  'react-hook-form', 'zod',
  '@hookform/resolvers',
  'framer-motion',
  'react-helmet-async',
  'i18next', 'react-i18next',
],
```

## Why
- `use-sync-external-store` ships as CommonJS
- Without pre-bundling, Vite serves the raw CJS file which has no ESM named exports
- Adding it to `include` forces Vite to convert it to ESM with proper named exports

## Risk
None. Standard fix for `noDiscovery: true` setups.
