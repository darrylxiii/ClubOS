
# Further AI Credit Optimizations — Deep Audit Round 2

## What is Already Fixed (Round 1 Summary)

- `generate-placeholders` → Static rotation (100% saving on that function)
- `club-ai-chat` → 15-message truncation + default `gemini-2.5-flash-lite`
- `retrieve-context` → Skip expansion for <8 words, skip reranking for ≤5 results
- `enrich-candidate-profile` → 24h cache guard
- `generate-kpi-insights` → 1h cache guard
- `generate-daily-briefing` → Once-per-day guard

---

## What Is Still Burning Credits (Round 2 Findings)

### Finding 1: `context-builder.ts` — The Hidden Mega-Token Bomb (Critical)

Every single Club AI chat message triggers **37 database queries in parallel** and builds a context string that can reach **8,000–15,000 tokens before the user message is even included**. This is the single biggest remaining cost driver.

What gets fetched and injected every call:
- 50 recent emails (with full subjects and summaries)
- 100 unified communications records
- 50 WhatsApp messages
- 30 SMS messages
- 30 company interactions
- 20 external context imports
- 20 posts, 10 stories, 10 bookings
- 20 AI memory entries
- 10 career trend insights
- All upcoming meetings (2 weeks ahead)
- Recent meetings (1 week back)
- 10 relationship alerts
- Full admin context: 50 placement fees + 100 Moneybird invoices + 50 CRM prospects + 100 candidate profiles + 200 applications + 50 offers + 50 shortlists + 50 scorecards + 50 interview feedback rows

**Every chat message pays for all of this, even if the user just types "Hi".**

### Finding 2: `ai-copilot-tips` — Per-Page-Load AI Calls (High)

This function fires an AI call using `gemini-2.5-flash` every time a user visits a page. It generates 1–3 tips and saves them, but there is no caching or deduplication guard. If a user browses 10 pages per session, that is 10 AI calls just for tooltip hints.

### Finding 3: `generate-analytics-insights` — No Cache Guard (High)

This runs a full AI call on `gemini-2.5-flash` (with tool calls) every time the analytics page loads. No TTL, no deduplication. If viewed 20 times a day, that is 20 AI calls for the same near-identical data.

### Finding 4: `generate-placeholders` Is Still Calling AI (Medium)

The edge function still exists and calls `gemini-2.5-flash` (not `flash-lite`). The frontend was updated to use static placeholders, but if anything else still calls this function, it burns credits.

### Finding 5: `enrich-candidate-profile` Uses `gemini-3-flash-preview` (Medium)

The enrichment function uses `google/gemini-3-flash-preview` (a next-gen preview model) instead of the cheaper `gemini-2.5-flash-lite`. This is an unnecessary premium for a background enrichment task.

### Finding 6: `analyze-email-sentiment` — Per-Email AI Calls (Medium)

Called individually per email with `gemini-2.5-flash` and tool calling. No cache check — if the same email is analyzed twice (e.g., on re-sync), it pays twice.

### Finding 7: `analyze-meeting-recording-advanced` — Multi-Call Chunking (Medium)

At 15,000 characters per chunk, a 1-hour meeting transcript triggers 5–10 AI calls at 4,000 max tokens each. No result caching — re-opening a meeting intelligence page can retrigger analysis.

### Finding 8: Admin Context in `context-builder.ts` Fetches 200 Applications Every Call (Medium)

The `buildAdminContext` function fetches up to 200 applications, 100 candidate profiles, 50 placement fees, and 100 Moneybird invoices on every admin chat message. This data rarely changes minute-to-minute and could be summarized once and reused.

### Finding 9: `generate-analytics-insights` and `generate-activity-insights` Have No Rate Limits (Low)

Multiple analytics insight functions share the same pattern of zero caching — every page load is a fresh AI call.

---

## Optimization Plan (7 Changes)

### Change 1: Slim Down `context-builder.ts` — Estimated 20-35% Savings

**Problem:** The context string sent with every chat message is massive. Most of it is noise — 50 emails, 100 communications, 30 SMS records are irrelevant for most queries.

**Fix:** Apply hard caps and trim low-signal data:

- Emails: Reduce from 50 → 10 (only unread or action-type)
- WhatsApp messages: 50 → 10 most recent
- SMS messages: 30 → 5 most recent
- Unified communications: 100 → 20 most recent
- Company interactions: 30 → 10 most recent
- External imports: 20 → 5 most recent
- Posts/stories: 20 posts → 5 posts, 10 stories → 3 stories

For admin context:
- Moneybird invoices: 100 → 20
- Applications: 200 → 50 (already limited, but reduce further)
- Candidate profiles: 100 → 30 (just top tiers)
- CRM prospects: 50 → 20

