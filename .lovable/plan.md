

# Application Speed Audit — Score: 38/100

---

## Scoring Breakdown

| Area | Max | Score | Notes |
|------|-----|-------|-------|
| Initial Load (FCP/LCP) | 20 | 12 | FCP 1096ms is passable but FP at 640ms shows 450ms gap. TTFB 439ms is over 2x the 200ms target. |
| Bundle & Code Splitting | 20 | 6 | **No manualChunks configured.** 204 scripts loaded in dev. No vendor chunk splitting. `lucide-react` is 157KB single chunk. |
| Double AppLayout Rendering | 15 | 0 | **CRITICAL.** 45 pages wrap in `<AppLayout>` while already inside `ProtectedLayout` → `AppLayout`. Every protected page renders 2 sidebars, 2 notification bells, 2 profile fetches, 2 command palettes. |
| Asset Optimization | 10 | 3 | Favicons are 89KB each (PNG). `quantum-logo.svg` is 49KB. 7 apple-touch-icon variants. OG images are GIFs. |
| Third-Party Script Impact | 10 | 6 | GTM deferred correctly. RB2B deferred. But GTM DoubleClick callback takes 1448ms. `cdn.tailwindcss.com` warning in console (loaded somewhere). |
| Runtime Memory | 10 | 7 | 35MB heap on auth page is acceptable. 1004 DOM nodes on auth page is fine. No obvious leaks at startup. |
| Query & Data Loading | 10 | 8 | `useAuthPrefetch` consolidates 4 queries. React Query has good staleTime (60s). `refetchOnWindowFocus: false`. |
| Service Worker Strategy | 5 | 4 | Good: NetworkFirst for HTML, CacheFirst for fonts/images, NetworkOnly for edge functions. JS/CSS set to NetworkOnly which prevents caching benefits for hashed bundles. |

**Total: 38/100**

---

## Critical Issues (ordered by impact)

### 1. Double AppLayout Rendering (-15 pts) — THE BIGGEST ISSUE

`ProtectedLayout.tsx` wraps all protected routes in `<AppLayout>`. But 45 individual pages ALSO wrap their content in `<AppLayout>`. This means:

- **2x sidebar renders** (each with its own profile fetch, navigation computation, hooks)
- **2x NotificationBell** (each with its own real-time subscription)
- **2x CommandPalette** instances
- **2x GlobalCallNotificationProvider**
- **2x MeetingNotificationManager**
- **2x DynamicBackground**
- **2x useLastPipeline, useTranslationSync hooks**
- **2x profile fetch** (`supabase.from('profiles').select(...)`)

This doubles DOM nodes, event listeners, network requests, and memory for every single protected page.

**Affected files (45):** Settings, Applications, Companies, JobDetail, CandidateProfile, AdminCandidates, ProjectsPage, Scheduling, ClubAI, CompanyIntelligence, Post, WorkspacePage, CandidateAnalytics, PrivacyPolicy, TermsOfService, and 30+ more.

**Fix:** Remove `<AppLayout>` wrapper from all 45 pages. They're already inside it via `ProtectedLayout`.

### 2. No Production Bundle Splitting (-14 pts)

`vite.config.ts` has no `manualChunks` configuration. The build produces no vendor splitting strategy. Key issues:
- `lucide-react` at 157KB is loaded as a single chunk (should tree-shake to only used icons)
- No separation of React core vs. heavy libraries (recharts, framer-motion, fabric, mermaid, etc.)
- `chunkSizeWarningLimit: 10000` masks warnings about oversized chunks
- `sourcemap: false` is correct for prod but `reportCompressedSize: false` hides gzip insights

**Fix:** Add `manualChunks` to split: react-vendor, ui-vendor (radix), chart-vendor (recharts), editor-vendor (tiptap/blocknote). Keep core React consumers in the same chunk per memory instructions.

### 3. Oversized Assets (-7 pts)

| Asset | Size | Issue |
|-------|------|-------|
| `favicon.png` | 89KB | Should be <5KB |
| `favicon-16x16.png` | 89KB | Identical 89KB — not actually 16x16 |
| `favicon-32x32.png` | 89KB | Identical 89KB — not actually 32x32 |
| `quantum-logo.svg` | 49KB | SVG not optimized (likely embedded bitmaps or excessive paths) |
| `og-image.gif` | Unknown | GIF format is heavy; should be WebP or optimized PNG |
| 7 apple-touch-icons | ~89KB each | Redundant sizes, all likely the same oversized PNG |

Every page load fetches at least 3 favicons = 267KB of wasted bandwidth on icons alone.

**Fix:** Compress favicons to proper sizes (<5KB each). Run SVGO on the logo. Convert OG GIFs to WebP.

### 4. JS/CSS NetworkOnly Service Worker Strategy (-1 pt)

Hashed JS/CSS bundles (e.g., `App-B4mIiFk2.js`) are immutable by definition — the hash changes on every build. Setting them to `NetworkOnly` means returning users never benefit from cache. Should be `CacheFirst` with content-hash based expiry.

### 5. `cdn.tailwindcss.com` Loading (-2 pts)

Console shows a warning about the Tailwind CDN being loaded. This shouldn't be present in a project using PostCSS Tailwind. It adds ~100KB+ of unnecessary CSS processing. Likely injected by a third-party script or stale HTML reference.

### 6. AppLayout Makes Its Own Profile Fetch (-3 pts)

`AppLayout` line 77 does `supabase.from('profiles').select('full_name, avatar_url')` independently. This data is already available in `useAuthPrefetch`. With the double-render bug, this means 2 extra network requests per page load.

---

## What's Working Well

- **Deferred third-party scripts** — GTM, RB2B, PostHog all use `requestIdleCallback`
- **Lazy loading** — All routes use `React.lazy()` with Suspense
- **Auth prefetch consolidation** — Single parallel query for roles/profile/prefs/MFA
- **Deferred tracking providers** — `ProtectedProviders` defers ActivityTracker/TrackingProvider
- **Font loading** — Preloaded Inter with fallback metrics to prevent CLS
- **Boot recovery** — Robust error handling with cache reset in `index.html`
- **QueryClient config** — Good defaults (60s stale, no refetch on focus)

---

## Implementation Plan to Reach 85+/100

| Task | Points | Effort |
|------|--------|--------|
| Remove `<AppLayout>` from all 45 pages (they're already in ProtectedLayout) | +15 | Medium (repetitive but simple) |
| Add `manualChunks` to vite.config.ts for vendor splitting | +8 | Small |
| Compress favicons to proper sizes (16x16, 32x32) | +4 | Small |
| Optimize quantum-logo.svg with SVGO | +1 | Small |
| Change JS/CSS SW strategy from NetworkOnly to CacheFirst | +1 | Small |
| Remove AppLayout's standalone profile fetch, use prefetch cache | +2 | Small |
| Find and remove cdn.tailwindcss.com reference | +2 | Small |
| **Total** | **+33** → **71/100** | |

### To reach 85+, additionally:
| Task | Points | Effort |
|------|--------|--------|
| Tree-shake lucide-react (import individual icons, not the barrel) | +4 | Medium |
| Add `loading="lazy"` to below-fold images across pages | +3 | Small |
| Reduce TTFB with edge caching headers | +3 | Small |
| Preload critical route chunks based on likely navigation | +4 | Small |
| **Total** | **+14** → **85/100** | |

