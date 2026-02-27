
# Scale to 20-30+ Posts/Day with Elite SEO and Funnel Integration

## Current State Assessment

**What exists:**
- Blog engine with `blog-generate`, `blog-suggest`, `blog-engine-run` edge functions using Lovable AI Gateway
- `blog_engine_settings` table with `posts_per_day` set to 1, engine is OFF (`is_active: false`)
- 0 posts in the database -- all content is static seed data (2 posts in `src/data/blog.ts`)
- Basic scheduler and queue system
- No cron jobs set up to trigger the engine automatically
- No sitemap, no robots.txt, no programmatic SEO pages

**What is missing for 20-30+ posts/day:**

### Critical Gap 1: No Automation Loop
The `blog-engine-run` function exists but nothing calls it. There is no cron job. The engine generates **one** post per invocation, checks `posts_per_day`, and stops. To produce 30 posts/day, it needs to be called repeatedly throughout the day.

### Critical Gap 2: No Batch Generation
Current flow: suggest 5 topics -> queue -> generate 1 at a time. For 30/day, this needs a batch orchestrator that fills the queue with 30+ topics and processes them in waves with rate-limit-aware delays.

### Critical Gap 3: No SEO Infrastructure
- No `sitemap.xml` (dynamic, pulling from `blog_posts` table)
- No `robots.txt`
- No category landing pages with proper meta tags in the DB-driven flow
- `BlogPost.tsx` reads from static `getPostBySlug()` instead of `useDynamicBlogPost` hook -- DB posts will 404
- No FAQ schema, no HowTo schema, no article schema for AI overview snippets
- No internal linking engine running automatically after generation
- No pagination on the blog listing (showing all posts in one grid will break at 500+ posts)

### Critical Gap 4: No Funnel CTAs
- Sidebar has no CTA to apply or request partnership
- No "Apply to Join" or "Request Partnership" sticky CTA in articles
- Newsletter capture exists but does not lead to the membership funnel
- No mid-article CTA injection for AI-generated posts

---

## Implementation Plan

### Phase 1: Fix the Content Pipeline for Volume

**1a. Create `blog-batch-run` edge function**
A new orchestrator function that:
- Reads `posts_per_day` from settings (set to 30)
- Counts how many posts were already generated today
- Calculates remaining slots
- Checks if queue has enough pending items; if not, calls `blog-suggest` with `autoQueue: true` to refill
- Calls `blog-generate` in a loop with a 3-second delay between calls to avoid rate limits
- Logs progress and handles 429 errors with exponential backoff
- After all posts generated, calls `blog-relate` to update internal links
- This single function can be called once per hour by a cron job, and it will self-regulate based on daily limits

**1b. Set up pg_cron job to trigger the batch**
SQL to schedule `blog-batch-run` every hour during the publishing window (09:00-17:00 UTC). Also schedule `blog-scheduler` every 5 minutes to auto-publish scheduled posts.

**1c. Update `blog_engine_settings.posts_per_day` to 30**
And set `is_active` to true once everything is wired up.

### Phase 2: Fix the Critical BlogPost.tsx Bug

**2a. Switch BlogPost.tsx to use dynamic hooks**
Currently it imports `getPostBySlug` from static data. AI-generated posts from the DB will show "Article Not Found". Replace with `useDynamicBlogPost(category, slug)` hook that already exists and checks the DB first, falling back to static.

### Phase 3: SEO Infrastructure

**3a. Create `blog-sitemap` edge function**
Generates a dynamic XML sitemap from `blog_posts` table (status = 'published'). Returns proper `<?xml>` with `<url>`, `<lastmod>`, `<changefreq>`, `<priority>` per post. Also includes category index pages.

**3b. Create `blog-robots` edge function**
Returns a proper `robots.txt` pointing to the sitemap URL, allowing all crawlers, disallowing admin routes.

**3c. Add pagination to Blog.tsx**
At 30 posts/day, within a month there will be 900+ posts. The grid needs "Load More" or infinite scroll. Implement a simple "Show more" button that loads 12 posts at a time, with URL-synced page parameter for SEO.

**3d. Enhance AI-generated article SEO**
Update the `blog-generate` prompt to also produce:
- `faqSchema`: Array of {question, answer} pairs (3-5 per article) for FAQ structured data
- Longer, more detailed articles (2000+ words target) with more headings for featured snippet capture
- Internal link suggestions (references to other TQC content)

