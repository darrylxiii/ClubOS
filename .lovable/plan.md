

# Critique of the Current Plan: 62/100

## What the Current Plan Gets Right
- Correct use of Proxycurl Employee Listing Endpoint
- Good schema design for `company_people` and `company_people_changes`
- Change detection (new hires, departures) is the right core idea
- Cost awareness around Proxycurl credits
- AI-inferred departments and seniority -- solid concept

## Where the Current Plan Fails (Why It Loses 38 Points)

### 1. FATAL: Proxycurl Geographic Limitation (-8 points)
The Employee Listing Endpoint **only covers US, UK, Canada, Israel, Australia, Ireland, New Zealand, and Singapore** (per Proxycurl's own docs). Many of your partners are in the Netherlands, Germany, UAE, and broader Europe. The plan pretends this limitation does not exist. A billion-dollar plan has a fallback strategy.

**Fix**: Use the Employee Listing for covered countries. For uncovered countries, use Proxycurl's **Employee Search Endpoint** (`/api/linkedin/company/employee/search/`) which works globally but costs 10 credits per result. For very large companies, combine with the **Employee Count Endpoint** (1 credit) to decide which strategy to use.

### 2. FATAL: No Credit Budget System (-7 points)
Scanning a 500-person company costs $50+ in Proxycurl credits. There is zero budgeting, no approval flow, no daily spend cap. A single strategist clicking "Scan" on 20 companies could burn $1,000 in an hour with no warning.

**Fix**: Add a `proxycurl_credit_ledger` table. Track estimated vs actual credits per scan. Require admin approval for scans estimated above a configurable threshold (e.g., 500 credits). Show running monthly spend on the admin dashboard.

### 3. CRITICAL: No Incremental Enrichment (-6 points)
The plan describes "full scan" vs "delta scan" but never defines how to partially enrich. If a 300-person company scan fails at person 187 (timeout, rate limit, credit exhaustion), the plan has no concept of resuming. The entire scan is either "completed" or "failed."

**Fix**: Process people in a queue. Each person is a row in `company_scan_queue` with status `pending/enriching/enriched/failed`. The edge function processes N people per invocation and is called repeatedly until the queue is empty. This makes scans resumable, throttle-friendly, and observable.

### 4. CRITICAL: Missing Data Consent and Privacy (-5 points)
You are scraping third-party LinkedIn profiles and storing PII (names, photos, work history) of people who never consented. The plan has zero mention of GDPR Article 6 legitimate interest assessment, data retention limits, or right-to-erasure for scraped individuals. For a company that "privacy-first" is a stated principle, this is a gap.

**Fix**: Add `data_legal_basis` column (legitimate_interest). Add a 12-month auto-purge for non-refreshed profiles. Add a "Request Deletion" mechanism if someone contacts TQC about their scraped data. Document the legitimate interest assessment in a compliance note.

### 5. HIGH: Org Structure Inference Is Naive (-4 points)
Sending 300 job titles to an LLM and asking "what department?" is unreliable, expensive (300 titles x token cost), and slow. The plan treats this as a single AI call when it should be a classification pipeline.

**Fix**: Use a two-tier approach:
- **Tier 1: Rule-based classifier** -- regex/keyword matching handles 80% of cases instantly and free ("Software Engineer" -> Engineering, "VP Sales" -> Sales, "CFO" -> Finance/C-Suite). Build a lookup table of 200 common title patterns.
- **Tier 2: AI for ambiguous titles** -- only send the 20% that the rules engine cannot classify to Lovable AI, in a single batch call (not per-person).

### 6. HIGH: No Deduplication Against Existing Candidates (-4 points)
You already have a `candidate_profiles` table with LinkedIn URLs. If John Smith is both a candidate in your talent pool AND an employee at Partner Company X, the plan creates a completely separate `company_people` record with no link. Two records, two avatars, no connection.

**Fix**: Add `matched_candidate_id` to `company_people`. After enrichment, cross-reference `company_people.linkedin_url` against `candidate_profiles.linkedin_url`. When matched, create a bidirectional link. This is the "golden record" pattern and it unlocks: "3 of your candidates already work at this company."

### 7. MEDIUM: Edge Function Timeout Risk (-3 points)
Deno edge functions have a ~60s execution limit. Scraping 200 profiles with 2-second delays = 400 seconds minimum. The plan ignores this entirely.

**Fix**: The queue-based approach from point 3 solves this. Each function invocation processes a batch of 10-15 profiles, then terminates. A pg_cron job or client-side polling triggers the next batch.

### 8. MEDIUM: No Company LinkedIn URL Validation (-2 points)
The plan assumes every partner company has a valid `linkedin_url` in the `companies` table. What if it is null, malformed, or a personal profile URL instead of a company page?

**Fix**: Validate the URL format before scanning. Use Proxycurl's Company Resolve Endpoint (2 credits) to verify the URL resolves to a real company page. Surface validation errors clearly in the UI.

### 9. LOW: Nightly Delta Scan Is Wasteful (-2 points)
Scanning 50 partner companies nightly (URL-only mode, 1 credit/employee) for 200 employees each = 10,000 credits/night = $100/day. Most companies have near-zero turnover on any given day.

**Fix**: Configurable scan frequency per company (weekly default, daily for high-priority partners). Use the Employee Count Endpoint first (1 credit total) to check if headcount changed before running the full listing.

### 10. LOW: Visualization Is Underdefined (-1 point)
"Department-grouped tree view" with no specification of what library, layout algorithm, or interaction model. This will turn into a giant wall of cards that is unusable for a 300-person company.

**Fix**: Use a collapsible accordion grouped by department, with a count badge. Default collapsed. Search filters instantly across all departments. No tree rendering for > 50 people -- switch to table with department column.

---

# The 100/100 Plan: Partner Organization Intelligence v2

## Architecture: Queue-Based Scan Engine

Instead of one monolithic edge function that times out, build a scan pipeline:

```text
Admin clicks "Scan" 
  -> creates scan_job (status: pending)
  -> creates N queue items (one per batch of LinkedIn URLs)
  -> edge function processes batch of 10-15 profiles per invocation
  -> pg_cron or client polling triggers next batch
  -> all batches complete -> scan_job status: analyzing
  -> AI classification runs on ambiguous titles
  -> scan_job status: completed
  -> change detection compares new vs old data
  -> alerts created
```

## Database Schema

### `company_people`

Same as original plan, plus these additions:

| Column | Type | Purpose |
|---|---|---|
| `matched_candidate_id` | uuid FK -> candidate_profiles | Link to existing candidate if matched |
| `data_legal_basis` | text DEFAULT 'legitimate_interest' | GDPR compliance |
| `enrichment_status` | text DEFAULT 'pending' | pending/enriched/failed/stale |
| `enrichment_error` | text | Last error if enrichment failed |
| `last_refreshed_at` | timestamptz | When profile was last re-fetched |
| `auto_purge_at` | timestamptz | 12 months after last_refreshed_at |
| `title_classification_method` | text | 'rule_based' or 'ai_inferred' |

### `company_scan_queue`

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Queue item ID |
| `scan_job_id` | uuid FK | Parent scan job |
| `linkedin_url` | text | Profile URL to process |
| `status` | text | pending/processing/completed/failed |
| `attempts` | integer DEFAULT 0 | Retry count |
| `processed_at` | timestamptz | When completed |
| `error_message` | text | If failed |

### `proxycurl_credit_ledger`

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Ledger entry |
| `scan_job_id` | uuid FK | Which scan |
| `company_id` | uuid FK | Which company |
| `endpoint_used` | text | employee_listing / profile_lookup / employee_search |
| `credits_estimated` | integer | Pre-scan estimate |
| `credits_actual` | integer | Actual credits consumed |
| `created_at` | timestamptz | When |

### `company_people_changes` and `company_scan_jobs`

Same as original plan -- these were well designed.

## Edge Functions

### `scan-partner-organization` (revised)

Phase 1 -- Discovery:
1. Validate company LinkedIn URL (format check + Proxycurl Company Resolve if needed)
2. Call Employee Count Endpoint (1 credit) to get headcount
3. If headcount > configurable limit (default 1000), return warning and require admin confirmation
4. Estimate credit cost: `headcount x 3` for Employee Listing (URL-only) + `headcount x 10` for enrichment
5. Check credit budget (monthly cap configurable, default 50,000)
6. Create `scan_job` and populate `company_scan_queue` with batches

Phase 2 -- Listing:
1. Call Employee Listing Endpoint in URL-only mode (3 credits/employee, works for US/UK/CA/IL/AU/IE/NZ/SG)
2. If < 50% of expected headcount returned (geographic limitation), fall back to Employee Search Endpoint for remaining
3. Populate `company_scan_queue` with all discovered LinkedIn URLs

Phase 3 -- Enrichment (batch processor):
1. Pick next 10 `pending` items from `company_scan_queue`
2. For each, call Proxycurl Profile Endpoint or use `enrich_profiles=enrich` on listing
3. Upsert into `company_people`
4. Mark queue items as `completed`
5. Return `{ hasMore: true/false }` so client knows to trigger next batch

### `process-scan-batch` (new)

Dedicated batch processor that is called repeatedly:
1. Find next unprocessed batch for a given `scan_job_id`
2. Enrich 10-15 profiles
3. Cross-reference against `candidate_profiles` by `linkedin_url` to set `matched_candidate_id`
4. Run rule-based title classification (80% coverage)
5. Return progress stats
6. When all batches done, trigger `classify-org-titles` for remaining ambiguous titles

### `classify-org-titles` (new, replaces `infer-org-structure`)

1. Query all `company_people` for a company where `title_classification_method IS NULL`
2. Run rule-based classifier first (keyword lookup table):
   - "Engineer|Developer|SRE|DevOps|QA|Architect" -> Engineering
   - "Sales|Account Executive|BDR|SDR|Revenue" -> Sales
   - "Marketing|Brand|Content|Growth|SEO|PR" -> Marketing
   - "CEO|CTO|CFO|COO|CPO|CHRO|CRO" -> C-Suite
   - "VP|Vice President" -> VP
   - "Director" -> Director
   - "Manager|Lead|Head of" -> Manager
   - Etc. (~50 rules covering 80% of titles)
3. For remaining unclassified titles, batch them (up to 100) into a single Lovable AI call
4. Store results with `title_classification_method = 'rule_based'` or `'ai_inferred'`

### `detect-org-changes` (revised)

Instead of nightly for all companies:
1. Query companies due for re-scan (based on `next_scan_at` per company, configurable)
2. Call Employee Count Endpoint (1 credit) first -- if count is unchanged, skip the full listing
3. If count changed, run URL-only Employee Listing and compare
4. For new URLs: enrich profile, create `new_hire` change record
5. For missing URLs: check their current profile to detect where they went, create `departure` change record
6. For existing URLs with title changes: create `title_change` or `promotion` record

## Frontend Components

### `PartnerOrgIntelligence.tsx` -- Main wrapper (new tab on CompanyPage)

Added as a new tab "People" on the existing CompanyPage (between Intelligence and ML Insights tabs). Shows:

- **Scan controls**: "Scan Organization" button with cost estimate dialog
- **Stats bar**: headcount, departments, avg tenure, new hires (30d), departures (30d), matched candidates count
- **Sub-tabs**: Directory | Changes | Insights

### `OrgPeopleTable.tsx` -- People Directory

Collapsible accordion by department (not a tree). Each department section:
- Department name + badge with count
- Collapsed by default (except the first 3)
- Within each: sortable table with Name, Title, Seniority, Tenure, Location, Status
- "Matched Candidate" indicator for people who are also in your talent pool
- Global search bar that filters across all departments instantly
- For > 50 total people: pure table mode with department as a filterable column

### `OrgChangesFeed.tsx` -- Change Timeline

Same as original plan, but with:
- Filter by change type (new_hire / departure / promotion)
- "Mark as Opportunity" button that creates a candidate lead
- For departures: show "Went to: [Company] as [Title]" when detectable
- Weekly digest summary at the top ("This week: 3 new hires, 1 departure")

### `ScanProgressDialog.tsx` -- Real-time Progress

Shows:
- Progress bar: `profiles_enriched / total_employees_found`
- Credits used vs estimated
- Live count of changes detected
- "Pause Scan" / "Resume Scan" buttons (sets queue items back to pending)
- Estimated time remaining

### `OrgInsightsCard.tsx` -- AI Summary

Uses Lovable AI to generate a brief (3-5 bullet) insight summary:
- Team size and growth trends
- Key leadership gaps or changes
- Attrition signals
- Cross-reference with your open roles: "You have 2 open roles that match departments growing at this company"
- Only generated on-demand (button click), not automatically (saves AI credits)

## Smart Features (Unchanged from Original -- These Were Good)

1. Departure-to-Candidate Pipeline
2. Hiring Signal Detection
3. Decision Maker Mapping
4. Cross-Company Network Detection
5. Talent Pool Integration via `matched_candidate_id`

## GDPR and Data Hygiene

- `data_legal_basis = 'legitimate_interest'` on all scraped records
- `auto_purge_at = last_refreshed_at + 12 months` -- a scheduled function deletes stale records
- If someone requests deletion: edge function to remove their `company_people` record and create an audit log entry
- Never surface scraped profile data to Partner role users -- only Admin and Strategist

## RLS Policies

- `company_people`: Admin and Strategist only (no Partner, no Candidate)
- `company_people_changes`: Admin and Strategist only
- `company_scan_jobs`: Admin only
- `company_scan_queue`: Admin only (internal processing table)
- `proxycurl_credit_ledger`: Admin only

## Implementation Order

1. Database migration: 5 tables + RLS + indexes
2. Rule-based title classifier utility (pure TypeScript, no API needed)
3. `scan-partner-organization` edge function (discovery + listing phases)
4. `process-scan-batch` edge function (enrichment + candidate matching)
5. `classify-org-titles` edge function (rule-based + AI fallback)
6. `ScanProgressDialog` component (so admin can see progress)
7. `OrgPeopleTable` component (directory view)
8. `PartnerOrgIntelligence` wrapper + add tab to CompanyPage
9. `OrgChangesFeed` component
10. `detect-org-changes` scheduled function
11. `OrgInsightsCard` AI summary
12. Credit ledger dashboard widget

## Files to Create

| File | Purpose |
|---|---|
| Migration SQL | 5 tables, RLS, indexes, auto-purge function |
| `src/lib/titleClassifier.ts` | Rule-based department/seniority classifier |
| `supabase/functions/scan-partner-organization/index.ts` | Discovery + listing orchestrator |
| `supabase/functions/process-scan-batch/index.ts` | Batch profile enrichment |
| `supabase/functions/classify-org-titles/index.ts` | Rule-based + AI title classification |
| `supabase/functions/detect-org-changes/index.ts` | Scheduled change detection |
| `src/components/organization/PartnerOrgIntelligence.tsx` | Main tab wrapper |
| `src/components/organization/OrgPeopleTable.tsx` | People directory |
| `src/components/organization/OrgChangesFeed.tsx` | Change timeline |
| `src/components/organization/OrgInsightsCard.tsx` | AI insights |
| `src/components/organization/ScanProgressDialog.tsx` | Scan progress modal |
| `src/hooks/usePartnerOrgIntelligence.ts` | Data fetching + polling hook |

## Files to Modify

| File | Change |
|---|---|
| `src/pages/CompanyPage.tsx` | Add "People" tab (admin/strategist only) |
| `src/types/organization.ts` | Add types for company_people, changes, scan_jobs |

