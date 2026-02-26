

# Fix Dev Server OOM — App Stuck in Infinite Loading

## Problem

The Vite dev server crashes with OOM before it can serve `main.tsx`. The boot diagnostics confirm:
- `Entry: @vite/client` (HMR client loads, but not the app)
- `Main: false` (main.tsx never executed)
- Initial 502 errors on `@vite/client` (server restarting after crash)
- Recovery loop reaches max attempts, shows error UI

## Root Cause

Two factors combine to exhaust the dev server's memory:

1. **`optimizeDeps.include` is too large** — It eagerly pre-bundles 48 packages including very heavy ones like `@mantine/core`, `@blocknote/core`, `@blocknote/react`, `@blocknote/mantine`, `@livekit/components-react`, and `@elevenlabs/react`. These are all used in lazy-loaded routes and do not need eager pre-bundling.

2. **`noDiscovery: false`** (set in the previous fix) — Vite crawls the entire import graph to discover dependencies. With 600+ lazy routes across 47 files and 80+ dependencies, this consumes enormous memory as it traverses every possible import path.

The previous fix changed `noDiscovery` from `true` to `false` to solve a duplicate-React `forwardRef` crash. But the actual deduplication is handled by `resolve.dedupe`, not by `optimizeDeps.include`. We over-corrected.

## Solution

### 1. Trim `optimizeDeps.include` to initial-load essentials only

Remove all heavy, lazy-loaded libraries from the include list. Keep only what is needed for the first page render (auth page):

**Keep:**
- `react`, `react-dom`, `react-dom/client`, `react/jsx-runtime`, `react/jsx-dev-runtime`
- `react-router-dom`
- `@supabase/supabase-js`
- `@tanstack/react-query`
- `sonner`, `clsx`, `tailwind-merge`, `class-variance-authority`
- `lucide-react`, `date-fns`, `framer-motion`
- `i18next`, `react-i18next`
- `react-helmet-async`

**Remove** (lazy-loaded, pre-bundled on-demand when accessed):
- `@mantine/core`, `@blocknote/core`, `@blocknote/react`, `@blocknote/mantine`
- `@livekit/components-react`, `@elevenlabs/react`
- `@radix-ui/react-slot`, `@radix-ui/react-dialog`
- `recharts`, `lodash`
- `react-hook-form`, `zod`, `@hookform/resolvers`
- `react-dropzone`, `attr-accept`, `file-selector`, `prop-types`, `classnames`
- `use-sync-external-store/shim`, `use-sync-external-store/shim/with-selector`

### 2. Limit dependency discovery scope

Add `optimizeDeps.entries` pointing only to `src/main.tsx`. This prevents Vite from crawling all 600+ lazy import paths during pre-bundling, dramatically reducing peak memory.

```typescript
optimizeDeps: {
  entries: ['src/main.tsx'],
  include: [
    'react', 'react-dom', 'react-dom/client',
    'react/jsx-runtime', 'react/jsx-dev-runtime',
    'react-router-dom',
    '@supabase/supabase-js',
    '@tanstack/react-query',
    'sonner', 'clsx', 'tailwind-merge',
    'class-variance-authority',
    'lucide-react', 'date-fns',
    'framer-motion',
    'react-helmet-async',
    'i18next', 'react-i18next',
  ],
  exclude: ['mermaid', 'katex'],
},
```

### 3. Keep `resolve.dedupe` unchanged

The existing dedupe array handles React deduplication at resolve time regardless of pre-bundling state:

```typescript
resolve: {
  dedupe: [
    'react', 'react-dom',
    'react/jsx-runtime', 'react/jsx-dev-runtime',
    'scheduler',
  ],
},
```

This ensures that even when `@blocknote/*` or `@mantine/core` are pre-bundled on-demand later, they still resolve to the single React instance.

## File Modified

| File | Change |
|---|---|
| `vite.config.ts` | Trim `optimizeDeps.include` to 16 essential entries, add `entries: ['src/main.tsx']` |

## Risk Assessment

- **forwardRef crash**: Will NOT recur. `resolve.dedupe` handles deduplication independently of pre-bundling. The previous crash was caused by `noDiscovery: true` which is no longer set.
- **Lazy route performance**: First navigation to a heavy page (e.g. one using BlockNote) may take 1-2s extra as Vite pre-bundles on-demand. Subsequent visits are instant (cached).

