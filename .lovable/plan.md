

# Blog Engine Audit — Ruthless Score: 52/100

The plan in `.lovable/plan.md` is about the **email system**, not the blog engine. It scores 0 for blog relevance — it needs to be replaced entirely. Here is the real blog engine audit.

---

## Current State — What is Actually Broken

### CRITICAL: 7 Bugs That Make This System Unreliable

**1. `blog-health` queries non-existent column (line 40)**
`.gte('updated_at', last24h)` on `blog_analytics` — that table has no `updated_at` column (only `created_at`). The analytics health check silently returns 0 every time. Your monitoring is lying to you.

**2. Dashboard shows 0 for everything (BlogEngine.tsx lines 48-53)**
- `a.views` → column is `page_views`
- `a.avg_scroll_depth` → column is `scroll_depth`
- `a.completions` → column does not exist at all

The admin dashboard is entirely decorative — every stat shows 0 or NaN.

**3. `blog-relate` upserts fail silently (line 66-71)**
Uses `onConflict: 'source_post_id,related_post_id'` but `blog_post_relations` has NO unique constraint on those columns. Result: either duplicate rows or silent errors. 0 relations exist. Related articles feature is dead.

**4. `blog-relate` writes to wrong column (line 69)**
Writes `relevance_score` but the column is named `similarity_score`. Every upsert fails.

**5. `content_format` never stored (blog-generate line 322-337)**
The insert object omits `content_format`. All 84 posts have `content_format = NULL` despite the column existing and the format being computed on line 42.

**6. 13 posts have meta titles >55 chars, 15 have descriptions >155 chars**
Generated before prompt optimization. Violate the strict SEO constraints.

**7. `RelatedArticles` component shows random posts, not related ones**
`useDynamicBlogPosts.ts` hardcodes `relatedArticles: []`. The component receives posts passed from parent — but no parent ever queries `blog_post_relations`.

### HIGH: Security Holes

**8. RLS allows ANY authenticated user to delete all blog posts**
`blog_posts`, `blog_generation_queue`, `blog_engine_settings`, `blog_learnings`, `blog_content_signals` all have `USING (true) WITH CHECK (true)` for ALL operations for any `authenticated` user. A candidate could delete every post.

**9. `blog_analytics` is publicly insertable and updatable (lines 89-99)**
Any anonymous user can inflate page views or corrupt analytics data by calling the API directly.

### MEDIUM: Missing Cost Tracking

**10. Zero AI usage logging for blog functions**
`blog-generate` uses the AI gateway but never calls `logAIUsage()`. `blog-generate-image` same. Other AI functions (interview reports, quick replies, etc.) all use the shared `ai-logger.ts`. Blog functions are the only ones that skip it. You have no idea how much content generation costs.

**11. No cost calculation**
Even if logging existed, there's no cost-per-article calculation. The `ai_usage_logs` table captures `tokens_used` but blog functions don't report tokens. The AI gateway response includes `usage.total_tokens` but it's never extracted.

### LOW: Polish Issues

**12. 55-70 posts still have placeholder hero images** — operational, not code.

**13. `blog-refresh` identifies stale posts but never refreshes them** — it's read-only.

**14. Newsletter system is scaffolded but non-functional** — 0 subscribers, no send function.

---

## Scoring Breakdown (Ruthless)

| Dimension | Max | Score | Why |
|-----------|-----|-------|-----|
| Data Integrity | 15 | 3 | Dashboard reads wrong columns. Relations table empty. content_format never stored. |
| Security | 15 | 3 | RLS wide open. Analytics publicly writable. Any user can destroy all content. |
| Monitoring | 15 | 4 | blog-health queries non-existent column. Dashboard shows all zeros. |
| Cost Tracking | 10 | 0 | Zero. No logging, no token counting, no cost attribution. |
| SEO/Distribution | 15 | 12 | Schemas, sitemap, RSS, OG all work. Minor: meta violations on 28 posts. |
| Content Pipeline | 15 | 10 | Generation works. Queue claiming works. But format not stored, relations broken. |
| Analytics Pipeline | 10 | 8 | blog-track writes correctly. blog_analytics aggregation works. Just health/dashboard reads are broken. |
| Admin UX | 5 | 2 | Dashboard is all zeros. Learnings and A/B test panels are scaffolded. |

**Total: 52/100** (I was too generous at 72 last time — the security and data bugs are worse than I estimated.)

---

## The Plan: 52 → 100

### Phase 1 — Fix Broken Queries (3 files)

**1.1 `blog-health/index.ts` line 40**: Change `.gte('updated_at', last24h)` to `.gte('created_at', last24h)`.

**1.2 `BlogEngine.tsx` lines 48-53**: Fix column mappings:
```
a.views → a.page_views
a.avg_scroll_depth → a.scroll_depth
remove a.completions entirely (column doesn't exist)
```

**1.3 `blog-relate/index.ts` line 69**: Change `relevance_score` to `similarity_score`.

### Phase 2 — Fix Schema & Data (SQL migration)

**2.1** Add unique constraint: `ALTER TABLE blog_post_relations ADD CONSTRAINT uq_source_related UNIQUE (source_post_id, related_post_id);`

**2.2** Drop and replace overly permissive RLS policies on `blog_posts`, `blog_generation_queue`, `blog_engine_settings`, `blog_learnings`, `blog_content_signals` with `has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'strategist')` for write operations. Keep public SELECT on published posts.

**2.3** Replace `blog_analytics` INSERT/UPDATE policies: restrict to service role only (edge functions use service_role key already, so public policies are unnecessary and dangerous).

**2.4** Truncate meta violations: UPDATE 13 titles to 55 chars, 15 descriptions to 155 chars.

### Phase 3 — Add Cost Tracking (2 files)

**3.1 `blog-generate/index.ts`**: After AI response, extract `aiResult.usage.total_tokens` (or `prompt_tokens + completion_tokens`). Call `logAIUsage()` with `functionName: 'blog-generate'`, `tokensUsed`, `responseTimeMs`, `success`. Also store `content_format` in the blog_posts insert.

**3.2 `blog-generate-image/index.ts`**: Same pattern — log usage after image generation with `functionName: 'blog-generate-image'`.

### Phase 4 — Wire Related Articles

**4.1** After fixing blog-relate, trigger it to populate relations for all 84 posts.

**4.2** Update the blog post detail page to query `blog_post_relations` and pass actual related posts to `RelatedArticles` component instead of empty array.

### Files Changed

| Phase | Files | Description |
|-------|-------|-------------|
| 1 | `blog-health/index.ts`, `BlogEngine.tsx`, `blog-relate/index.ts` | Fix wrong column names |
| 2 | SQL migration | Unique constraint, RLS tightening, meta fixes |
| 3 | `blog-generate/index.ts`, `blog-generate-image/index.ts` | AI usage logging + cost tracking + content_format |
| 4 | `useDynamicBlogPosts.ts` or blog post page | Wire related articles from DB |

**Total: 5 edge functions + 1 frontend file + 1 migration. Every change fixes a real bug — zero new features.**

