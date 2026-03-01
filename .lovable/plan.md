

# Regenerate Broken Blog Articles

## Current Situation

You have **24 AI-generated articles** (22 published, 2 draft) -- all created with the old broken schema (`text` instead of `content`). They render as empty pages with only CTAs visible.

## Cost Per Article

The blog engine uses **google/gemini-2.5-flash** via Lovable AI. Each article generation involves:

- **Input**: ~2,000 tokens (system prompt + user prompt + recent articles list)
- **Output**: ~4,000-6,000 tokens (2,000+ word article with metadata)
- **Total per article**: ~6,000-8,000 tokens

At Lovable AI pricing, this falls within your workspace's included usage. Regenerating all 24 articles would consume roughly **150,000-190,000 tokens total** -- well within normal usage. If you exceed your free tier, credits can be topped up in Settings → Workspace → Usage.

**Estimated cost: effectively free if you have remaining monthly credits. If credits are depleted, it would be a small top-up.**

## What to Build

### 1. Add "Regenerate" button per article in BlogArticleManager

Each article row gets a refresh/regenerate icon button. When clicked:
- Reads the existing article's `title`, `category`, `keywords`, and `content_format` from the database
- Calls `blog-generate` with those parameters (same topic, same category)
- On success: deletes the old broken article, keeps the new one
- Shows a toast with the result

### 2. Add "Regenerate All Broken" bulk action

A button at the top of the Articles tab: "Regenerate 24 broken articles". When clicked:
- Fetches all AI-generated articles
- Processes them sequentially (one at a time to avoid rate limits), with a 3-second delay between each
- Shows a progress indicator: "Regenerating 3/24..."
- Each successful regeneration replaces the old article
- Failed ones are logged and skipped

### 3. Edge function: `blog-regenerate`

A thin wrapper that:
- Accepts a `postId`
- Reads the existing post's topic/category/keywords from the database
- Calls `blog-generate` internally with those parameters
- On success: updates the existing row in-place (overwrites `content`, `excerpt`, `key_takeaways`, etc.) rather than creating a duplicate
- This preserves the same URL/slug so no broken links

### Files Changed

1. **`supabase/functions/blog-regenerate/index.ts`** (new) -- edge function that reads old post data, calls blog-generate, and updates the row in-place
2. **`src/components/admin/BlogArticleManager.tsx`** -- add per-row regenerate button + bulk "Regenerate All" action with progress UI

