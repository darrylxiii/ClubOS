
# Maximum Efficiency Audit — Round 4: The Full System Sweep

## Cumulative Status: What Has Been Done Across Rounds 1–3

| Fix | Status |
|---|---|
| `generate-placeholders` → static array, zero AI calls | Done |
| `club-ai-chat` → 15-message truncation + `gemini-2.5-flash-lite` default | Done |
| `club-ai-chat` → intent-based tool filtering (4 core tools by default) | Done |
| `retrieve-context` → skip expansion <8 words, skip reranking ≤5 results | Done |
| `enrich-candidate-profile` → 24h cache guard + downgraded to `flash-lite` | Done |
| `generate-kpi-insights` → 1h cache + `flash-lite` | Done |
| `generate-daily-briefing` → once-per-day guard | Done |
| `context-builder.ts` → reduced all row limits + 5-min admin context cache | Done |
| `ai-copilot-tips` → 4h cache guard | Done |
| `generate-analytics-insights` → 2h cache guard | Done |
| `analyze-email-sentiment` → deduplication guard + `flash-lite` | Done |
| `analyze-meeting-recording-advanced` → result cache guard | Done |
| `process-email-ai` → `flash-lite` + skip smart replies for low-priority | Done |
| `detect-hallucinations` → fixed broken `gpt-4o-mini` → `flash-lite` | Done |
| `generate-daily-outreach-insights` → 6h cache guard | Done |
| `ai-tools.ts` → all 17 tool descriptions trimmed to ≤10 words | Done |
| `agentic-heartbeat` → pre-mark events processed before AI call | Done |

---

## Round 4 Findings: What Is Still Burning Credits

### Critical Finding 1: `generate-whatsapp-smart-replies` Still Calls `gpt-4o-mini` via OpenAI Directly

This is the most immediately broken function in the system. It calls `https://api.openai.com/v1/chat/completions` with `gpt-4o-mini` using a separate `OPENAI_API_KEY` — not the Lovable AI Gateway. This means:
1. It bypasses all cost tracking.
2. `gpt-4o-mini` is not in the supported model list.
3. If the key is missing (which is likely since it is a separate secret), the function silently falls back to static replies — meaning every WhatsApp conversation always burns an API call that either fails or charges a separate account.

Fix: Replace the OpenAI direct call with the Lovable AI Gateway using `gemini-2.5-flash-lite`.

### Critical Finding 2: `run-headhunter-agent` Still Uses `gpt-4o-mini`

`run-headhunter-agent` line 69 calls:
```
model: 'gpt-4o-mini'
```
This is the deprecated model name, not in the supported gateway model list. This function is triggered every time a new job goes live. It makes one AI call per job to generate a search persona (50 words). This is a simple summarization task — `gemini-2.5-flash-lite` handles it perfectly at a fraction of the cost, and the model name will actually resolve correctly.

### Critical Finding 3: `generate-candidate-brief` Still Uses `gemini-3-flash-preview`

`generate-candidate-brief` (line 98) uses `google/gemini-3-flash-preview` — the expensive next-gen preview model. This generates a 360-degree intelligence brief for candidates. It is called from the talent pool UI whenever a strategist opens a candidate card. There is no cache guard — every open of the candidate card triggers a fresh AI call with the most expensive flash model in the fleet.

Fix: Downgrade to `gemini-2.5-flash` (not even lite — this is a visible, quality-sensitive output) AND add a cache guard using the existing `candidate_brief` column. If `candidate.candidate_brief` already exists and was generated within the last 48 hours, return it immediately without any AI call.

### High Finding 4: `generate-candidate-dossier` Uses `gemini-2.5-flash` with No Cache

`generate-candidate-dossier` uses `google/gemini-2.5-flash` and has no cache check. It is triggered whenever a dossier is viewed. The dossier data (interview feedback, experience, skills) does not change between views. Every page load of the dossier panel triggers a fresh AI call.

Fix: After generating the dossier, store it in a `dossiers` table column (or use the existing `candidate_profiles.candidate_brief` JSONB field) and check for a recent result (48h TTL) before calling AI. Also downgrade model to `gemini-2.5-flash-lite` — the task is structured JSON extraction from structured input, not complex reasoning.

