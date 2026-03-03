

# Critique of the Current Blog Engine Plan — Score: 38/100

The previous audit identified real problems but is fundamentally flawed in diagnosis depth, prioritization, and completeness. Here is what it got wrong and what a real 100/100 plan looks like.

---

## What the Previous Plan Got Wrong

### 1. Misdiagnosed the analytics failure (Impact: Critical)

The plan says the client sends `type` / `data` while the server expects `eventType` / `eventData`. This is correct. But the plan fails to identify that **`blog-track` itself writes to columns that do not exist**:

- Line 49: writes `avg_scroll_depth` — column is actually `scroll_depth`
- Line 51: writes `completions` — column does not exist at all
- Line 65: writes `views` — column is actually `page_views`

The server-side function would crash even if the client sent correct field names. The plan treats this as two separate bugs (client mismatch + analyzer column mismatch) when it is actually three: client fields, tracker columns, and analyzer columns. Missing the tracker column bug means Phase 1 would still produce zero analytics data.

### 2. Ignores that `sendBeacon` cannot authenticate (Impact: High)

The plan mentions `sendBeacon` needs `Content-Type` but misses the deeper issue: `sendBeacon` cannot set custom headers at all. The edge function requires `Authorization: Bearer <anon_key>`. Exit events will always fail at the auth layer. The fix requires either:
- Making `blog-track` accept unauthenticated requests (it uses service role key anyway, so the auth header is irrelevant — but the edge function gateway may still reject)
- Or using `fetch` with `keepalive: true` instead of `sendBeacon`

### 3. Hero image fix is naive (Impact: Medium)

"Call `blog-generate-image` from `blog-generate` after article creation" sounds simple but:
- `blog-generate-image` calls a model (`gemini-2.5-flash-image`) that may not exist or may not be the correct model name (the supported list shows `google/gemini-3-pro-image-preview` for image generation)
- The image generation adds 10-30s to each article generation, and `blog-batch-run` already runs 5 articles sequentially within a single edge function invocation (max 150s timeout). Adding image gen will cause timeouts.
- The plan proposes no async/background approach.

### 4. RLS fix is incomplete (Impact: Critical)

The plan says "restrict write access to admin/strategist roles" but does not address:
- `blog_post_relations` has `ALL` for `authenticated` with `qual: true` — any logged-in user can manipulate relations
- `blog_reactions` has `ALL` for `public` with `qual: true` — any anonymous user can delete all reactions
- The plan does not specify whether `blog_analytics` and `blog_page_views` INSERT policies (currently public) should remain open (they should, for anonymous tracking)

### 5. Missing entire failure modes

- **No error recovery in batch pipeline**: If `blog-generate` fails mid-batch, the queue item is left in `generating` status forever. No cleanup, no retry, no dead-letter queue.
- **No idempotency**: If `blog-engine-run` is invoked twice simultaneously (e.g., cron overlap), it processes the same queue item twice, creating duplicate articles.
- **No content validation on the frontend**: `ArticleContent.tsx` renders `block.content` with `dangerouslySetInnerHTML`-adjacent patterns (Markdown in strings). AI-generated content could include malicious markup.
- **`blog-suggest` has no dedup against the queue**: It checks existing post titles but not pending queue items. If the queue has 8 pending items on "leadership," suggest will propose 10 more leadership topics.
- **Static data fallback masks DB failures**: `useDynamicBlogPosts` falls back to static `blogPosts` on error. This means a broken DB connection silently serves stale content with no alerting.

### 6. SEO section is superficial

- The plan mentions "pre-rendering / SSG" without acknowledging this is architecturally impossible in a pure Vite SPA without a server. You cannot add SSR to Vite without a framework (e.g., vite-plugin-ssr). The actual fix is either: (a) a pre-render build step that generates static HTML for each published route, or (b) serving blog content from edge functions as full HTML pages.
- The sitemap edge function (`blog-sitemap`) already uses the production domain — the plan claims it points to the edge function domain without verifying.
- No mention of `robots` meta tags for draft/failed posts that might be accessible via direct URL.

### 7. Missing from the plan entirely

