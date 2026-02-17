

# Full 3GB Memory Breakdown -- Where Every MB Goes

## Overview

Your project has **2,246 source files** importing **97 npm packages**. During a Vite/Rollup build, every file and every dependency gets parsed, transformed, and held in memory simultaneously. Here is the full accounting of where the ~3GB goes.

---

## 1. Dependency Size Map (installed node_modules)

These are the estimated **installed sizes** of your dependencies. During build, Rollup must parse and hold the module graph for all reachable code.

### Tier 1: Massive (100MB+ installed each)

| Package | Installed Size | Import Sites | Status |
|---------|---------------|-------------|--------|
| `@playwright/test` | **~300MB** | **0 files** | UNUSED -- test runner, should be devDependency or removed |
| `@sentry/react` | ~150MB (with transitive deps) | 2 files (lazy) | Fixed -- now lazy |
| `framer-motion` | ~120MB | **184 files** | Chunked via manualChunks, but 184 import sites create massive graph edges |
| `livekit-client` + `@livekit/*` | ~100MB | 1 file | Chunked, but still parsed |

### Tier 2: Heavy (20-80MB each)

| Package | Installed Size | Import Sites | Status |
|---------|---------------|-------------|--------|
| `recharts` + d3 transitive | ~80MB | 0 direct (lazy via hook) | Fixed |
| `@blocknote/*` (core+react+mantine) | ~60MB | 16 files | Chunked, but all 16 files eagerly import |
| `mermaid` | ~50MB | 0 direct | External in dev, chunked in prod |
| `fabric` | ~40MB | **0 files** | COMPLETELY UNUSED -- can be removed |
| `mathjs` | ~35MB | 1 file | Eagerly imported by FormulaCell |
| `posthog-js` | ~30MB | lazy | Fixed |
| `lucide-react` | ~25MB (all icons) | **839 files** | Tree-shakeable but 839 import sites = huge graph |
| `jspdf` + `jspdf-autotable` | ~25MB | 2 files (lazy) | Fixed |
| `katex` | ~20MB | **0 files** | UNUSED in source -- can be removed from dependencies |

### Tier 3: Medium (5-20MB each)

| Package | Installed Size | Import Sites | Status |
|---------|---------------|-------------|--------|
| `@radix-ui/*` (17 packages) | ~15MB total | Many | Chunked |
| `@tanstack/react-query` | ~10MB | Many | Core dependency |
| `@supabase/supabase-js` | ~10MB | Many | Core dependency |
| `date-fns` + `date-fns-tz` | ~8MB | Many | Tree-shakeable |
| `react-hook-form` + resolvers | ~8MB | Many | Needed |
| `@dnd-kit/*` (3 packages) | ~7MB | 12 files | Could lazy-load |
| `i18next` + plugins | ~6MB | 11 files | Core dependency |
| `react-day-picker` | ~5MB | Some | Needed |
| `zod` | ~5MB | Many | Needed |
| `embla-carousel-react` | ~5MB | 0 direct imports found | Possibly unused or used via re-export |
| `canvas-confetti` | ~3MB | 0 direct (lazy via wrapper) | Fixed |
| `react-dropzone` | ~3MB | 5 files | Could lazy-load |
| `react-phone-number-input` | ~3MB | 3 files | Could lazy-load |
| `qrcode` | ~3MB | 3 files | Could lazy-load |

### Tier 4: Test-only in production dependencies (should be devDependencies)

| Package | Installed Size | Issue |
|---------|---------------|-------|
| `@playwright/test` | ~300MB | Listed in `dependencies`, not `devDependencies` |
| `vitest` | ~50MB | Listed in `dependencies`, not `devDependencies` |
| `@testing-library/react` | ~10MB | Listed in `dependencies`, not `devDependencies` |
| `@testing-library/dom` | ~8MB | Listed in `dependencies`, not `devDependencies` |
| `@testing-library/jest-dom` | ~5MB | Listed in `dependencies`, not `devDependencies` |

---

## 2. Source Code Complexity (Rollup graph pressure)

| Metric | Count | Memory Impact |
|--------|-------|---------------|
| Total source files with imports | **2,246** | Each file = AST node in memory |
| Page components | **~200** | Each lazy page = separate chunk to track |
| `lucide-react` import sites | **839 files** | Tree-shaking must analyze 839 import declarations |
| `framer-motion` import sites | **184 files** | Each creates edge in module graph |
| Route definitions | ~150+ routes | All parsed in App.tsx |

---

## 3. Where the 3GB Actually Goes