### High Finding 5: `generate-interview-prep-ai` and `generate-interview-prep` Are Two Separate Functions Doing the Same Thing

There are TWO separate interview prep functions:
- `generate-interview-prep-ai` uses `google/gemini-2.5-flash`
- `generate-interview-prep` also uses `google/gemini-2.5-flash`

Both generate interview preparation materials for the same candidate+job+meeting combination. Both store results into the database (`interview_prep_briefs`). Neither checks if a prep brief already exists for the same `meeting_id` + `candidate_id` before calling the AI.

Fix:
1. In `generate-interview-prep`, add a guard: check `interview_prep_briefs` for an existing row with the same `meeting_id` and `candidate_id` — if found, return it.
2. In `generate-interview-prep-ai`, downgrade model to `gemini-2.5-flash-lite` — structured JSON generation from structured input.
3. Both functions use `google/gemini-2.5-flash` — downgrade both to `gemini-2.5-flash-lite`.

### High Finding 6: `generate-executive-briefing` Uses `gemini-2.5-flash` with No Cache

`generate-executive-briefing` uses `google/gemini-2.5-flash` and has a 20-per-hour rate limit, but no TTL cache. The same briefing for the same candidate+job is regenerated on every request. The input data (interview feedback, match score) rarely changes between views.

Fix: Add a 24h cache guard. Before calling AI, check if a briefing for this `candidateId + jobId` was generated in the last 24 hours. If yes, return the cached version. Downgrade model to `gemini-2.5-flash-lite` — this is structured JSON with short outputs.

### High Finding 7: `generate-post-suggestions` Uses `gemini-2.5-flash` with No Deduplication

`generate-post-suggestions` is called every time a user opens the post creation modal. It uses `google/gemini-2.5-flash` and generates 3 suggestions. There is no cache — every modal open is a fresh AI call. If a user opens and closes the modal 5 times, that is 5 calls.

Fix: Downgrade model to `gemini-2.5-flash-lite`. The task is generating 3 creative social media post suggestions — not complex reasoning. Also add a simple session-level deduplication: if suggestions were generated in the last 15 minutes for the same user, return the cached result.

### High Finding 8: `generate-offer-recommendation` Uses `gemini-2.5-flash` with No Cache

`generate-offer-recommendation` calls `google/gemini-2.5-flash` every time. The compensation analysis is deterministic — same inputs (candidate salary expectations, market benchmarks, job title) should produce the same output. There is no cache. If a strategist views the offer recommendation panel multiple times during a session, it re-runs every time.

