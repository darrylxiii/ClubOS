

# Blog Engine Audit — Current Score: 58/100

The previous remediation work fixed analytics plumbing, RLS, meta truncation, GEO prompts, and added RSS/sitemap rewrites. Good progress. But several critical items are broken, incomplete, or silently failing.

---

## What is broken right now

### 1. `blog-og` is NOT deployed (Impact: Fatal — SSR is dead)

The `blog-og` edge function exists in code but returns 404 when called. The Vercel rewrite in `vercel.json` line 6 routes all `/blog/:category/:slug` traffic to this non-existent function. This means:

- **Every blog article URL returns a 404 or falls through to SPA** depending on how Vercel handles the failed rewrite
- The entire Phase 4 SSR strategy is non-functional
- Google, Bing, and AI crawlers cannot see any article content

**Fix**: Deploy `blog-og`. Verify it returns 200 with correct HTML.

### 2. `blog-health` reports 0 placeholder images when there are 69 (Impact: High — monitoring is lying)

The health check queries: `.eq('hero_image', JSON.stringify({ url: '/placeholder.svg', alt: '' }))`. But actual data has `alt` set to the article title (e.g., `{"alt": "The Ultimate Career...", "url": "/placeholder.svg"}`). The `alt` field never matches `""`, so the count is always 0.

**Fix**: Use a text-based LIKE query: `.like('hero_image', '%placeholder.svg%')` or use `->>'url'` JSONB accessor. Also add this check as a separate column filter instead of full JSON match.

### 3. `blog-og` redirects real users away from SSR HTML (Impact: High — UX regression)

Lines 173-177 of `blog-og/index.ts`:
```js
if (!navigator.userAgent.match(/bot|crawl|spider.../i)) {
  window.location.replace('${postUrl}');
}
```

This redirects non-bot visitors back to the SPA URL, but the Vercel rewrite catches `/blog/:category/:slug` and sends them right back to the edge function — creating an **infinite redirect loop** for real users. The SPA can never render blog articles because the rewrite intercepts before filesystem fallback.

**Fix**: The `blog-og` edge function should serve full HTML for ALL visitors (bots and humans). Remove the redirect script entirely. Add SPA hydration assets (CSS, JS) to the SSR page instead of redirecting.

