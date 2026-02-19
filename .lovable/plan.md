
# Maximum Efficiency Audit — Round 3: Every Dollar Accounted For

## What Round 1 and Round 2 Fixed (Already Done)

| Fix | Status |
|---|---|
| `generate-placeholders` → static rotation | Done |
| `club-ai-chat` → 15-message truncation + `gemini-2.5-flash-lite` default | Done |
| `retrieve-context` → skip expansion <8 words, skip rerank ≤5 results | Done |
| `enrich-candidate-profile` → 24h cache guard | Done |
| `generate-kpi-insights` → 1h cache + `flash-lite` | Done |
| `generate-daily-briefing` → once-per-day guard | Done |
| `context-builder.ts` → reduced row limits (emails 10, WhatsApp 10, comms 20) | Done |
| `ai-copilot-tips` → 4h cache guard | Done |
| `generate-analytics-insights` → 2h cache guard | Done |
| `analyze-email-sentiment` → deduplication guard | Done |
| `analyze-meeting-recording-advanced` → cache guard on completed analysis | Done |
| `enrich-candidate-profile` → model downgraded to `flash-lite` | Done |

---

## Round 3: What Is Still Burning Credits

### Critical Finding 1: `generate-placeholders` Edge Function Still Calls `gemini-2.5-flash`

The frontend (`ClubAI.tsx`) was correctly updated to use static placeholders. But the Edge Function itself (`supabase/functions/generate-placeholders/index.ts`) **still exists and still calls `gemini-2.5-flash`** — the mid-tier model, not even flash-lite. Any other caller, webhook, or background task that still invokes this function pays full price. The function should be converted to return only static placeholders with zero AI calls.

### Critical Finding 2: `ai-tools.ts` Is 2,107 Lines — Sent to AI on Every Single Chat Message

The `allAITools` array exported from `_shared/ai-tools.ts` contains **17 full tool definitions** sent to the AI on every request. Each tool definition includes a full description paragraph plus parameter schemas. This alone adds approximately 1,500–2,500 tokens per request in the tools array, on top of everything else. The current role-based filtering does remove some tools for candidates and partners, but for admin/strategist users — the heaviest users — all 17 tools are sent every time.

**Fix**: Send only the tools relevant to the detected `mode`. In `normal` mode, strip down to 5–7 core tools (navigate, task, search_jobs, search_talent_pool). Only in `search` mode add web_search. Only when explicit signals exist (e.g., message contains "schedule", "meeting") add calendar tools. This is query-intent-based tool filtering.

### Critical Finding 3: `process-email-ai` Uses `gemini-2.5-flash` with No Batching

This function is called per email with a massive 9-field system prompt requesting category, priority, summary, sentiment, action items, 3 smart replies, meeting detection, follow-up detection, and relationship intelligence — all in one call using `gemini-2.5-flash`. The function has a rate limit of 100 emails per hour per user, which means up to 100 AI calls/hour just for email processing for a single user.

**Fixes**:
1. Downgrade model to `gemini-2.5-flash-lite` — the task is structured classification, not complex reasoning.
2. Strip smart replies from the default call. Smart replies are only needed when the user opens an email, not during background sync.
3. Add a check for `ai_processed_at` already existing (this exists — it correctly skips already-processed emails).

### Critical Finding 4: `analyze-email-sentiment` Still Uses `gemini-2.5-flash`

After Round 2, the deduplication guard was added (skip if `sentiment_score` is already populated). But the model is still `google/gemini-2.5-flash`. For a sentiment task that returns a -1.0 to 1.0 score plus a label, `gemini-2.5-flash-lite` is more than sufficient. This is a single-output classification task.

### Critical Finding 5: `agentic-heartbeat` Triggers `run-headhunter-agent` Per Job Open Event