**3e. Add FAQ Schema to BlogPost page**
Render `<script type="application/ld+json">` with FAQPage schema from the post's FAQ data. This wins Google AI Overview and "People Also Ask" placements.

### Phase 4: Funnel Integration

**4a. Add funnel CTAs to ArticleSidebar**
Two sticky cards in the sidebar:
- "For Exceptional Talent" -- Apply to become a member. Links to `/auth` or `/onboarding`
- "For Companies" -- Request a partnership. Links to `/partnerships` or a contact form

**4b. Add mid-article CTA injection**
In `ArticleContent.tsx`, after every 3rd content block, inject a subtle inline CTA:
- "Explore how The Quantum Club connects top-tier talent with exceptional opportunities." with a link to apply
- Alternate between member and partnership CTAs
- These should be visually distinct but not intrusive (match the editorial callout style)

**4c. Add exit-intent / scroll-depth CTA**
A subtle bottom banner that appears after 60% scroll depth: "Ready for your next move?" with Apply / Partner buttons. Not a popup -- a fixed bottom bar that slides in.

### Phase 5: Content Quality and Differentiation

**5a. Upgrade the generation prompt**
- Require 2000+ word articles with 6-8 H2 sections
- Include real data points, statistics, and specific examples (instruct AI to reference industry benchmarks)
- Add author rotation (cycle through the 3 defined authors)
- Generate articles in all 7 content formats across all 4 categories for maximum topic coverage
- Include a "Key Insight" pullquote in every article

**5b. Auto-categorize and tag for topic clusters**
Update `blog-suggest` to think in topic clusters: pillar pages + supporting articles. Each suggestion should include a `cluster_id` linking it to a pillar topic, creating a tight internal linking web that signals topical authority to search engines.

---

## Files Created/Modified

| File | Action |
|---|---|
| `supabase/functions/blog-batch-run/index.ts` | **Create** -- Batch orchestrator |
| `supabase/functions/blog-sitemap/index.ts` | **Create** -- Dynamic XML sitemap |
| `supabase/functions/blog-robots/index.ts` | **Create** -- robots.txt |
| `supabase/functions/blog-generate/index.ts` | **Modify** -- Enhanced prompt for longer articles, FAQ, internal links |
| `supabase/functions/blog-suggest/index.ts` | **Modify** -- Suggest 10 topics per call, cluster-aware |
| `src/pages/BlogPost.tsx` | **Modify** -- Use `useDynamicBlogPost` instead of static lookup |
| `src/pages/Blog.tsx` | **Modify** -- Add pagination (load more) |
| `src/components/blog/ArticleSidebar.tsx` | **Modify** -- Add funnel CTAs |
| `src/components/blog/ArticleContent.tsx` | **Modify** -- Mid-article CTA injection |
| `src/components/blog/BlogSchema.tsx` | **Modify** -- Add FAQ schema support |
| `src/components/blog/ScrollCTA.tsx` | **Create** -- Scroll-depth bottom CTA bar |
| SQL (insert, not migration) | Set up pg_cron jobs for blog-batch-run and blog-scheduler |
| SQL (insert, not migration) | Update blog_engine_settings to posts_per_day=30 |

## SEO Strategy Summary

The combination of:
1. **Volume** (30+ unique, long-form articles/day across 4 categories)
2. **Topic clusters** (pillar + supporting articles with tight internal links)
3. **Structured data** (BlogPosting + FAQ + BreadcrumbList schemas)
4. **Dynamic sitemap** (auto-updated, submitted to search engines)
5. **Funnel CTAs** (every article drives to Apply or Partner)
6. **Content quality** (2000+ words, expert-attributed, data-driven)

...creates a content moat that is extremely difficult to compete with, while every visitor is one click away from entering the TQC funnel.

## Important Notes

- At 30 posts/day, Lovable AI credits will be consumed at a meaningful rate. Monitor usage in Settings > Workspace > Usage.
- Rate limiting: the batch runner includes 3-second delays between generations and exponential backoff on 429 errors.
- The `blog-batch-run` function is designed to be idempotent -- safe to call multiple times; it checks daily counts before generating.
- Pagination prevents the blog listing from becoming unusable as content scales.
