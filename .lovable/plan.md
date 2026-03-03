

# Blog SEO Engine Audit — Current Score: 62/100

---

## Verified Data (from live DB + edge functions)

| Metric | Value | Status |
|--------|-------|--------|
| Published posts | 69 | — |
| Placeholder hero images | 69/69 (100%) | Critical |
| Meta titles >60 chars | 0 | Fixed |
| Meta descriptions >160 chars | 0 | Fixed |
| Avg meta title length | 50 chars | Good |
| Avg meta description length | 150 chars | Good |
| Posts with FAQ data in DB | 69/69 | Good |
| FAQ schema rendered on frontend | 0/69 | Critical (data exists, never mapped) |
| Posts with <3 keywords | 6/69 | Minor |
| blog-og deployed | Yes | — |
| blog-og author output | "Marcus-williams" | Broken |
| ScrollCTA category matching | Never matches | Broken |
| BlogCategory page data source | Static only | Broken (shows 0 DB posts) |

---

## Critical Bugs (Actively Hurting SEO Right Now)

### 1. FAQ Schema Never Renders for Any DB Post (Impact: Critical — 69 posts lose rich results)

`BlogSchema.tsx` line 60: `const faqItems = (post as any).faqSchema || []`

The `BlogPost` TypeScript interface has no `faqSchema` field. `useDynamicBlogPosts.ts` transforms DB posts via `transformDBPost()` but never maps `faq_schema` (snake_case DB column) to the frontend object. Result: `(post as any).faqSchema` is always `undefined` for all 69 DB posts, despite every post having 3-5 FAQ pairs in the database.

This means zero FAQ rich results appear in Google despite the data being complete. This is the single highest-value fix — FAQ rich results directly increase SERP real estate and CTR.

**Fix**: Add `faqSchema` to the `BlogPost` interface and map `dbPost.faq_schema` in `transformDBPost()` inside `useDynamicBlogPosts.ts`. Also add `ai_generated` while we're at it (same missing mapping).

### 2. `blog-og` Author Names Are Wrong (Impact: High — E-E-A-T signals broken)

The `authorMap` in `blog-og/index.ts` contains fictional IDs (`tqc-sophia`, `tqc-marcus`, etc.) that don't match actual DB values (`alexandra-chen`, `marcus-williams`, `tqc-editorial`). The fallback regex `authorId.replace('tqc-', '')` produces `"Marcus-williams"` (hyphenated, wrong casing) for `marcus-williams` and `"Alexandra-chen"` for `alexandra-chen`.

This means every SSR page served to crawlers has incorrect author attribution. Google's E-E-A-T signal for these articles is degraded.

**Fix**: Update `authorMap` to use actual DB author IDs: `'alexandra-chen': 'Alexandra Chen'`, `'marcus-williams': 'Marcus Williams'`, `'tqc-editorial': 'TQC Editorial Team'`.

### 3. ScrollCTA Category Matching Never Works (Impact: Medium — all users see generic CTA)

`ScrollCTA.tsx` line 38: `const { categorySlug } = useParams<{ categorySlug?: string }>()`

The route is `/blog/:category/:slug` (App.tsx line 347). The param name is `category`, not `categorySlug`. So `categorySlug` is always `undefined`, and every article shows the default "Ready for your next move? Apply as Talent" CTA instead of the category-specific ones.

**Fix**: Change `{ categorySlug }` to `{ category }` and use `category` for the lookup.

### 4. BlogCategory Page Shows Zero DB Posts (Impact: High — category pages are empty or show stale data)

`BlogCategory.tsx` line 15 calls `getPostsByCategory(category)` which only searches the static `blogPosts` array in `src/data/blog.ts`. This array contains zero or very few hardcoded posts. All 69 DB-generated posts are invisible on category pages.

The Blog listing page (`Blog.tsx`) correctly uses `useDynamicBlogPosts()`, but the category pages don't. A user navigating from `/blog` to `/blog/career-insights` sees a near-empty page.

**Fix**: Replace `getPostsByCategory` with `useDynamicBlogPostsByCategory(category)` in BlogCategory.tsx.

### 5. `blog-og` Content-Type Header Is Wrong

