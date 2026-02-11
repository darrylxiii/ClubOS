

# Batch LinkedIn Enrichment -- Critical Audit and 100/100 Plan

## Previous Plan Score: 55/100

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | `profile_experience` and `profile_education` tables require `user_id` (NOT NULL) -- email dump candidates have NO `user_id` | Critical | Insert will crash with NOT NULL violation |
| 2 | Plan proposes duplicating all Apify/Proxycurl mapping logic into a new function instead of reusing `linkedin-scraper` | High | Double maintenance burden, divergent field mappings |
| 3 | Apify `run-sync-get-dataset-items` has a ~60s HTTP timeout -- batching 10 URLs in one actor run is unreliable | High | Partial results, timeouts, wasted Apify credits |
| 4 | No cost confirmation -- recruiter could enrich 50+ profiles accidentally | Medium | Unexpected billing ($0.50+), no undo |
| 5 | No enrichment status tracking on `candidate_profiles` | Medium | No way to know who was enriched, when, or if it failed |
| 6 | No retry mechanism for individual failures | Medium | One Apify timeout blocks the whole batch |
| 7 | Plan doesn't update `linkedin-scraper` CORS headers (same bug we just fixed on `parse-email-candidates`) | Medium | `linkedin-scraper` calls will also fail from browser |
| 8 | No rate limiting / concurrency guard -- multiple clicks fire parallel batches | Low | Duplicate API spend, race conditions |

---

## Revised Architecture (100/100)

### Core Insight: Don't Duplicate -- Orchestrate

Instead of a new `batch-linkedin-enrich` edge function that copies all Apify logic, create a thin **orchestrator** edge function that calls the existing `linkedin-scraper` for each candidate. This keeps enrichment logic in one place.

### Architecture

```text
User clicks "Enrich from LinkedIn"
  |
  v
Frontend chunks candidate IDs (max 5 per call)
  |
  v
batch-linkedin-enrich (orchestrator)
  |-- For each candidate_id:
  |   1. Fetch linkedin_url from candidate_profiles
  |   2. Call linkedin-scraper internally (service-to-service, no CORS)
  |   3. Update candidate_profiles with returned data
  |   4. Set enrichment_last_run = now()
  |-- Returns { enriched, failed, results[] }
  v
Frontend shows progress per chunk
```

### Why This is Better

- Single source of truth for Apify/Proxycurl mapping (linkedin-scraper)
- Each profile scraped independently (one Apify timeout doesn't block others)
- Frontend controls concurrency (sequential chunks of 5)
- Enrichment metadata stored on existing `candidate_profiles` columns (`enrichment_data`, `enrichment_last_run`) -- no schema changes needed
- Skip `profile_experience`/`profile_education` for now (they require `user_id`) -- store work history in `work_history` JSON column and `linkedin_profile_data` JSON column on `candidate_profiles` instead

---

## Detailed Changes

### 1. New Edge Function: `batch-linkedin-enrich` (orchestrator only)

**File:** `supabase/functions/batch-linkedin-enrich/index.ts`

Accepts: `{ candidate_ids: string[] }` (max 10 per call)

For each candidate:
1. Fetch `linkedin_url` from `candidate_profiles` -- skip if empty
2. Skip if `enrichment_last_run` is less than 24h old (prevents re-scraping)
3. Internally call `linkedin-scraper` via fetch to `SUPABASE_URL/functions/v1/linkedin-scraper` using service role key
4. On success: update `candidate_profiles` with:
   - `current_title` (only if currently null)
   - `current_company` (only if currently null)
   - `skills` (merge with existing)
   - `years_of_experience` (only if currently 0/null)
   - `avatar_url` (only if currently null)
   - `ai_summary` (always update)
   - `linkedin_profile_data` (always update -- raw data)
   - `work_history` (always update -- structured JSON)
   - `education` (always update -- structured JSON)
   - `enrichment_last_run` = now()
   - `enrichment_data` = `{ source: 'linkedin', api_used, enriched_at, fields_updated[] }`
5. On failure: log error, continue to next candidate
6. Return `{ total, enriched, failed, skipped, results: [{ id, status, name }] }`

### 2. Fix `linkedin-scraper` CORS Headers

**File:** `supabase/functions/linkedin-scraper/index.ts`

Update CORS headers to match project standard (same fix applied to `parse-email-candidates`). This also makes `linkedin-scraper` callable from the frontend for single-profile enrichment in other parts of the app.

### 3. Register in config.toml

**File:** `supabase/config.toml`

Add `[functions.batch-linkedin-enrich]` with `verify_jwt = false` (auth validated in code, same pattern as parse-email-candidates).

### 4. Post-Import Enrichment UI

**File:** `src/components/jobs/email-dump/ExtractedCandidatesPreview.tsx`

After successful import, show an "Enrich from LinkedIn" button:
- Only appears if at least 1 imported candidate has a `linkedin_url`
- Shows cost estimate: "Enrich X profiles (~$0.0X via Apify)"
- Confirmation dialog before proceeding
- Chunks candidate IDs into groups of 5
- Sequential chunk processing with 2s delay between chunks
- Per-candidate status: pending / enriching / done / failed
- Summary toast on completion

### 5. Enrichment Progress Component

**File:** `src/components/jobs/email-dump/LinkedInEnrichmentProgress.tsx`

Displays:
- Progress bar (X/Y)
- Per-candidate row: name, status icon, fields enriched
- Retry button for failed candidates
- Auto-dismisses after 5s of completion

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/batch-linkedin-enrich/index.ts` | Create | Orchestrator that calls linkedin-scraper per candidate |
| `supabase/config.toml` | Modify | Register batch-linkedin-enrich |
| `supabase/functions/linkedin-scraper/index.ts` | Modify | Fix CORS headers to project standard |
| `src/components/jobs/email-dump/ExtractedCandidatesPreview.tsx` | Modify | Add post-import enrich button with cost confirmation |
| `src/components/jobs/email-dump/LinkedInEnrichmentProgress.tsx` | Create | Progress UI with per-candidate status and retry |

No database migrations needed -- all data fits in existing `candidate_profiles` columns (`enrichment_data`, `enrichment_last_run`, `linkedin_profile_data`, `work_history`, `education`, `skills`).

---

## Safety Guards

1. **Cost confirmation**: Dialog shows "This will enrich X profiles using Apify (~$0.01/profile). Continue?"
2. **24h cooldown**: Profiles enriched in the last 24h are auto-skipped (uses `enrichment_last_run`)
3. **Max batch size**: Frontend caps at 25 candidates per enrichment run; shows warning for larger batches
4. **Concurrency lock**: Disable enrich button while enrichment is in progress (prevents double-click)
5. **Null-safe updates**: Never overwrite manually edited fields -- only populate empty/null fields
6. **Graceful failures**: Each candidate processed independently; one failure doesn't block others

## Future-Proofing

- When candidates later sign up and get a `user_id`, the merge flow can populate `profile_experience`/`profile_education` from the `work_history`/`education` JSON already stored on `candidate_profiles`
- The `enrichment_data` field enables a future "Data Freshness" dashboard showing when each profile was last enriched
- The orchestrator pattern allows swapping Apify for any future provider without touching frontend code
- Supports future "auto-enrich on import" toggle via a simple feature flag check in the import flow