The heartbeat runs and checks for `job_status_open` events, then calls `run-headhunter-agent` for each. `run-headhunter-agent` is an agentic search function. If 5 jobs get published in a day, that is 5 headhunter runs, each of which likely calls AI multiple times. There is no deduplication guard to prevent re-running the headhunter for the same job if the heartbeat runs again before the event is processed.

**Fix**: Mark events as processed immediately (before the AI call, not after) to prevent duplicate runs.

### Critical Finding 6: `detect-hallucinations` Uses `gpt-4o-mini` (Deprecated Model Name)

The function calls `gpt-4o-mini` which no longer exists in the gateway supported model list. This either silently fails or routes to an expensive fallback. Replace with `google/gemini-2.5-flash-lite` which is purpose-built for classification tasks at a fraction of the cost. Hallucination detection is a structured JSON task — it does not need GPT-class reasoning.

### Critical Finding 7: `generate-daily-outreach-insights` Has No Cache Guard

This function generates outreach insights from campaign, reply, account health, and prediction data. It inserts results into `crm_outreach_insights` with a 24h expiry — but there is **no guard at the start of the function to check if recent insights already exist**. Every call regenerates everything, even though the data changes minimally between calls. Unlike `generate-daily-briefing` which correctly checks `daily_briefings` for today's date, this function has no such check.

**Fix**: Add a cache check at the start — if `crm_outreach_insights` contains entries created in the last 6 hours, return those instead of regenerating.

### Critical Finding 8: `classify-query-intent` Makes Unnecessary AI Calls

Looking at `classify-query-intent`, the entire intent classification is done in pure JavaScript (regex-based entity extraction, pattern matching) — no AI call is made at all. This is actually correct and efficient. The function already caches results for 7 days. No change needed here.

### Critical Finding 9: `context-builder.ts` — Admin Context Still Fetches 12 Database Tables Every Message

While row limits were reduced in Round 2, for admin/strategist users the `buildAdminContext` function still runs 12 parallel database queries on **every single chat message**. Even with reduced limits, this is expensive in database reads and the resulting context string is injected verbatim into the AI prompt, adding 1,500–3,000 tokens of admin data even if the question is "what is 2+2".

**Fix**: Add an in-memory TTL cache for admin context. The admin context (placement fees, KPIs, candidate pool stats) changes at most every few minutes. Cache the built context string in a module-level `Map` with a 5-minute TTL, keyed by the admin's user ID. On cache hit, return instantly and skip all 12 database queries and the token cost.

### Critical Finding 10: The `ai-tools.ts` Tool Descriptions Are Verbose (Token Waste)

The 17 tool descriptions in `allAITools` use verbose, multi-sentence descriptions. For example, `find_free_slots` has a description: "Analyze unified calendar (Quantum Club + Google + Microsoft) to find optimal free time slots. Returns top 5 ranked slots with availability scores." — this is ~20 tokens for the description alone. Multiply by 17 tools × every chat request = 340+ tokens just in description text, before parameters.

**Fix**: Shorten all tool descriptions to 8 words or fewer. The AI model does not need a full paragraph to understand what `find_free_slots` does.

### Critical Finding 11: `retrieve-context` Sends Full Tool Definitions in Reranking Prompt

The reranking prompt currently passes `c.content.substring(0, 200)` per candidate (up to 10 candidates). With 10 candidates × 200 chars = 2,000 chars just in the prompt body. This is fine. However, the function still generates an embedding for every query (that is one AI call minimum per RAG query) even for the simplest lookups. There is currently no embedding cache.

**Fix**: For queries where the vector search returns 0 results, skip the reranking call entirely (already done for ≤5). For identical or near-identical repeated queries within the same session, cache the embedding vector in a module-level Map with a 10-minute TTL.

### Critical Finding 12: `generate-activity-insights` Has No AI at All — Already Efficient

After reading the full file, `generate-activity-insights` is 100% pure data computation (bounce rates, frustration signals, journey drop-offs, search performance). It makes **zero AI calls**. This is already maximally efficient. No changes needed.

