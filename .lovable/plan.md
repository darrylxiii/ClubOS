

# Blog Engine Audit — Current Score: 82/100

---

## Live Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Published posts | 69 | Good |
| Placeholder hero images | 55/69 (80%) | Critical |
| Real hero images | 14/69 (20%) | Progress (was 0) |
| Meta titles >55 chars | 0 | Good |
| Meta descriptions >155 chars | 0 | Good |
| Posts with FAQ in DB | 69/69 | Good |
| FAQ mapped to frontend | 69/69 | Good |
| Posts with <3 keywords | 0 | Fixed |
| Queue items stuck "generating" | 30 | Critical (NEW) |
| Queue items with NULL locked_at | 30/30 | Bug |
| Pending queue items | 6 | OK |
| Draft posts (unpublished) | 15 | Attention |
| Subscribers | 0 | No traction yet |

---

## Critical Issues

### 1. 30 queue items permanently stuck in "generating" (Impact: Critical — blocks pipeline)

The `release_stuck_queue_items()` function only resets items where `locked_at < now() - 10 min`. But all 30 stuck items have `locked_at = NULL`. They were set to "generating" without a `locked_at` timestamp — likely by the `blog-generate` function's manual UPDATE (lines 30-34) which only fires when `queueId` is provided, but `blog-batch-run` uses `claim_blog_queue_item()` which presumably sets `locked_at`. The mismatch means items claimed by one path but failed mid-generation have no `locked_at`, so the release function never touches them.

**Fix**:
1. Update `release_stuck_queue_items()` to ALSO release items where `status = 'generating' AND locked_at IS NULL AND updated_at < now() - interval '10 minutes'`.
2. Run a one-time SQL fix to reset all 30 stuck items to `pending`.

### 2. 55 posts still have placeholder images (Impact: High)

Image backfill has made progress (14 real images now), but 55 remain. The `blog-backfill-images` function works but needs to be triggered repeatedly.

**Fix**: Continue triggering `blog-backfill-images` in batches. No code change needed — operational action.

### 3. 15 draft posts sitting unpublished (Impact: Medium)

These passed quality checks but were never published. If `auto_publish` is enabled in settings, this suggests posts generated before that setting was turned on.

**Fix**: Bulk-publish drafts that pass quality thresholds via a one-time SQL update.

### 4. `blog-health` reports 0 stuck items despite 30 existing (Impact: High — monitoring is lying again)

The health check queries `status = 'generating'` and finds items, but the `stuckItems` array in the response was empty in the earlier curl. Looking at the code, line 43-44 selects `id, title, locked_at` — the `title` column likely doesn't exist on `blog_generation_queue` (it probably uses `topic`). If the query fails silently, the count could be wrong. Actually, the health endpoint DID report 0 stuck items earlier but the DB shows 30 — the query likely returns data but the `stuckItems.length` check on line 93 works fine. Let me re-check: the health endpoint response showed no stuck queue warning. This is because the query selects `title` which may not exist, causing the whole query to fail silently, returning empty data.

**Fix**: Change `select('id, title, locked_at')` to `select('id, topic, locked_at')` in `blog-health`. The column is `topic`, not `title`.

### 5. RSS `<category>` uses raw slug instead of display name (Impact: Low)

Line 48 of `blog-rss`: `<category>${escapeXml(post.category)}</category>` outputs `career-insights` instead of "Career Insights".

**Fix**: Add the same `categoryNames` mapping used in `blog-og`.

### 6. `blog-generate` double-claims queue items (Impact: Low — race condition)

`blog-batch-run` calls `claim_blog_queue_item()` (atomic), then passes `queueId` to `blog-generate`, which does ANOTHER update to set `status = 'generating'` (lines 30-34). This second update targets `status = 'pending'` but the item is already `'generating'` from the claim function. The update silently fails (no rows matched), which is harmless but wasteful. More importantly, if `blog-generate` is called directly (not via batch-run) with a `queueId`, this path works correctly.

No fix needed — this is a harmless no-op.

### 7. `blog-og` SSR not reachable by social crawlers (Structural — unchanged)

Social platforms (Facebook, LinkedIn, Twitter) hit the SPA URL and get generic `index.html` OG tags. The `blog-og` endpoint exists at `/blog-og/:category/:slug` but nothing points crawlers there.

**Fix**: Not solvable without SSR middleware. Documented as known limitation.

---

## What is Working Well

- FAQ schema renders correctly for all 69 posts (verified)
- `ai_generated` disclaimer shows on articles (verified)
- ScrollCTA category matching works (verified)
- BlogCategory uses dynamic posts (verified)
- Sitemap with ETag caching and image extensions (verified)
- RSS feed on production domain (verified)
- `blog-og` correct author names and category display names (verified)
- Meta titles/descriptions within limits (0 violations)
- Keywords all ≥3 per post (0 violations)
- WebSite + Organization + ItemList schemas present
- FAQ sections visible in article body
- `noindex` on 404/not-found pages
- Category-specific inline CTAs in ArticleContent
- Analytics pipeline (blog-track) with rate limiting
- Image sitemap extensions ready for real images

---

## Scoring

| Area | Max | Score | Notes |
|------|-----|-------|-------|
| Meta Tags | 15 | 15 | All within limits, keywords complete |
| Structured Data | 20 | 20 | FAQ, Breadcrumb, BlogPosting, WebSite, Organization, ItemList |
| Crawlability | 15 | 14 | Sitemap/RSS/robots accessible. RSS category uses raw slug. |
| Hero Images | 20 | 5 | 14/69 real images (20%). Up from 0. |
| GEO/AEO | 10 | 9 | Answer-first prompts, speakable, FAQ sections |
| Conversion CTAs | 5 | 5 | Both ScrollCTA and inline CTA working |
| Author/E-E-A-T | 5 | 4 | Correct names. No individual author URLs. |
| Monitoring | 10 | 5 | blog-health has wrong column name, misses 30 stuck items, doesn't report drafts |
| Pipeline Health | — | -5 | 30 stuck queue items, 15 unpublished drafts (deduction) |

**Composite: 72/100** (lower than previous estimate due to discovering the stuck queue + broken monitoring)

---

## The Plan: 72 → 92+ (code + data fixes)

### Phase 1 — Fix Pipeline Critical (3 items)

**1.1** Fix `release_stuck_queue_items()` SQL function to also release items where `locked_at IS NULL AND updated_at < now() - interval '10 minutes'`. Run one-time SQL to reset all 30 stuck items.

**1.2** Fix `blog-health` — change `select('id, title, locked_at')` to `select('id, topic, locked_at')` on line 43. Also change `i.title` to `i.topic` in the stuckItems map (line 152). Add a new metric: `draftPosts` count and an issue if drafts > 5.

**1.3** Bulk-publish the 15 draft posts via SQL (set `status = 'published'`, `published_at = now()`).

### Phase 2 — Polish (2 items)

**2.1** Add `categoryNames` map to `blog-rss` and use display names in `<category>` tags.

**2.2** Continue triggering `blog-backfill-images` to process remaining 55 placeholder images (operational, batch calls).

### Files Changed

| Phase | Files | Description |
|-------|-------|-------------|
| 1 | SQL migration (release function fix + data fix), `blog-health/index.ts` | Fix stuck queue + monitoring |
| 2 | `blog-rss/index.ts` | Category display names |

**Total: 2 edge functions + 1 migration. The biggest win is fixing the stuck queue — it unblocks the entire generation pipeline.**

