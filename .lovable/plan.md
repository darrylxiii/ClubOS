
# Fix: Add Missing JSX Runtime to optimizeDeps.include

## Problem
With `noDiscovery: true`, Vite only pre-bundles packages explicitly listed in `optimizeDeps.include`. The list includes `react` and `react-dom` but is missing `react/jsx-runtime` and `react/jsx-dev-runtime`. These are the modules that every JSX component imports (automatically by the compiler), and without pre-bundling they get served as raw CommonJS from node_modules, which breaks ESM named exports like `Fragment`.

## Fix

### File: `vite.config.ts` (lines 19-31)

Add `react/jsx-runtime` and `react/jsx-dev-runtime` to the `optimizeDeps.include` array:

```typescript
include: [
  'react', 'react-dom', 'react-dom/client',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-router-dom',
  '@supabase/supabase-js',
  '@tanstack/react-query',
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

## Why This Fixes It
- `noDiscovery: true` means Vite will NOT auto-detect that `react/jsx-runtime` needs pre-bundling
- Without pre-bundling, the raw CJS module from `node_modules/react/jsx-runtime.js` is served directly
- CJS modules don't have named ESM exports like `Fragment` -- they only have a default export
- Adding it to `include` forces Vite to pre-bundle it into a proper ESM module with all named exports

## Risk
None. This is the exact fix documented for `noDiscovery: true` setups.