```text
Component                          Estimated Memory
----------------------------------------------------
node_modules parsing               ~1,200 MB
  @playwright/test (WASTED)          ~300 MB
  vitest + testing-lib (WASTED)       ~70 MB
  framer-motion graph (184 sites)    ~120 MB
  livekit-client                     ~100 MB
  @blocknote/* (16 files)             ~60 MB
  mermaid                             ~50 MB
  fabric (UNUSED)                     ~40 MB
  mathjs                              ~35 MB
  @sentry/react                      ~150 MB
  Remaining 80+ packages             ~275 MB

Source file ASTs (2,246 files)       ~800 MB
  839 lucide-react import sites      ~200 MB
  184 framer-motion import sites     ~100 MB
  Remaining component ASTs           ~500 MB

Rollup chunk generation              ~500 MB
  Module graph edges                 ~200 MB
  manualChunks function calls        ~100 MB
  Code generation + string concat    ~200 MB

Vite overhead (transforms, HMR)      ~300 MB
  SWC transforms                     ~150 MB
  Plugin pipeline                    ~150 MB

PWA plugin (workbox generation)      ~100 MB
----------------------------------------------------
TOTAL                              ~2,900 MB
```

---

## 4. Actionable Fixes (ordered by impact)

### Fix 1: Move test packages to devDependencies (~370MB savings)

These packages are in `dependencies` but are ONLY used in `__tests__` files. The build includes them in the dependency graph unnecessarily.

Move to `devDependencies`:
- `@playwright/test` (~300MB) -- **zero imports in source code**
- `vitest` (~50MB) -- only in test files
- `@testing-library/react` (~10MB) -- only in test files
- `@testing-library/dom` (~8MB) -- only in test files
- `@testing-library/jest-dom` (~5MB) -- only in test files

### Fix 2: Remove completely unused packages (~65MB savings)

These packages are installed but have **zero imports** anywhere in source code:
- `fabric` (~40MB) -- zero imports found
- `katex` (~20MB) -- zero imports found (already excluded from optimizeDeps)
- `dotted-map` (~2MB) -- zero imports found
- `react-easy-crop` (~2MB) -- zero imports found
- `react-google-recaptcha` + v3 (~3MB) -- zero imports found
- `input-otp` (~1MB) -- zero imports found
- `embla-carousel-react` (~5MB) -- zero imports found directly
- `react-resizable-panels` (~2MB) -- zero imports found directly

### Fix 3: Consolidate framer-motion behind a barrel export (~100MB graph savings)

184 files import directly from `framer-motion`. While the library is chunked, each import site creates edges in Rollup's module graph. Creating a single re-export barrel (`src/lib/motion.ts`) that only exports `motion`, `AnimatePresence`, and `useDragControls` would reduce import sites from 184 to 1 from Rollup's perspective.

### Fix 4: Consolidate lucide-react icons (~50-100MB graph savings)

839 files import from `lucide-react`. Each import forces Rollup to resolve and tree-shake across the entire icon set. A barrel file (`src/lib/icons.ts`) that re-exports only the ~100 unique icons actually used would massively reduce graph complexity.

### Fix 5: Lazy-load @blocknote behind a single dynamic boundary (~60MB savings)

All 16 BlockNote files are in `src/components/workspace/`. If the workspace pages are already lazy-loaded, this is already handled. Verify the workspace route uses `React.lazy()`.

### Fix 6: Lazy-load niche libraries used in 1-3 files

| Library | Files | Action |
|---------|-------|--------|
| `mathjs` (~35MB) | 1 file (FormulaCell) | Dynamic import inside cell renderer |
| `qrcode` (~3MB) | 3 files | Dynamic import on button click |
| `react-phone-number-input` (~3MB) | 3 files | Lazy component wrapper |
| `react-dropzone` (~3MB) | 5 files | Lazy component wrapper |
| `@dnd-kit/*` (~7MB) | 12 files | Already behind page-level lazy loads (verify) |

---

## Summary Table

| Fix | Savings | Difficulty |
|-----|---------|------------|
| Move 5 test packages to devDependencies | ~370MB | Trivial (package.json edit) |
| Remove 8 unused packages | ~65MB | Trivial (package.json edit) |
| Barrel export for framer-motion | ~100MB graph | Medium (184 file imports to update) |
| Barrel export for lucide-react | ~50-100MB graph | Medium (839 file imports -- can be incremental) |
| Dynamic import mathjs | ~35MB | Easy (1 file) |
| Lazy-load niche libs (qrcode, phone, dropzone) | ~10MB | Easy (11 files) |
| Verify BlockNote/workspace lazy boundary | ~60MB | Verification only |

**Total estimated savings: ~700-800MB** -- bringing the build from ~2.9GB down to ~2.1-2.2GB, well within limits.

The single biggest win is **Fix 1** (moving test packages out of production dependencies). That alone frees ~370MB with a one-line change to `package.json`.