- **No monitoring or alerting**: 69 published posts, 0 analytics rows, 0 page views — this went unnoticed for the entire lifespan of the blog. No health check, no "analytics pipeline is dead" alert.
- **No content moderation**: AI-generated articles go from draft to published with zero human review pathway. The `require_medical_review` flag exists but is a misnomer and unused.
- **No rate limiting on public endpoints**: `blog-track` accepts unlimited anonymous inserts into `blog_page_views`. A bot could fill the database.
- **No image storage bucket verification**: `blog-generate-image` uploads to a `blog-images` storage bucket that may not exist. No bucket creation in any migration.
- **`blog-scheduler`**: Referenced but never examined. Does it work? Does it even have a cron trigger?
- **No RSS feed**: Standard blog distribution channel, completely absent.
- **Fake social proof**: `Math.floor(Math.random() * 500) + 100` is called out but the plan proposes "replace with actual page view counts" — which are zero. The real fix is to remove it entirely until real data exists.

---

## The Real Plan: 38 → 100

### Phase 1 — Make Analytics Actually Work (38 → 52)

**1.1 Fix `useBlogAnalytics.ts` client payload**
- Rename `type` → `eventType`, `data` → `eventData` in `sendEvent`
- Replace `sendBeacon` with `fetch(..., { keepalive: true })` to allow headers
- Map client event types to match server expectations: `page_view` stays, `scroll` → `scroll_depth`, `cta_click` → `cta_click`, `exit` → `exit`
- Add `deviceType` to page_view insert on the server side

**1.2 Fix `blog-track` column names**
- `views` → `page_views`
- `avg_scroll_depth` → `scroll_depth`
- Remove `completions` (column does not exist)
- Add handling for `time_update` event type (currently silently dropped) — update `blog_page_views.time_on_page`
- Add handling for `exit` event — update `blog_page_views.time_on_page` and `max_scroll_depth`

**1.3 Fix `blog-analyze` column references**
- `a.views` → `a.page_views`
- `a.avg_scroll_depth` → `a.scroll_depth`
- Remove `completions` from score formula
- Replace with: `score = (page_views * 0.3) + (scroll_depth * 0.3) + (cta_clicks * 10 * 0.2) + ((1 - bounce_rate) * 100 * 0.2)`

**1.4 Remove fake social proof**
- Delete `socialProofCount: Math.floor(Math.random() * 500) + 100` from `useDynamicBlogPosts.ts`
- Remove `socialProofCount` display from blog card/article components (or show nothing until real data exists)

### Phase 2 — Fix Security (52 → 65)

**2.1 Tighten RLS policies** (DB migration)
- `blog_posts`: Replace `ALL` for `authenticated` with separate policies:
  - SELECT for `public` WHERE `status = 'published'` (already exists)
  - INSERT/UPDATE/DELETE for admin/strategist only (use `has_role()`)
- `blog_engine_settings`: ALL → admin only
- `blog_generation_queue`: ALL → admin/strategist only
- `blog_learnings`: ALL → admin/strategist only
- `blog_content_signals`: ALL → admin/strategist only
- `blog_post_relations`: Replace `ALL authenticated` with admin/strategist write, public read
- `blog_reactions`: Replace `ALL public` with:
  - INSERT for public (anyone can react)
  - SELECT for public
  - DELETE only own reactions (match `anonymous_id` or `user_id`)
  - No UPDATE

**2.2 Add rate limiting to `blog-track`**
- Track requests per `anonymous_id` per minute using in-memory map
- Reject if >60 events/minute from same ID

### Phase 3 — Fix the Generation Pipeline (65 → 78)

**3.1 Add idempotency to queue processing**
- Use `UPDATE ... SET status = 'generating' WHERE status = 'pending' RETURNING *` instead of SELECT then UPDATE (atomic claim)
- Add `locked_at` timestamp column; release locks after 5 minutes (dead lock recovery)

**3.2 Fix stuck queue items**
- Add a cleanup step at the start of `blog-batch-run`: reset items stuck in `generating` for >10 minutes back to `pending`