### Critical Finding 13: `process-email-ai` Smart Replies Add ~400 Extra Tokens Per Email

The system prompt requests 3 smart replies (professional, friendly, decline) for every email processed. For newsletters and low-priority emails, smart replies are useless. The AI generates them anyway, wasting ~400 tokens per email.

**Fix**: Skip smart reply generation for emails classified as `newsletter`, `spam`, or `low` priority. Only generate smart replies for `recruiter_outreach`, `interview_invitation`, and `offer` categories.

---

## Implementation Plan: 9 Changes

### Change 1: Kill `generate-placeholders` AI Call Permanently

**File**: `supabase/functions/generate-placeholders/index.ts`

Remove the entire AI fetch call and return a static placeholder set directly. The function body becomes a simple 10-line response returning a hardcoded array. This ensures no caller — frontend or otherwise — can accidentally trigger an AI call through this function.

### Change 2: Intent-Based Tool Filtering in `club-ai-chat`

**File**: `supabase/functions/club-ai-chat/index.ts`

The current code sends all 17 filtered tools every time. Add a simple keyword intent detector on the last user message:

- Default (no keywords): send only `navigate_to_page` + `search_jobs` + `create_task` + `search_talent_pool` (4 tools, ~800 tokens)
- If message contains `schedule|meeting|book|calendar`: add calendar tools (4 more)
- If message contains `message|email|send|draft`: add messaging tools (3 more)
- If `search` mode: replace with `web_search` tool
- Admin-only: always include `search_talent_pool`, `log_candidate_touchpoint`

Estimated saving: 800–1,200 tokens per non-complex request. At 50 messages/day, this is 40,000–60,000 tokens/day saved just from tool definitions.

### Change 3: 5-Minute In-Memory Cache for Admin Context

**File**: `supabase/functions/_shared/context-builder.ts`

Add a module-level Map at the top of the file:

```
const adminContextCache = new Map<string, { context: string; ts: number }>();
const ADMIN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

In `buildAdminContext`, check if a cached entry exists for the user that is less than 5 minutes old. If yes, return it immediately — skipping all 12 database queries AND the token cost of re-building the context string. On cache miss, build normally and store.

### Change 4: Downgrade `process-email-ai` Model + Strip Low-Priority Smart Replies

**File**: `supabase/functions/process-email-ai/index.ts`

1. Change model from `google/gemini-2.5-flash` → `google/gemini-2.5-flash-lite`
2. Update system prompt to skip smart reply generation for newsletter/spam categories. Add a system prompt instruction: "Only generate smart_replies for categories: recruiter_outreach, interview_invitation, offer. For all other categories, set smart_replies to null."

Estimated saving: 30–50% per email processed + model downgrade.

### Change 5: Downgrade `analyze-email-sentiment` Model

**File**: `supabase/functions/analyze-email-sentiment/index.ts`

Change model from `google/gemini-2.5-flash` → `google/gemini-2.5-flash-lite`. Sentiment classification (-1.0 to 1.0 score + label) is a simple task. The deduplication guard from Round 2 already prevents re-processing. This saves ~40% of cost on every new email that hits this function.

### Change 6: Fix `detect-hallucinations` Model

**File**: `supabase/functions/detect-hallucinations/index.ts`

Change model from `gpt-4o-mini` (not in supported list, likely failing or expensive) → `google/gemini-2.5-flash-lite`. This is a strict JSON classification task with low reasoning requirements.

### Change 7: Add Cache Guard to `generate-daily-outreach-insights`

**File**: `supabase/functions/generate-daily-outreach-insights/index.ts`

Add a check at the top of the function before any data fetching:

```typescript
const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
const { data: recentInsights } = await supabase
  .from('crm_outreach_insights')
  .select('id')
  .gte('created_at', sixHoursAgo)
  .limit(1)
  .maybeSingle();

