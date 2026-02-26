
# Upgrade Blog Engine: Add Missing Admin Components + Fix AI Backend

## Audit Summary

### What Angel Acid Has That We Are Missing

**Admin Components (4 missing):**
1. `BlogQueueTable` -- Full queue management with AI topic suggestions, keyword input, format/category selectors, generate/delete/retry actions per row, status badges
2. `BlogArticleManager` -- Article CRUD table with filters (status, format, search), publish/schedule/archive actions, AI hero image generation per post, bulk image generation, manual image upload to storage
3. `BlogLearningsPanel` -- AI-discovered content insights grouped by type (content, SEO, engagement, timing), confidence scores, active/inactive toggle, stats overview
4. `ABTestPanel` -- A/B test variant dashboard (headline, CTA, image), active vs completed tests, conversion rates, confidence progress, winner tracking
5. `BlogEngineControlModal` -- Full autopilot control dialog with master switch, posts/day, format checkboxes, category checkboxes, auto-publish toggle, quality score slider, publishing window (start/end time)

**Database Table (1 missing):**
- `blog_post_variants` -- Required for the A/B test panel (columns: post_id, variant_type, variant_a, variant_b, views_a/b, conversions_a/b, winner, confidence, is_active, ended_at)

**Edge Function Issues:**
- `blog-generate` is using the **wrong AI gateway URL** (`https://api.lovable.dev/v1/chat/completions` with SERVICE_ROLE_KEY). Should use `https://ai.gateway.lovable.dev/v1/chat/completions` with `LOVABLE_API_KEY`
- All other blog edge functions likely have the same issue and should use `google/gemini-2.5-flash-lite` per project cost standards
- `blog-generate` uses `response_format: { type: 'json_object' }` which should use tool calling instead for structured output

**Current BlogEngine Page Issues:**
- Missing 5 admin sub-components (has inline stubs instead of full components)
- Dashboard tab shows only 3 placeholder stat cards instead of 6 real analytics cards + top posts table + content library overview
- Queue tab has only a basic input + flat list instead of full table with AI suggestions, keywords, format selector
- Articles tab is a placeholder ("coming soon")
- Missing A/B Tests tab entirely
- Missing Learnings tab entirely
- Settings tab has basic sliders instead of the full control modal
- Missing Engine Control button in header with status indicator

---

## Implementation Plan

### 1. Create `blog_post_variants` table
Add the missing table for A/B testing with RLS policies.

### 2. Fix `blog-generate` edge function
- Switch to correct gateway URL: `https://ai.gateway.lovable.dev/v1/chat/completions`
- Use `LOVABLE_API_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY` for auth
- Use `google/gemini-2.5-flash-lite` model per cost standards
- Use tool calling for structured output instead of `response_format`
- Add proper error handling for 429/402 rate limits

### 3. Fix remaining blog edge functions
Apply the same gateway/model/auth fixes to: `blog-suggest`, `blog-analyze`, `blog-engine-run`, `blog-generate-image`, `blog-refresh`, `blog-relate`, `blog-scheduler`

### 4. Create `BlogQueueTable` component
Port from Angel Acid with TQC branding:
- Topic input with category selector (Career Insights, Talent Strategy, Industry Trends, Leadership)
- Keywords input
- AI topic suggestions panel with reasoning + priority + add button
- Full queue table with status badges, source badges, priority, generate/retry/delete actions
- Content format display (Career Playbook, Market Analysis, Success Story, etc.)

### 5. Create `BlogArticleManager` component
Port from Angel Acid with TQC branding:
- Search + status filter + format filter
- Full article table with thumbnail, title, category, format, status, source (AI/Manual), performance score, date
- Actions: preview link, publish, schedule (datetime picker dialog), archive, delete
- AI hero image generation per post (calls `blog-generate-image`)
- Bulk "Generate Missing Images" button
- Manual image upload to `blog-images` storage bucket

### 6. Create `BlogLearningsPanel` component
Port from Angel Acid:
- Stats overview: total insights, active count, avg confidence, times applied
- Learnings grouped by type with icons/colors
- Toggle active/inactive per learning
- Confidence indicator dots

### 7. Create `ABTestPanel` component
Port from Angel Acid:
- Summary cards: active tests, winners found, avg lift
- Active tests table: variant type, A/B text, conversion rates, confidence progress bar, pause button
- Completed tests table: winner, lift %, confidence, end date

### 8. Create `BlogEngineControlModal` component
Port from Angel Acid with TQC categories/formats:
- Master engine switch with status indicator
- Posts per day (1-10)
- Format checkboxes: Career Playbook, Market Analysis, Trend Report, Success Story, Myth-Buster, Talent Origin, Executive Stack
- Category checkboxes: Career Insights, Talent Strategy, Industry Trends, Leadership
- Auto-publish toggle with warning
- Expert review toggle (renamed from "medical review")
- Quality score slider (50-100)
- Publishing window (start/end time inputs)
- Save button

### 9. Rebuild `BlogEngine.tsx` page
Replace current simplified page with full Angel Acid version:
- Header with engine status indicator (green/red dot, format count) + Engine Control button
- 6 tabs: Dashboard, Queue, Articles, A/B Tests, Learnings, Settings
- Dashboard: 6 real analytics cards (views, visitors, time on page, scroll depth, bounce rate, CTA clicks) + top posts table + content library overview
- Queue: `BlogQueueTable` component
- Articles: `BlogArticleManager` component
- A/B Tests: `ABTestPanel` component
- Learnings: `BlogLearningsPanel` component
- Settings: `SettingsTab` with generation settings, rate limits

---

## Files Changed

| File | Action |
|---|---|
| Migration SQL | Create `blog_post_variants` table + RLS |
| `supabase/functions/blog-generate/index.ts` | Fix AI gateway URL, auth, model, structured output |
| `supabase/functions/blog-suggest/index.ts` | Fix AI gateway URL, auth, model |
| `supabase/functions/blog-analyze/index.ts` | Fix AI gateway URL, auth, model |
| `supabase/functions/blog-engine-run/index.ts` | Fix AI gateway URL reference |
| `supabase/functions/blog-generate-image/index.ts` | Fix AI gateway URL, auth, model |
| `supabase/functions/blog-refresh/index.ts` | Fix AI gateway URL, auth, model |
| `supabase/functions/blog-relate/index.ts` | Fix AI gateway URL, auth, model |
| `supabase/functions/blog-scheduler/index.ts` | Fix if needed |
| `src/components/admin/BlogQueueTable.tsx` | Create (new) |
| `src/components/admin/BlogArticleManager.tsx` | Create (new) |
| `src/components/admin/BlogLearningsPanel.tsx` | Create (new) |
| `src/components/admin/ABTestPanel.tsx` | Create (new) |
| `src/components/admin/BlogEngineControlModal.tsx` | Create (new) |
| `src/pages/BlogEngine.tsx` | Rebuild with all components |
