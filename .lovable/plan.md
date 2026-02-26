

# Copy Full Blog System from Angel Acid to The Quantum Club

## Overview

This plan migrates the complete blog system from your Angel Acid project into The Quantum Club. The system includes a public blog with search/categories, an AI-powered content generation engine, analytics tracking, and an admin dashboard. All content and branding will be adapted to The Quantum Club's identity (career insights, talent, professional growth instead of gut health/probiotics).

---

## What Gets Copied

### Frontend Pages (3 pages)
- **Blog listing page** -- hero, search, category filters, featured post, article grid, newsletter capture
- **Blog post page** -- reading progress, breadcrumbs, table of contents, article content, social sharing, reactions, related articles, floating share bar
- **Blog category page** -- filtered view by category with breadcrumbs

### Frontend Components (27 components)
All from `src/components/blog/`: ArticleContent, ArticleReactions, ArticleSidebar, AuthorCard, BlogCard, BlogCardSkeleton, BlogErrorBoundary, BlogExitPopup, BlogFeatured, BlogGrid, BlogHero, BlogSchema, BlogSearch, BlogStickyBar, CategoryPills, FloatingShareBar, MedicalReviewBadge (renamed to ExpertReviewBadge), NewsletterCapture, ProductCallout (renamed to CTACallout), ReadingProgress, RelatedArticles, SaveForLater, SnippetOptimizedList, SocialShareButtons, TableOfContents, AEOSummaryBox, index.ts barrel

### Admin Components (4 components + 1 page)
- **BlogEngine page** -- main admin dashboard with tabs (Dashboard, Queue, Articles, A/B Tests, Learnings, Settings)
- **BlogQueueTable** -- content generation queue management
- **BlogArticleManager** -- article CRUD, image generation, scheduling
- **BlogLearningsPanel** -- AI learning insights display
- **BlogEngineControlModal** -- engine on/off, daily limits, format/category selection

### Hooks (5 hooks)
- `useDynamicBlogPosts` -- fetch posts from DB + static fallback
- `useBlogAnalytics` -- page view, scroll depth, CTA click tracking
- `useBlogGeneration` -- AI content generation queue management
- `useBlogEngineSettings` -- engine configuration CRUD
- `useReadingList` -- bookmark/save-for-later functionality

### Data Layer (1 file)
- `src/data/blog.ts` -- types (Author, BlogPost, BlogCategory, ContentBlock), static seed posts, helper functions. **Re-branded**: categories become Career Insights, Talent Strategy, Industry Trends, Leadership; authors become TQC thought leaders

### Backend Functions (7 edge functions)
- `blog-generate` -- AI article generation with 7 format blueprints, re-branded for TQC
- `blog-suggest` -- AI topic suggestions based on content gaps and signals
- `blog-track` -- analytics event tracking (page views, scroll, CTA clicks, exits)
- `blog-analyze` -- performance scoring and pattern learning
- `blog-engine-run` -- automated daily content generation
- `blog-scheduler` -- publish scheduled posts at their designated time
- `blog-generate-image` -- AI hero image generation using Gemini
- `blog-refresh` -- identify stale content for refresh
- `blog-relate` -- calculate related articles via text similarity

---

## Database Tables (9 new tables)

| Table | Purpose |
|---|---|
| `blog_posts` | Articles with title, slug, content (JSONB), category, status, SEO fields, AI flags |
| `blog_generation_queue` | Topics queued for AI generation |
| `blog_analytics` | Daily aggregated metrics per post |
| `blog_page_views` | Raw page view events |
| `blog_bookmarks` | User/anonymous reading list |
| `blog_learnings` | AI-discovered content patterns |
| `blog_engine_settings` | Engine configuration (single row) |
| `blog_content_signals` | Business signals that influence topic selection |
| `blog_post_relations` | Computed related-article links |
| `blog_post_variants` | A/B test variants |

All tables get RLS policies. Public-facing tables (blog_posts published, blog_page_views, blog_bookmarks) allow anonymous reads/inserts where appropriate. Admin tables require authenticated users.

Storage bucket: `blog-images` for AI-generated hero images.

---

## Branding Adaptations

All Angel Acid references are replaced with The Quantum Club identity:

- **Categories**: Gut Health -> Career Insights, Probiotics -> Talent Strategy, Recipes -> Industry Trends, Science -> Leadership
- **Authors**: Dr. Sarah Johnson -> TQC editorial personas (e.g., "The Quantum Club Editorial", strategist profiles)
- **Tone**: Shifted from biohacking/luxury wellness to calm, discreet, competent professional tone per TQC brand guidelines
- **AI System Prompt**: Rewritten for career/talent content strategy instead of supplement marketing
- **Content Formats**: Protocol -> Career Playbook, Comparison -> Market Analysis, Case Study -> Success Story, etc.
- **SEO**: All meta titles/descriptions use "The Quantum Club" branding
- **Product callouts**: Removed product references; replaced with role-matching or platform CTAs

---

## Routes Added

| Route | Component |
|---|---|
| `/blog` | Blog listing page |
| `/blog/:category` | Category filtered view |
| `/blog/:category/:slug` | Individual article |
| `/admin/blog-engine` | Admin blog engine dashboard |

---

## Implementation Sequence

1. Create all 9 database tables with RLS policies and seed the engine settings row
2. Create the `blog-images` storage bucket
3. Add `src/data/blog.ts` with TQC-branded types, categories, authors, and seed posts
4. Add all 27 blog components under `src/components/blog/`
5. Add 4 admin components under `src/components/admin/`
6. Add 5 hooks
7. Add 3 pages (Blog, BlogPost, BlogCategory) + BlogEngine admin page
8. Add routes to the router
9. Deploy all 9 edge functions (blog-generate, blog-suggest, blog-track, blog-analyze, blog-engine-run, blog-scheduler, blog-generate-image, blog-refresh, blog-relate)

---

## Technical Notes

- All edge functions use the Lovable AI Gateway (no external API keys needed)
- The `blog-track` edge function accepts unauthenticated requests (for `sendBeacon` exit tracking)
- Anonymous tracking uses `getAnonymousId()` -- a utility that will be added if not already present in this project
- The `useDynamicBlogPosts` hook merges database posts with static seed posts, so the blog works immediately with seed content before any AI generation
- Components use existing shadcn/ui primitives already installed in this project
- No new npm dependencies required