The edge function returns `Content-Type: text/plain` (visible in our curl response headers). It should be `text/html; charset=utf-8`. The code sets this correctly in the Response constructor, but the actual response shows `text/plain` — likely a Supabase edge runtime quirk where the Content-Security-Policy sandbox header overrides the content type detection.

This is less critical since the HTML body is still parseable, but it means some strict crawlers may not parse the meta tags.

**Fix**: Verify after redeployment. If still wrong, set the header explicitly via a different approach.

### 6. `blog-og` Image Dimensions Claim 1200x630 but Images Are Placeholders

Line 19 of BlogSchema.tsx: `"image": { "@type": "ImageObject", "url": ogImage, "width": 1200, "height": 630 }`. When `ogImage` falls back to `/og-image.gif`, the actual GIF is 432x540 (per `index.html` line 157-158). The JSON-LD claims false dimensions, which can trigger Google structured data warnings.

**Fix**: When using the fallback GIF, set dimensions to 432x540.

---

## Structural Issues (Not Bugs, But Missing Optimization)

### 7. `ai_generated` Flag Never Mapped to Frontend

`BlogPost.tsx` line 193 checks `(post as any).ai_generated` for the AI disclaimer. But `transformDBPost()` never maps this field. The disclaimer never shows.

### 8. No `noindex` on Category "Not Found" Page

`BlogCategory.tsx` line 18-32 renders a "Category Not Found" page but has no `<meta name="robots" content="noindex" />`. If someone hits `/blog/nonexistent`, it could get indexed.

### 9. `blog-og` Vercel Rewrite Path Is Non-Standard

`vercel.json` line 6: `"/blog-og/:category/:slug"` — this means the SSR HTML is only accessible at `os.thequantumclub.com/blog-og/career-insights/some-slug`, which nobody links to. Social crawlers hit `/blog/career-insights/some-slug` (the SPA), not `/blog-og/...`. The `blog-og` function exists but is effectively unused by any crawler or social platform since nothing points to it.

**Fix**: Either add `<link rel="alternate" type="text/html">` tags pointing crawlers to the `/blog-og/` URL, or (better) serve a minimal SSR fallback at the canonical URL via a different mechanism.

### 10. `author.url` in BlogPosting Schema Is Generic

`BlogSchema.tsx` line 24: `"url": \`${baseUrl}/blog\`` — every author points to the same generic URL. For E-E-A-T, each author should have a distinct profile URL or at minimum a LinkedIn URL.

### 11. Sitemap Missing Image Data

The sitemap generates `<loc>` and `<lastmod>` but no `<image:image>` extensions. Google Image Search relies on sitemap image data for discovery. With all 69 posts having placeholder images, this is moot now but will matter once images are backfilled.

### 12. RSS Feed Has `enclosure length="0"`

`blog-rss/index.ts` line 49: `length="0"` — RSS spec recommends a non-zero byte length for enclosures. Some feed readers skip zero-length enclosures.

---

## Scoring Breakdown

| Area | Score | Notes |
|------|-------|-------|
| Meta Tags | 90 | Titles/descriptions within limits. Article OG tags present. |
| Structured Data | 30 | FAQ never renders (critical). Image dimensions wrong. Speakable present but no FAQ = biggest loss. |
| Crawlability | 65 | Sitemap/RSS/robots all accessible. blog-og exists but nothing links to it. SPA still the canonical. |
| Hero Images | 0 | 100% placeholder. Zero Google Discover/Image eligibility. |
| GEO | 50 | Prompt has GEO rules. AEO box present. But FAQ loss and broken SSR negate much of it. |
| Conversion CTAs | 30 | ScrollCTA param bug means generic CTA always. Category page empty. |
| Author/E-E-A-T | 40 | Authors exist but blog-og outputs wrong names. No author profile pages. |
| Monitoring | 80 | blog-health accurately reports. SEO score formula works. |

**Composite: 62/100**

---

## The Plan: 62 → 100

### Phase 1 — Fix Silent Data Loss (62 → 78)

**1.1 Map `faq_schema` and `ai_generated` in `useDynamicBlogPosts.ts`**
In `transformDBPost()`, add:
- `faqSchema: (dbPost as any).faq_schema || []`
- `ai_generated: dbPost.ai_generated || false`