**3.3 Generate hero images asynchronously**
- After `blog-generate` inserts the post, fire-and-forget a call to `blog-generate-image` (don't await)
- Fix the model name in `blog-generate-image`: use `google/gemini-3-pro-image-preview` (actual supported model)
- Ensure `blog-images` storage bucket exists (add migration if needed)
- If image gen fails, the post keeps `/placeholder.svg` — acceptable degradation

**3.4 Add topic deduplication in `blog-suggest`**
- Before inserting suggestions into queue, check Levenshtein distance against existing queue items (not just published posts)
- Reject suggestions with >80% title similarity to any existing post or pending queue item

**3.5 Fix read time calculation**
- In `useDynamicBlogPosts.ts`, replace `Math.ceil((content?.length || 5) * 1.5)` with actual word count: `Math.ceil(totalWords / 200)`
- Count words across all content blocks

### Phase 4 — Wire Up Broken Features (78 → 88)

**4.1 Connect newsletter capture to database**
- Create `blog_subscribers` table (email, subscribed_at, source, unsubscribed_at)
- Replace `await new Promise(r => setTimeout(r, 500))` with actual insert
- Add duplicate-email check
- Remove the fake "2,400+ professionals" copy or replace with real count

**4.2 Connect related articles to DB**
- In `BlogPost.tsx`, replace `getRelatedPosts(post.id, 3)` (which reads static data) with a query to `blog_post_relations` table
- Auto-run `blog-relate` at the end of `blog-batch-run` for newly created posts

**4.3 Add editorial review status**
- Add `review` as a valid status between `draft` and `published`
- In admin dashboard, add a "Review" tab showing articles awaiting approval
- Populate `reviewedBy` field when an admin/strategist approves

**4.4 Wire `blog-scheduler`**
- Allow setting `published_at` to a future date with status `scheduled`
- Add pg_cron job (or manual trigger) that publishes `scheduled` posts when `published_at <= now()`

### Phase 5 — SEO and Distribution (88 → 95)

**5.1 Per-article OG images**
- In `BlogPost.tsx` Helmet, use `post.heroImage.url` for `og:image` instead of global GIF
- Only fall back to global GIF if hero is `/placeholder.svg`

**5.2 Add RSS feed**
- Create `blog-rss` edge function that returns XML feed of published posts
- Link from `<head>` with `<link rel="alternate" type="application/rss+xml">`

**5.3 Validate blog-sitemap domain**
- Verify `blog-sitemap` uses `os.thequantumclub.com` (audit showed this may already be correct — confirm)

**5.4 Block direct access to draft/failed posts**
- In `useDynamicBlogPost`, ensure the query filters `status = 'published'` (already does — verify no bypass via static fallback)

### Phase 6 — Observability and Polish (95 → 100)

**6.1 Add pipeline health monitoring**
- Create a `blog-health` edge function that checks:
  - Page views inserted in last 24h
  - Analytics aggregated in last 24h
  - Queue items stuck in `generating`
  - Posts with placeholder images
- Surface this in admin dashboard

**6.2 Add AI content disclaimer**
- Add subtle "This article was generated with AI assistance" footer on AI-generated posts
- Per Google's Search Essentials guidelines for AI content

**6.3 Add article preview in admin**
- Allow viewing a draft article rendered in the blog layout before publishing

**6.4 Fix ExpertReviewBadge**
- Currently dead UI (never populated). Connect to the `reviewedBy` field added in Phase 4

---

## Files Changed Per Phase

| Phase | Files | Edge Functions | Migrations |
|-------|-------|---------------|------------|
| 1 | 2 frontend | 2 (blog-track, blog-analyze) | 0 |
| 2 | 0 | 0 | 1 (RLS policies) |
| 3 | 1 (useDynamicBlogPosts) | 3 (blog-batch-run, blog-generate-image, blog-suggest) | 1 (locked_at column) |
| 4 | 3 (NewsletterCapture, BlogPost, admin) | 2 (blog-relate, blog-scheduler) | 1 (blog_subscribers table) |
| 5 | 1 (BlogPost Helmet) | 2 (blog-rss, blog-sitemap) | 0 |
| 6 | 2 (admin dashboard, article page) | 1 (blog-health) | 0 |

**Total: ~9 frontend files, ~10 edge functions, ~3 migrations across 6 phases.**

Phase 1 should be implemented first — it unblocks all downstream analytics, scoring, and refresh logic.

