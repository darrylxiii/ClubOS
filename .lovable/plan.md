
# Plan 1 of 4: Fix N+1 Query Problem in Job Pipeline

## Problem
The `fetchApplicationsForMetrics` function in `JobDashboard.tsx` (lines 300-484) performs **sequential database queries for every single candidate**. For a pipeline with 50 candidates, this means:

- 1 query for all applications
- Then for EACH application: 1 query to `candidate_profiles`, potentially 1 to `profiles` (avatar), 1 to `candidate_interactions` as fallback, plus another `profiles` query
- **Result: 150-200+ individual DB calls per page load**

Every action (advance, decline, add stage) calls `fetchJobDetails()` which re-runs this entire waterfall.

## Solution
Replace the N+1 per-candidate queries with **3 batch queries** using Supabase `.in()` filters, then join client-side.

## Changes

### File: `src/pages/JobDashboard.tsx`

**Replace lines 300-419** (the `fetchApplicationsForMetrics` enrichment loop) with:

```
Step 1: Fetch all applications (existing, unchanged)

Step 2: Collect all unique candidate_ids and user_ids from applications

Step 3: Batch-fetch candidate_profiles for all candidate_ids in ONE query
  SELECT id, user_id, full_name, email, phone, avatar_url, 
         current_title, current_company, linkedin_url
  FROM candidate_profiles WHERE id IN (...candidateIds)

Step 4: Batch-fetch profiles for all user_ids in ONE query
  SELECT id, full_name, email, phone, avatar_url
  FROM profiles WHERE id IN (...userIds)

Step 5: Build lookup maps (candidateProfilesMap, profilesMap)

Step 6: Enrich applications using maps (no DB calls)
  - For each app, look up candidate_profiles by app.candidate_id
  - Fall back to profiles by app.user_id
  - Merge avatar from profiles if candidate_profile has a linked user_id
```

This reduces ~150 queries down to exactly **3 queries** regardless of candidate count.

### Metrics calculation (lines 424-480)
No changes needed -- it already operates on the enriched array in memory.

### Removal of `candidate_interactions` fallback
The legacy lookup via `candidate_interactions` (lines 354-393) is removed from the hot path. This was a per-row query that rarely matched. If needed later, it can be added as a single batch query.

## Impact
- Page load: ~150 DB calls reduced to 3
- Every pipeline action refresh: same improvement
- No UI changes, no schema changes, no new dependencies

## Risk
- Low. Same data, same output shape. The enriched application objects keep the same fields (`full_name`, `email`, `avatar_url`, etc.)
- The `candidate_interactions` fallback removal could affect edge-case candidates added through a very old flow. These would show as "Candidate" with no profile data until their `candidate_id` is set on the application row.