Add `faqSchema?: Array<{question: string; answer: string}>` and `ai_generated?: boolean` to the `BlogPost` interface in `src/data/blog.ts`.

Update `BlogSchema.tsx` to use `post.faqSchema` instead of `(post as any).faqSchema`.

This single fix restores FAQ rich results for all 69 posts.

**1.2 Fix blog-og author mapping**
Replace the `authorMap` in `blog-og/index.ts` with actual DB author IDs:
```
'tqc-editorial': 'TQC Editorial Team',
'alexandra-chen': 'Alexandra Chen',
'marcus-williams': 'Marcus Williams',
```

**1.3 Fix ScrollCTA param name**
Change `{ categorySlug }` to `{ category }` in `ScrollCTA.tsx`.

**1.4 Fix BlogCategory to use dynamic posts**
Replace `getPostsByCategory` with `useDynamicBlogPostsByCategory` hook. Also add `noindex` to the "Category Not Found" fallback.

### Phase 2 — Fix Schema Accuracy (78 → 85)

**2.1 Fix BlogPosting image dimensions**
When `ogImage` is the fallback GIF (432x540), use those dimensions instead of claiming 1200x630. When it's a real hero image, use 1200x630.

**2.2 Add FAQ rendering in blog-og SSR**
The blog-og edge function already renders FAQ schema in JSON-LD, which is good. But also render the FAQ as visible HTML `<section>` for crawlers that extract text content.

**2.3 Fix RSS enclosure length**
Change `length="0"` to `length="1"` (or omit the attribute if unknown).

### Phase 3 — Content Fixes (85 → 92)

**3.1 Add image sitemap extensions**
Once images are backfilled, add `<image:image>` tags to each `<url>` in the sitemap. For now, prepare the code to include it when `hero_image.url !== '/placeholder.svg'`.

**3.2 Fix `blog-og` Content-Type**
Ensure the response Content-Type is `text/html`. If the edge runtime overrides it, try setting it via a different approach.

**3.3 Add author-specific URLs to BlogPosting schema**
Map each author ID to a LinkedIn URL or author page URL in the JSON-LD `author.url` field.

### Phase 4 — Conversion & Discovery (92 → 97)

**4.1 Make blog-og accessible to social crawlers**
Add `<meta property="og:see_also" content="https://os.thequantumclub.com/blog-og/{category}/{slug}" />` so that developers/validators can test the SSR output. More importantly, ensure the SPA's Helmet tags are comprehensive enough that social crawlers don't need the SSR endpoint.

**4.2 Add structured FAQ section to article body**
Render the FAQ data visually at the bottom of each article (above related articles). This gives crawlers visible Q&A content AND provides additional on-page value for readers.

### Phase 5 — Polish (97 → 100)

**5.1 Update blog-health to check FAQ rendering**
Add a check: "posts where faq_schema exists in DB but wouldn't render on frontend" — this catches future mapping regressions.

**5.2 Add `ItemList` schema to BlogCategory page**
Now that category pages show real posts, the `ItemList` schema should use dynamic post data instead of static.

---

## Files Changed Per Phase

| Phase | Files | Description |
|-------|-------|-------------|
| 1 | `src/data/blog.ts`, `src/hooks/useDynamicBlogPosts.ts`, `src/components/blog/BlogSchema.tsx`, `supabase/functions/blog-og/index.ts`, `src/components/blog/ScrollCTA.tsx`, `src/pages/BlogCategory.tsx` | Fix 4 critical bugs |
| 2 | `src/components/blog/BlogSchema.tsx`, `supabase/functions/blog-og/index.ts`, `supabase/functions/blog-rss/index.ts` | Schema accuracy |
| 3 | `supabase/functions/blog-sitemap/index.ts`, `supabase/functions/blog-og/index.ts` | Content & crawl fixes |
| 4 | `src/pages/BlogPost.tsx` (FAQ section) | Conversion |
| 5 | `supabase/functions/blog-health/index.ts`, `src/pages/BlogCategory.tsx` | Monitoring |

**Phase 1 is the highest-impact fix.** Restoring FAQ schema for 69 posts is the single biggest SEO win — it's already-generated structured data that is silently being thrown away.