Fix: Add a 12h cache guard using a dedicated column (or the `applications` table's JSONB metadata). Downgrade model to `gemini-2.5-flash-lite` — the AI part generates 2-3 sentence summaries and negotiation tips, which is simple text generation.

### Medium Finding 9: `context-builder.ts` Still Fetches All User Data Even for Admin Users

For admin/strategist users, the function first runs all 22 parallel queries for the candidate/personal context (emails, WhatsApp, meetings, applications, etc.) and THEN appends admin context from cache. The personal context (emails, social connections, personal applications) is irrelevant for admin users who are looking at platform data, not their own career.

Fix: For users with `admin` or `strategist` roles, skip the personal context entirely (the second parallel batch of 13 queries fetching WhatsApp, SMS, posts, emails, bookings, etc.) and return only the admin context. Estimated saving: 13 DB queries per admin chat message.

### Medium Finding 10: `generate-daily-briefing` Still Uses `serve()` from `deno.land/std` — Bundle Risk

`generate-daily-briefing` still imports `serve` from `https://deno.land/std@0.168.0/http/server.ts` and `createClient` from `https://esm.sh/@supabase/supabase-js@2.39.3` (an old version). This is the same pattern that caused the 400 Bad Request deployment error in a previous session. The function itself is now correct and efficient (once-per-day guard) but its import pattern is fragile.

Fix: Migrate to `Deno.serve()` and `npm:@supabase/supabase-js@2`. This also applies to `run-headhunter-agent` (also on old `esm.sh` imports).

### Medium Finding 11: `generate-quick-reply` Existence — Possible Duplication

A function named `generate-quick-reply` exists in the directory listing. The system already has `generate-whatsapp-smart-replies` and smart reply generation within `process-email-ai`. This may be a third duplicate AI call path for replies.

Fix: Read and audit `generate-quick-reply` to confirm if it is a duplicate. If so, consolidate or add a cache guard.

### Low Finding 12: `guide-sourcing-strategy` Is Called Per-Mission in Heartbeat with No Cache

In `agentic-heartbeat`, line 133 calls `guide-sourcing-strategy` for each pending sourcing mission. If 5 missions are pending, that is 5 calls to a strategy generation function. The strategy for the same `job_id` is unlikely to change between heartbeat runs (which run every few minutes). There is no deduplication — the same job can have its strategy re-generated on every heartbeat until the mission is marked `in_progress`.

Fix: After generating a strategy and storing it in `sourcing_missions.search_strategy`, the heartbeat already marks the mission `in_progress`. Verify the query correctly excludes `in_progress` missions (it does: `.eq("status", "pending")`). The main risk is if `guide-sourcing-strategy` itself is called multiple times in quick succession before the DB write completes. Add an immediate `status: "processing"` update BEFORE calling the strategy function, similar to the heartbeat event deduplication fix.

---

## Implementation Plan: 10 Changes

### Change 1: Fix `generate-whatsapp-smart-replies` — Replace OpenAI Direct Call

Remove the `openaiKey` check and OpenAI direct call entirely. Replace with the Lovable AI Gateway using `google/gemini-2.5-flash-lite`. The function already has a solid fallback system for when AI fails — keep the fallback but make the AI call go through the correct gateway.

Estimated saving: Eliminates a completely broken/separate-account AI call. 100% reduction on that function's external spend.

**File:** `supabase/functions/generate-whatsapp-smart-replies/index.ts`

### Change 2: Fix `run-headhunter-agent` — Replace `gpt-4o-mini` + Migrate Imports

Change the model from `gpt-4o-mini` (broken) to `google/gemini-2.5-flash-lite`. Also migrate imports from `esm.sh` to `npm:` specifiers to prevent future deployment errors.

Estimated saving: Fixes silent failures on every job publish event. ~50% cheaper per headhunter run.

**File:** `supabase/functions/run-headhunter-agent/index.ts`

### Change 3: Add 48h Cache + Model Downgrade to `generate-candidate-brief`

At the start of the function, check if `candidate.candidate_brief` already has a `generated_at` timestamp within the last 48 hours. If yes, return the existing brief immediately without calling AI. Change model from `gemini-3-flash-preview` → `gemini-2.5-flash`.

Estimated saving: 70–90% reduction on repeat views. Model downgrade saves ~30–40% on the calls that do happen.

**File:** `supabase/functions/generate-candidate-brief/index.ts`

### Change 4: Add 48h Cache + Model Downgrade to `generate-candidate-dossier`

After generating a dossier, store the result and timestamp in the candidate's `candidate_profiles` record (or a dedicated `dossiers` table). At the start of subsequent calls, check for a fresh result before calling AI. Downgrade model from `gemini-2.5-flash` → `gemini-2.5-flash-lite`.

Estimated saving: 70–90% reduction on repeat views.

**File:** `supabase/functions/generate-candidate-dossier/index.ts`

### Change 5: Add Dedup Guard to `generate-interview-prep` + Downgrade Both Prep Functions

In `generate-interview-prep`: check `interview_prep_briefs` for existing row with same `meeting_id` + `candidate_id`. If found, return it. Downgrade model to `gemini-2.5-flash-lite`.
In `generate-interview-prep-ai`: same model downgrade.

Estimated saving: Eliminates duplicate AI calls for same interview. ~50% reduction on that function.

**Files:** `supabase/functions/generate-interview-prep/index.ts`, `supabase/functions/generate-interview-prep-ai/index.ts`

### Change 6: Add 24h Cache to `generate-executive-briefing` + Model Downgrade

Check for existing briefing for `candidateId + jobId` from within the last 24h in the database (could use `interview_prep_briefs` or a dedicated `executive_briefings` table or `applications` metadata). Downgrade model from `gemini-2.5-flash` → `gemini-2.5-flash-lite`.

Estimated saving: 80–90% reduction on repeat views.

**File:** `supabase/functions/generate-executive-briefing/index.ts`

### Change 7: Downgrade `generate-post-suggestions` + 15-min Cache

Change model from `gemini-2.5-flash` → `gemini-2.5-flash-lite`. Add a simple in-memory module-level cache (Map keyed by `userId + postType + platform`) with a 15-minute TTL. On cache hit, return suggestions immediately.

Estimated saving: ~40% on model cost. 60–80% reduction on repeat opens per session.

**File:** `supabase/functions/generate-post-suggestions/index.ts`

### Change 8: Add 12h Cache + Model Downgrade to `generate-offer-recommendation`

Check for a cached recommendation for the same `candidate_id + job_id` within the last 12 hours. Store the result in a JSONB column on the `applications` table's existing `match_factors` or a new `offer_recommendation_cache` field. Downgrade model from `gemini-2.5-flash` → `gemini-2.5-flash-lite`.

Estimated saving: 70–80% on repeat views. ~40% on model cost for new generations.

**File:** `supabase/functions/generate-offer-recommendation/index.ts`

### Change 9: Skip Personal Context for Admin/Strategist in `context-builder.ts`

Before the second parallel fetch batch (WhatsApp, SMS, posts, emails, meetings, bookings), check if the user is admin/strategist. If yes, skip all 13 personal communication queries entirely and return empty arrays for those fields. Admins using Club AI do not need their personal WhatsApp/SMS messages — they have full admin context.

Estimated saving: 13 DB queries saved per admin/strategist chat message. At 50 messages/day this is 650 DB query calls saved per day.

**File:** `supabase/functions/_shared/context-builder.ts`

### Change 10: Migrate `generate-daily-briefing` and `run-headhunter-agent` to Modern Imports

Migrate both functions from `serve() from deno.land/std` and `createClient from esm.sh` to `Deno.serve()` and `npm:@supabase/supabase-js@2` to prevent future 400 Bad Request deployment errors.

**Files:** `supabase/functions/generate-daily-briefing/index.ts`, `supabase/functions/run-headhunter-agent/index.ts`

---

## Summary Table

| Change | Function | Mechanism | Estimated Saving |
|---|---|---|---|
| 1 | `generate-whatsapp-smart-replies` | Replace broken OpenAI direct call → Lovable AI Gateway + `flash-lite` | Eliminates external API spend entirely |
| 2 | `run-headhunter-agent` | Fix `gpt-4o-mini` → `flash-lite` + migrate imports | ~50% per run + fixes silent failures |
| 3 | `generate-candidate-brief` | 48h cache + `gemini-3-flash-preview` → `gemini-2.5-flash` | 70–90% on repeat views + 40% model saving |
| 4 | `generate-candidate-dossier` | 48h cache + `gemini-2.5-flash` → `flash-lite` | 70–90% on repeat views |
| 5 | Both interview prep functions | Dedup guard + `flash-lite` for both | ~50% reduction per interview |
| 6 | `generate-executive-briefing` | 24h cache + `flash-lite` | 80–90% on repeat views |
| 7 | `generate-post-suggestions` | 15-min in-memory cache + `flash-lite` | 60–80% per session |
| 8 | `generate-offer-recommendation` | 12h cache + `flash-lite` | 70–80% on repeat views |
| 9 | `context-builder.ts` | Skip 13 personal queries for admin/strategist users | 13 DB queries saved per admin message |
| 10 | `generate-daily-briefing` + `run-headhunter-agent` | Migrate to modern imports | Prevents deployment failures |

**Combined estimated additional savings: 15–25% further reduction on top of Rounds 1–3.**

---

## Files Changed

1. `supabase/functions/generate-whatsapp-smart-replies/index.ts`
2. `supabase/functions/run-headhunter-agent/index.ts`
3. `supabase/functions/generate-candidate-brief/index.ts`
4. `supabase/functions/generate-candidate-dossier/index.ts`
5. `supabase/functions/generate-interview-prep/index.ts`
6. `supabase/functions/generate-interview-prep-ai/index.ts`
7. `supabase/functions/generate-executive-briefing/index.ts`
8. `supabase/functions/generate-post-suggestions/index.ts`
9. `supabase/functions/generate-offer-recommendation/index.ts`
10. `supabase/functions/_shared/context-builder.ts`

No database schema changes required — all caches use existing columns or in-memory Maps.