if (recentInsights) {
  // Return cached - fetch recent insights and return
  const { data: cached } = await supabase.from('crm_outreach_insights')
    .select('*').gte('created_at', sixHoursAgo).order('created_at', { ascending: false }).limit(5);
  return cached response;
}
```

This function is called from the Outreach/CRM dashboard. Without the guard, opening the page multiple times regenerates insights. With the guard, it generates at most 4 times per day.

### Change 8: Shorten All Tool Descriptions in `ai-tools.ts`

**File**: `supabase/functions/_shared/ai-tools.ts`

Trim all tool `description` strings to ≤10 words each. Examples:
- `"Search for jobs matching criteria and return top matches with AI-calculated fit scores"` → `"Search jobs by title, location, salary, skills"`
- `"Analyze unified calendar (Quantum Club + Google + Microsoft) to find optimal free time slots. Returns top 5 ranked slots with availability scores."` → `"Find free calendar slots for scheduling"`
- `"Generate a comprehensive pre-interview briefing document"` → `"Create interview briefing document"`

This is a mechanical change across 17 tool definitions, each saving 15–40 tokens. Total saving: ~400 tokens per request where all tools are sent.

### Change 9: Mark Heartbeat Events Processed Before AI Call

**File**: `supabase/functions/agentic-heartbeat/index.ts`

Move the `processed: true` update to BEFORE the `run-headhunter-agent` call, not after:

```typescript
// Mark processed FIRST to prevent duplicate runs
await supabase.from("agent_events")
  .update({ processed: true, processed_by: ["agentic-heartbeat"] })
  .eq("id", event.id);

// THEN run the headhunter
const hhResult = await invokeAgent("run-headhunter-agent", { jobId });
```

This prevents the heartbeat from triggering duplicate headhunter runs if the function is called again before the first run completes.

---

## Summary Table

| Change | File | Mechanism | Estimated Saving |
|---|---|---|---|
| 1 | `generate-placeholders` | Remove AI call entirely, return static array | 100% on that function |
| 2 | `club-ai-chat` | Intent-based tool filtering (4 default → full 17 only when needed) | 800–1,200 tokens per message |
| 3 | `context-builder.ts` | 5-min in-memory admin context cache | 12 DB queries + 1,500–3,000 tokens per admin message |
| 4 | `process-email-ai` | Model downgrade + strip smart replies for low-value emails | 30–50% per email |
| 5 | `analyze-email-sentiment` | Model downgrade to `flash-lite` | ~40% per sentiment call |
| 6 | `detect-hallucinations` | Replace broken `gpt-4o-mini` with `flash-lite` | Fixes silent failures + ~60% cheaper |
| 7 | `generate-daily-outreach-insights` | 6-hour cache guard | 75%+ on that function |
| 8 | `ai-tools.ts` | Shorten all 17 tool descriptions to ≤10 words | ~400 tokens per full-tool request |
| 9 | `agentic-heartbeat` | Mark events processed before AI call | Prevents duplicate headhunter runs |

**Combined estimated additional savings: 20–35% further reduction on top of Rounds 1 and 2.**

---

## Files to Change

1. `supabase/functions/generate-placeholders/index.ts` — remove AI call, return static
2. `supabase/functions/club-ai-chat/index.ts` — intent-based tool filtering
3. `supabase/functions/_shared/context-builder.ts` — 5-min in-memory admin cache
4. `supabase/functions/process-email-ai/index.ts` — model downgrade + conditional smart replies
5. `supabase/functions/analyze-email-sentiment/index.ts` — model downgrade
6. `supabase/functions/detect-hallucinations/index.ts` — replace `gpt-4o-mini` with `flash-lite`
7. `supabase/functions/generate-daily-outreach-insights/index.ts` — 6h cache guard
8. `supabase/functions/_shared/ai-tools.ts` — shorten all 17 tool descriptions
9. `supabase/functions/agentic-heartbeat/index.ts` — pre-mark events processed

No database schema changes required.
