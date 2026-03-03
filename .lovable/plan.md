

# Blog SEO Engine Audit — Current Score: 78/100

---

## Live Metrics (from blog-health, DB, and edge function curl)

| Metric | Value | Status |
|--------|-------|--------|
| Published posts | 69 | — |
| Placeholder hero images | 69/69 | Critical (unchanged) |
| Meta titles >55 chars | 0 | Fixed |
| Meta descriptions >155 chars | 0 | Fixed |
| Posts with FAQ in DB | 69/69 | Good |
| FAQ schema mapped to frontend | 69/69 | Fixed |
| FAQ visible in article body | Yes | Fixed |
| Posts with <3 keywords | 6/69 | Minor |
| `blog-og` deployed + 200 OK | Yes | Fixed |
| `blog-og` author names | Correct | Fixed |
| ScrollCTA category matching | Working | Fixed |
| BlogCategory dynamic posts | Working | Fixed |
| `public/robots.txt` removed | Yes | Fixed |
| Sitemap/RSS/robots via rewrites | Yes | Fixed |
| RSS atom:link production domain | Yes | Fixed |
| index.html RSS link production domain | Yes | Fixed |
| `noindex` on 404 pages | Yes | Fixed |
| WebSite + Organization schemas | Present on /blog | Fixed |
| ItemList schema on categories | Present | Fixed |
| Sitemap ETag caching | Working | Fixed |
| Sitemap image extensions | Ready (no real images yet) | OK |

---

## Remaining Issues

### 1. `blog-og` Content-Type: `text/plain` (Impact: Medium)

The curl response header shows `Content-Type: text/plain` despite code setting `text/html; charset=utf-8`. This is a Supabase Edge Runtime behavior — the CSP sandbox header (`Content-Security-Policy: default-src 'none'; sandbox`) overrides content type detection. Some crawlers may not parse HTML meta tags from a `text/plain` response.

**Fix**: There is no code fix for this — it's a platform limitation. The workaround is to ensure the Vercel rewrite path (`/blog-og/:category/:slug`) is used, where Vercel can set the correct Content-Type. However, testing shows the rewrite also passes through the Supabase response headers. The practical impact is low since the HTML body is parseable regardless, and the primary crawl path is the SPA (not blog-og).

**Verdict**: Document as known limitation. No code change needed.

### 2. 69/69 posts still have placeholder hero images (Impact: Critical — unchanged)

This is the single biggest remaining gap. It blocks Google Discover eligibility, Image Search traffic, and social share engagement. The `blog-backfill-images` edge function exists but has never been run.

**Fix**: Trigger the backfill function. This is an operational action, not a code change.

### 3. 6 posts have fewer than 3 keywords (Impact: Low)

Minor. Could be fixed by updating the `blog-generate` prompt to enforce minimum 5 keywords, or running a one-time SQL update to backfill keywords from content.

### 4. `blog-og` reading time shows "1 min read" for all posts (Impact: Low)

The curl response shows `1 min read` for a full-length article. The word count calculation in `blog-og` may be failing because the content blocks aren't being parsed correctly (e.g., content field might be nested differently than expected).

**Fix**: Verify content structure from DB and fix the word count loop in `blog-og`.

### 5. `article:section` in `blog-og` uses raw slug instead of display name (Impact: Low)

Line 173: `article:section` is `career-insights` instead of "Career Insights". The `BlogSchema.tsx` frontend version uses `categoryData?.name` which is the display name. `blog-og` should map category slugs to display names.

### 6. Breadcrumb schema in `blog-og` uses raw category slug (Impact: Low)

Line 133: `"name": category` shows `career-insights` instead of "Career Insights" in breadcrumbs.

### 7. `index.html` still preconnects to Supabase URL (Impact: Cosmetic)

Line 101: `<link rel="preconnect" href="https://dpjucecmoyfzrduhlctt.supabase.co">`. This leaks the internal project ID. Not a security issue (the anon key is already public) but violates the "no infrastructure leaks" principle.

### 8. No `<link rel="alternate">` pointing to `blog-og` SSR (Impact: Low-Medium)

Social crawlers (Facebook, LinkedIn, Twitter) hit the SPA URL `/blog/:category/:slug` and get the `index.html` shell. Helmet tags are injected client-side via JavaScript, which these crawlers cannot execute. The `blog-og` SSR endpoint exists but nothing points crawlers to it. The OG tags from `index.html` (generic site-level tags) are what social platforms actually see.

**Fix**: This is the one structural SEO issue remaining. Options:
- Add `<meta property="og:see_also">` pointing to blog-og (non-standard, may not help)
- Accept that social previews use the generic site OG image until Vercel middleware or SSR is available
- For now, the JSON-LD schemas ARE rendered client-side and Googlebot can execute JS, so Google is fine. Social platforms are the gap.

---

## Scoring Breakdown

| Area | Max | Score | Notes |
|------|-----|-------|-------|
| Meta Tags | 15 | 14 | All within limits. Minor: 6 posts with <3 keywords. |
| Structured Data | 20 | 19 | FAQ, Breadcrumb, BlogPosting, WebSite, Organization, ItemList all present. Minor: blog-og category slug vs display name. |
| Crawlability | 15 | 14 | Sitemap, RSS, robots all accessible on production domain. ETag caching. Image sitemap ready. Minor: blog-og text/plain Content-Type. |
| Hero Images | 20 | 0 | 100% placeholder. Zero Google Discover/Image eligibility. No code fix — operational action needed. |
| GEO/AEO | 10 | 9 | Answer-first prompts, speakable, FAQ sections, key takeaways. Solid. |
| Conversion CTAs | 5 | 5 | Category-specific CTAs working in both ScrollCTA and ArticleContent. |
| Author/E-E-A-T | 5 | 4 | Correct author names in both SPA and SSR. Minor: generic author URL, no LinkedIn links. |
| Monitoring | 10 | 9 | blog-health accurately reports all metrics. SEO score formula correct. Minor: reading time validation in blog-og. |

**Composite: 74/100** (held back almost entirely by placeholder images — without that, it would be 94/100)

---

## The Plan: 78 → ~95 (code fixes only, images need operational trigger)

### Phase 1 — Fix blog-og accuracy (3 items)

**1.1** Fix `blog-og` category slug → display name mapping for `article:section` and breadcrumb schema. Add a simple map:
```
const categoryNames: Record<string, string> = {
  'career-insights': 'Career Insights',
  'talent-strategy': 'Talent Strategy',
  'industry-trends': 'Industry Trends',
  'leadership': 'Leadership',
};
```

**1.2** Fix `blog-og` reading time calculation — verify content block structure from DB and ensure word counting works correctly.

**1.3** Remove Supabase preconnect URL from `index.html` line 101. Replace with the production domain or remove entirely (the Supabase client already handles its own connections).

### Phase 2 — Keyword backfill for 6 sparse posts

Run a SQL update to add keywords extracted from existing content for the 6 posts with <3 keywords. Or update `blog-generate` prompt to enforce minimum 5 keywords for future posts.

### Phase 3 — Operational: trigger image backfill

Not a code change. Call `blog-backfill-images` with `{"limit": 5}` in batches to generate real hero images for all 69 posts. This is the +20 point jump.

---

## Files Changed

| Phase | Files | Description |
|-------|-------|-------------|
| 1 | `supabase/functions/blog-og/index.ts`, `index.html` | Category name mapping, reading time fix, remove infra leak |
| 2 | SQL migration or `blog-generate` prompt update | Keyword minimum |

Total: 2 files + 1 optional migration. Small, focused changes.