Also truncate the content injected per row — conversation history messages are already truncated to 300 chars, but AI memory entries, email summaries, and interaction summaries have no character limit.

**File:** `supabase/functions/_shared/context-builder.ts`

### Change 2: Add 4-Hour Cache to `ai-copilot-tips` — Estimated 80%+ Saving on that Function

**Problem:** AI tips are generated fresh on every page load. Tips do not need to be unique per-load.

**Fix:** Before calling the AI, check `ai_copilot_tips` for a tip generated for this user + page within the last 4 hours. If found, return it. Only call AI when no recent tip exists.

**File:** `supabase/functions/ai-copilot-tips/index.ts`

### Change 3: Add 2-Hour Cache to `generate-analytics-insights` — Estimated 90%+ Saving on that Function

**Problem:** No caching at all — every analytics page view is a fresh AI call.

**Fix:** Check `analytics_insights` table for an insight generated for this user in the last 2 hours. Return cached if found. Only regenerate when stale.

**File:** `supabase/functions/generate-analytics-insights/index.ts`

### Change 4: Downgrade `enrich-candidate-profile` Model — Estimated 30-50% Saving per Enrichment

**Problem:** Uses `google/gemini-3-flash-preview` (next-gen, expensive) for background enrichment that the user never sees in real time.

**Fix:** Change model to `google/gemini-2.5-flash-lite`. The task is structured JSON extraction from a template — it does not require a premium model.

**File:** `supabase/functions/enrich-candidate-profile/index.ts`

### Change 5: Add Deduplication to `analyze-email-sentiment` — Estimated 40-60% Saving on that Function

**Problem:** Same email can be analyzed multiple times on re-sync.

**Fix:** Before calling the AI, check if a sentiment result already exists for this email ID in `email_contact_matches`. If the `sentiment_score` column is already populated, skip the AI call and return the cached result.

**File:** `supabase/functions/analyze-email-sentiment/index.ts`

### Change 6: Cache Meeting Analysis Results in `analyze-meeting-recording-advanced` — Estimated 70-90% Saving on Repeat Views

**Problem:** Meeting analysis re-runs on every view. 5–10 AI calls per recording.

**Fix:** After analysis completes, store the full result in the `meeting_recordings` table's `analysis_summary` column. At the start of the function, check if `analysis_summary` is already populated — if yes, return it immediately without any AI calls.

**File:** `supabase/functions/analyze-meeting-recording-advanced/index.ts`

### Change 7: Downgrade `generate-kpi-insights` Model — Minor Saving

**Problem:** Still uses `gemini-2.5-flash` even though it has a 1h cache guard. When it does regenerate, it uses a mid-tier model for a simple structured summary.

**Fix:** Downgrade to `gemini-2.5-flash-lite`. This is a simple business summary generation task with a strict JSON output format.

**File:** `supabase/functions/generate-kpi-insights/index.ts`

---

## Summary Table

| Change | Function | Mechanism | Estimated Saving |
|---|---|---|---|
| 1 | `context-builder.ts` | Reduce row limits and field lengths | 20–35% of total |
| 2 | `ai-copilot-tips` | 4-hour cache per user+page | 80%+ on that function |
| 3 | `generate-analytics-insights` | 2-hour cache per user | 90%+ on that function |
| 4 | `enrich-candidate-profile` | Cheaper model (`flash-lite`) | 30–50% per enrichment |
| 5 | `analyze-email-sentiment` | Skip if already analyzed | 40–60% on that function |
| 6 | `analyze-meeting-recording-advanced` | Cache result after first run | 70–90% on repeat views |
| 7 | `generate-kpi-insights` | Cheaper model (`flash-lite`) | ~30% on regeneration |

**Combined additional savings: estimated 25–40% further reduction on top of Round 1.**

---

## Files Changed

1. `supabase/functions/_shared/context-builder.ts` — reduce all row limits and per-row character limits
2. `supabase/functions/ai-copilot-tips/index.ts` — add 4h cache check
3. `supabase/functions/generate-analytics-insights/index.ts` — add 2h cache check
4. `supabase/functions/enrich-candidate-profile/index.ts` — swap model to `gemini-2.5-flash-lite`
5. `supabase/functions/analyze-email-sentiment/index.ts` — add deduplication guard
6. `supabase/functions/analyze-meeting-recording-advanced/index.ts` — add result cache check
7. `supabase/functions/generate-kpi-insights/index.ts` — swap model to `gemini-2.5-flash-lite`

No database schema changes required — all caches use existing tables.
