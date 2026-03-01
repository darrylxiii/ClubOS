

# Fix Blog Engine: Content Quality and CTA Spam

## Root Cause Analysis

There are **three distinct problems** causing the empty, CTA-filled articles you see:

### Problem 1: Schema Mismatch (why articles have NO content)

The AI prompt (line 79-83 of `blog-generate/index.ts`) tells the model to return blocks with a `text` field:
```
{ type: "heading", level: 2, text: "..." }
{ type: "paragraph", text: "..." }
{ type: "quote", text: "...", attribution: "..." }
```

But the frontend `ContentBlock` type and `ArticleContent.tsx` renderer expect a `content` field:
```
{ type: "heading", level: 2, content: "..." }
{ type: "paragraph", content: "..." }
{ type: "quote", content: "...", caption: "..." }
```

Every block the AI generates has `text` but no `content`, so the renderer shows **nothing** for every block. The page displays only the injected CTAs because those are hardcoded, not from AI output.

### Problem 2: CTA Injection Every 5th Block (line 124-134 of ArticleContent.tsx)

Even if content rendered, a CTA is injected after every 5th block starting at block 3. For a 20-block article that is 4 CTAs alternating between "Apply to join" and "Explore partnerships" -- far too many.

### Problem 3: Sidebar Has Two Separate CTA Cards

`ArticleSidebar.tsx` renders two sticky CTA cards (Talent + Partners) taking up most of the sidebar, pushing "Popular Articles" below the fold.

---

## Fix Plan (3 files)

### 1. Fix `supabase/functions/blog-generate/index.ts`

**Schema alignment:** Update the prompt and tool schema so the AI returns fields matching the frontend `ContentBlock` interface:
- `text` becomes `content` everywhere
- `attribution` becomes `caption` (for quotes)
- `style` becomes unnecessary (lists use `items` directly)
- `variant`/`title` on callouts are fine as metadata but `content` must be the main text field

**Model upgrade:** Change from `google/gemini-2.5-flash-lite` to `google/gemini-2.5-flash` for meaningfully better output quality.

**Stricter tool schema:** Replace `items: { type: 'object' }` with a properly typed discriminated schema that enforces required `content` field, `level` for headings, `items` for lists. Add `minItems: 15` to enforce article depth.

**Prompt improvements:**
- Add explicit instruction: "Every paragraph must contain a concrete insight, statistic, or recommendation. Do not pad with generic filler."
- Require minimum 15 content blocks
- Require at least 3 named company/person examples
- Require at least 5 specific statistics or data points

**Post-generation validation:** Before saving, check:
- Total character count across all `content` fields exceeds 6,000 characters
- At least 12 content blocks exist
- At least 3 heading blocks exist
- If validation fails, save as `status: 'failed'` with error message instead of publishing empty content

### 2. Fix `src/components/blog/ArticleContent.tsx`

**Single midpoint CTA:** Replace the every-5th-block logic (lines 124-134) with a single CTA inserted at `Math.floor(content.length / 2)`. Only inject if the article has 6+ blocks.

**Callout blocks as informational asides:** Change line 117-118 so `callout` blocks render as a styled informational box (lightbulb icon, muted background, no link/arrow) instead of a promotional `CTACallout` component. Only render as CTA if the block explicitly has a `productId` field.

### 3. Fix `src/components/blog/ArticleSidebar.tsx`

**Merge two CTA cards into one:** Combine the "For Exceptional Talent" and "For Companies" cards (lines 22-49) into a single card with two sections separated by a subtle divider. This halves sidebar CTA space.

---

## CTA Count: Before vs After

| Source | Before | After |
|---|---|---|
| Inline CTAs in article body | 1 every 5 blocks (3-4 per article) | 1 at midpoint |
| Callout blocks from AI | Rendered as CTA | Rendered as informational aside |
| Sidebar CTA cards | 2 separate cards | 1 combined card |
| Scroll bar (bottom) | 1, dismissible | 1, unchanged |
| **Total** | **6-8 per article** | **3 per article** |

## Technical Details

### Tool schema fix (blog-generate)

The `content` array items change from `{ type: 'object' }` to:

```text
items: {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['paragraph','heading','quote','list','callout','image'] },
    content: { type: 'string', description: 'Main text content of the block' },
    level: { type: 'number', enum: [2,3,4], description: 'Heading level, required for heading blocks' },
    items: { type: 'array', items: { type: 'string' }, description: 'List items, required for list blocks' },
    caption: { type: 'string', description: 'Attribution for quotes or caption for images' },
  },
  required: ['type', 'content'],
}
```

### Prompt content block examples (added to userPrompt)

```text
IMPORTANT - Use these exact field names:
- { "type": "paragraph", "content": "The text..." }
- { "type": "heading", "content": "Section Title", "level": 2 }
- { "type": "quote", "content": "The quote text", "caption": "Speaker Name" }
- { "type": "list", "content": "Optional list intro", "items": ["Item 1", "Item 2"] }
- { "type": "callout", "content": "Insight or tip text" }
```

This ensures the AI output matches exactly what `ArticleContent.tsx` renders.

### Existing published articles

Articles already in the database with `text` fields will continue to render as empty. A one-time data migration could map `text` to `content` for existing rows, but since these are AI-generated drafts, regenerating them with the fixed engine is cleaner.
