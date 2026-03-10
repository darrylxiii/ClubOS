

# Fix: Pipeline Candidate Counts Showing 0

## Root Cause

The `PartnerJobsHome.tsx` applications query (line 172-186) joins `profiles(full_name, avatar_url)` on the `applications` table. Before the review system upgrade, there was only **one FK** from `applications` to `profiles` (`sourced_by`). Now there are **three** (`sourced_by`, `internal_reviewed_by`, `partner_reviewed_by`), making the join **ambiguous**. PostgREST fails silently, returning `null` for the entire applications query, causing all candidate counts to be 0.

## Fix

**File: `src/components/partner/PartnerJobsHome.tsx`** (line ~172-186)

Remove the ambiguous `profiles(...)` join from the applications select. The `last_activity_user` data it provided is minor and can be sourced from `candidate_profiles` which has an unambiguous FK via `candidate_id`:

```typescript
// BEFORE (broken - ambiguous FK)
.select(`
  id, job_id, current_stage_index, stages, updated_at, user_id,
  profiles (full_name, avatar_url)
`)

// AFTER (fixed - use candidate_profiles instead)
.select(`
  id, job_id, current_stage_index, stages, updated_at, user_id, candidate_id,
  candidate_profiles (full_name, avatar_url)
`)
```

Update the `lastActivityUser` mapping (line ~213-216) to read from `candidate_profiles` instead of `profiles`.

## Other Affected File

**File: `src/pages/admin/TargetCompaniesOverview.tsx`** (line ~66) — uses `profiles(full_name, avatar_url)` on `target_companies` table. This table likely has only one FK to profiles so it's not broken, but should be verified.

## Audit of Other Stats

All other stats in the job cards (`active_stage_count`, `days_since_opened`, `conversion_rate`, `club_sync_status`, `hired_count`) are computed from the same applications array. Once the query returns data again, all stats will be correct. No other query in `PartnerJobsHome` uses an ambiguous profiles join.

## Summary
- 1 file to edit: `PartnerJobsHome.tsx`
- Change: Replace `profiles(...)` with `candidate_profiles(...)` in the applications select query + update the mapping code
- No database changes needed

