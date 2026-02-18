
# Fix: Stabilize Preview by Reducing Vite Dev Server Memory Pressure

## Problem Identified
The "HTTP ERROR 412" is happening at the **server level** -- the Vite dev server itself is crashing or rejecting requests before any JavaScript runs. This is NOT a JavaScript error that can be fixed with `preventDefault()`.

The root cause is **memory exhaustion** on the Lovable preview server. Your project has grown extremely large:
- 446+ hooks in `src/hooks/`
- 150+ pages across `src/pages/`
- 80+ dependencies in `package.json`
- Massive import chains from `App.tsx` that eagerly import 11 route files, each importing dozens of lazy pages

When Vite starts, it scans the entire dependency graph starting from `src/main.tsx`. With this project size, the dev server runs out of memory and returns 412 before it can serve the HTML.

## Solution: Reduce Vite Startup Memory

### Change 1: `vite.config.ts` -- Reduce dependency scanning overhead

**Remove `optimizeDeps.entries`** -- Currently set to `['src/main.tsx']`, which tells Vite to eagerly crawl the entire app from main. Removing it lets Vite discover dependencies lazily (on-demand), drastically reducing startup memory.

**Add `optimizeDeps.noDiscovery: true`** -- Prevents Vite from scanning the entire source tree for dependencies at startup. Combined with the `include` list for critical deps, this prevents the memory spike.

**Expand `optimizeDeps.include`** to pre-bundle only the core libraries that every page uses (React, React-DOM, react-router-dom, Supabase, Tanstack Query, etc.) so Vite doesn't need to discover them on the fly.

### Change 2: `vite.config.ts` -- Reduce server memory usage

**Add `server.warmup.ssrFiles: []`** and **`server.warmup.clientFiles: []`** to prevent Vite from eagerly warming up modules on startup.

### Change 3: `vite.config.ts` -- Remove the `componentTagger` plugin in dev

The `lovable-tagger` plugin processes every component during dev, adding memory pressure. Disable it temporarily to stabilize the preview.

## Technical Summary of `vite.config.ts` changes

```text
Before:
  optimizeDeps: {
    entries: ['src/main.tsx'],
    include: [],
    exclude: ['mermaid', 'katex'],
  }

After:
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-dom/client',
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
    exclude: ['mermaid', 'katex'],
    noDiscovery: true,
  }
```

The key change is removing `entries` and adding `noDiscovery: true` with an explicit `include` list. This tells Vite: "Don't scan the entire source tree. Only pre-bundle these specific packages. Discover everything else lazily." This eliminates the memory spike that crashes the dev server.

## Why Previous Fixes Didn't Work

All previous fixes (adding `preventDefault()`, changing return values) targeted JavaScript error handling AFTER the page loads. But the 412 error means the server itself can't serve the page -- no JavaScript ever runs. The error handler changes were correct for stability once the app loads, but they can't help if the server crashes during startup.

## Expected Result

The Vite dev server will start with significantly less memory usage, allowing it to serve the HTML document and begin loading modules. The preview should load instead of showing "HTTP ERROR 412" or "This page isn't working."

## Risk

Low. The `include` list covers all critical shared dependencies. Any missing dependency will be discovered and bundled on-demand (slightly slower first load for that module, but no crash). The `noDiscovery` flag is a standard Vite optimization for large projects.
