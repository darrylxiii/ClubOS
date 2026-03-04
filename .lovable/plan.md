

# Remaining Work: 88 → 100/100

All code fixes from Phases 1-3 are already implemented and merged. Here is what remains.

---

## Current State (verified via DB)

| Metric | Value | Status |
|--------|-------|--------|
| Published posts | 103 | Good |
| Drafts | 4 | Acceptable |
| Meta titles >55 chars | 0 | Fixed |
| Meta descriptions >155 chars | 0 | Fixed |
| Stuck queue items | 0 | Fixed |
| Article relations | 0 | Needs trigger |
| Placeholder images | 73/103 | Needs backfill |
| Pending queue items | 12 | Needs processing |

---

## Remaining Items

### 1. Tighten `blog_post_relations` write RLS (Security gap)

The table still has `"Authenticated can manage relations"` with `qual: true` — any logged-in user can insert/delete relations. This should be restricted to admin/strategist, matching the pattern applied to all other blog tables. The public SELECT policy is fine.

**Action**: SQL migration to drop the permissive write policy and replace with role-restricted one.

### 2. Deploy updated edge functions

The following functions have code changes that are not yet deployed:
- `blog-health` (fixed `created_at` column)
- `blog-relate` (fixed `similarity_score` column)
- `blog-generate` (added AI logging + `content_format`)
- `blog-generate-image` (added AI logging)
- `blog-rss` (category display names)

**Action**: Deploy all 5 functions.

### 3. Trigger `blog-relate` to populate relations

0 relations exist. After deployment, trigger the function to compute keyword-based similarity for all 103 published posts.

**Action**: Call `blog-relate` via curl.

### 4. Trigger image backfill (73 remaining)

Continue calling `blog-backfill-images` in batches of 10 to generate real hero images.

**Action**: Trigger multiple batches.

### 5. Process 12 pending queue items

12 items are sitting in the generation queue. Trigger `blog-batch-run` to process them.

**Action**: Call `blog-batch-run` via curl.

---

## Files Changed

| Item | Type | Description |
|------|------|-------------|
| SQL migration | Schema | Drop permissive write policy on `blog_post_relations`, add admin/strategist-only |
| 5 edge functions | Deploy | blog-health, blog-relate, blog-generate, blog-generate-image, blog-rss |
| Operational | Curl triggers | blog-relate, blog-backfill-images (batches), blog-batch-run |