However, this is architecturally complex (you'd need to inject Vite bundle URLs). The pragmatic fix: change the Vercel rewrite so it only applies when a specific query param is present (e.g., `?render=ssr`), or remove the rewrite entirely and rely on the `blog-og` function only for social crawlers via a different mechanism (e.g., link the OG function directly in meta tags but keep SPA as canonical).

**Recommended approach**: Remove the `/blog/:category/:slug` rewrite from `vercel.json`. Keep `blog-og` as a dedicated OG/bot endpoint callable via direct URL only. Blog articles stay as SPA pages. Crawlers get content from JSON-LD + meta tags (which Googlebot CAN render). For non-JS crawlers (Bing, social), the existing Helmet meta tags + `blog-og` endpoint can be linked via `<link rel="alternate">`.

### 4. Draft/failed posts accessible via direct URL (Impact: Medium)

The SPA query filters `status = 'published'`, but if someone guesses a draft slug, `useDynamicBlogPost` falls back to static posts which have no status filter. There is no `noindex` tag on the 404 page — if a draft URL leaks, it could get indexed.

**Fix**: Add `<meta name="robots" content="noindex, nofollow" />` to the "Article Not Found" page.

### 5. Duplicate OG tags (Impact: Medium — confusing crawlers)

`BlogPost.tsx` lines 103-117 output OG tags via Helmet, AND `BlogSchema.tsx` lines 79-96 output the same OG tags via Helmet. Both render simultaneously, producing duplicate `og:title`, `og:description`, `og:url`, `og:image`, `twitter:card`, `twitter:title`, `twitter:description` tags. Crawlers take the first or last — behavior is undefined.

**Fix**: Remove the OG/Twitter tags from `BlogPost.tsx` Helmet. Keep only `<title>` and `<meta name="description">` there. Let `BlogSchema.tsx` own all structured/social meta.

### 6. Twitter image fallback is wrong

`BlogSchema.tsx` line 103: `ogImage.replace('og-image.gif', 'og-image-twitter-v3.gif')`. When a post has a real hero image (not the GIF fallback), this replace does nothing — the twitter:image becomes the hero image URL. But hero images are AI-generated and may not meet Twitter's aspect ratio (2:1) or size requirements. Should use the hero image for both, or have a dedicated twitter card image.

### 7. Sitemap missing `<lastmod>` for category pages (Impact: Low)

Category pages have no `<lastmod>` — Google has less signal for crawl frequency.

### 8. No `hreflang` despite multilingual requirement

The knowledge instructions say "EN/NL toggle" but there's zero `hreflang` implementation. Not critical now but signals an incomplete SEO setup.

---

## What is working well

- Meta titles avg 50 chars, descriptions avg 150 chars (within limits after truncation migration)
- 0 posts with long meta titles/descriptions
- RSS feed deployed and accessible with production domain
- Robots.txt served via edge function with correct sitemap URL
- Sitemap served via rewrite with correct URLs
- FAQ schema on all 69 posts
- Key takeaways on all 69 posts
- GEO-optimized prompt in `blog-generate` (answer-first, citations, definitions)
- Analytics pipeline functional (blog-track, blog-analyze)
- Rate limiting on blog-track
- Category-specific CTAs in ScrollCTA and ArticleContent
- Newsletter capture wired to database

---

## The Plan: 58 → 100

### Phase 1 — Fix Critical Breakages (58 → 72)

**1.1 Deploy `blog-og` and fix the redirect loop**
- Remove the JavaScript redirect from `blog-og/index.ts` (lines 173-177)
- Remove the `/blog/:category/:slug` rewrite from `vercel.json` — the SPA handles these URLs fine for real users
- Keep `blog-og` as a callable endpoint for programmatic use (social preview validators, etc.)
- Add the OG function URL as the `og:url` alternate for social crawlers in `BlogSchema.tsx` if needed — or rely on Googlebot's JS rendering

**1.2 Fix `blog-health` placeholder image detection**
Replace the broken JSON equality check with a JSONB path query that checks `hero_image->>'url' = '/placeholder.svg'`.

**1.3 Remove duplicate OG tags from `BlogPost.tsx`**
Keep only `<title>` and `<meta name="description">` in the BlogPost Helmet. All OG/Twitter/article tags stay in `BlogSchema.tsx`.

**1.4 Add `noindex` to the 404 article page**
In the "Article Not Found" branch of `BlogPost.tsx`, add `<meta name="robots" content="noindex, nofollow" />`.

### Phase 2 — Schema & Structured Data Enhancements (72 → 82)

**2.1 Add `WebSite` schema with `SearchAction` to Blog listing page**
On `/blog`, add JSON-LD `WebSite` schema with `potentialAction: SearchAction` — enables sitelinks search box in Google.

**2.2 Add `ItemList` schema to category pages**
Each `/blog/{category}` page should output `ItemList` JSON-LD with the articles in that category — helps Google understand collection structure.

**2.3 Add `Organization` schema to the Blog layout**
A single `Organization` schema with `sameAs` links to LinkedIn, X, website.

**2.4 Fix `author` in `blog-og` SSR**
Line 87 uses `post.author_id` (e.g., "tqc-editorial") as the author name. Should map to display name using the same rotation array from `blog-generate`.

### Phase 3 — Content Quality Signals (82 → 90)

**3.1 Add `dateModified` auto-update trigger**
Create a DB trigger on `blog_posts` that sets `updated_at = now()` on any UPDATE. Currently `updated_at` may be stale.

**3.2 Add reading time to `blog-og` SSR page**
Include `<meta name="twitter:label1" content="Reading time">` and `<meta name="twitter:data1" content="X min read">` for Twitter card enrichment.

**3.3 Add `lastmod` to sitemap category entries**
Query the most recent `updated_at` for posts in each category and use as the category page `lastmod`.

**3.4 Fix Twitter image handling in BlogSchema**
When `ogImage` is a real hero image (not the GIF fallback), use it directly for `twitter:image` instead of running the `.replace()` that only works for the GIF.

### Phase 4 — Crawl Budget & Performance (90 → 96)

**4.1 Add `Cache-Control` and `ETag` to `blog-sitemap`**
Return `ETag` based on latest `updated_at` across all posts. Return `304 Not Modified` when unchanged. Saves crawl budget.

**4.2 Add `<link rel="preconnect">` for blog image domains**
If hero images are served from a storage bucket, add preconnect to that origin in `BlogPost.tsx` Helmet.

**4.3 Add image `loading="lazy"` and explicit dimensions to ArticleContent**
Any images rendered in article body should have `width`, `height`, and `loading="lazy"` to prevent CLS.

### Phase 5 — Monitoring & Validation (96 → 100)

**5.1 Fix `blog-health` SEO score to account for actual placeholder images**
After fixing the detection (Phase 1.2), the score formula already penalizes placeholders at 30% weight — it will now correctly report.

**5.2 Add structured data validation to `blog-health`**
Check that every published post has: non-empty `faq_schema`, non-empty `key_takeaways`, `meta_title` <60 chars, `meta_description` <160 chars, `keywords` array length ≥3.

**5.3 Add a `blog-validate-schema` endpoint**
Returns Google Rich Results test-compatible output for any article — lets you verify schema validity programmatically.

---

## Files Changed Per Phase

| Phase | Frontend | Edge Functions | Migrations | Config |
|-------|----------|---------------|------------|--------|
| 1 | 2 (BlogPost.tsx, BlogSchema.tsx) | 2 (blog-og, blog-health) | 0 | vercel.json |
| 2 | 2 (Blog.tsx, BlogCategory.tsx) | 1 (blog-og author fix) | 0 | 0 |
| 3 | 1 (BlogSchema.tsx) | 1 (blog-sitemap) | 1 (updated_at trigger) | 0 |
| 4 | 1 (ArticleContent.tsx) | 1 (blog-sitemap ETag) | 0 | 0 |
| 5 | 0 | 2 (blog-health, blog-validate-schema) | 0 | 0 |

**Total: ~6 frontend files, ~7 edge function edits, ~1 migration across 5 phases.**

Phase 1 is urgent — the `/blog/:category/:slug` Vercel rewrite is actively breaking article pages for real users if `blog-og` is not deployed, or creating redirect loops if it is.

