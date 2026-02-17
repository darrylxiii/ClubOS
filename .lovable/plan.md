

# Fix Fireflies Sync + Import All Fathom Meetings

## Root Causes Found

### Fireflies: Check Constraint Blocks All Inserts
The `meeting_recordings_extended` table has a CHECK constraint that only allows these `source_type` values: `tqc_meeting`, `live_hub`, `conversation_call`, `fathom`. The value `'fireflies'` is rejected, causing all 339 transcripts to fail with error code `23514`. The Fireflies API call itself works perfectly -- it found 339 transcripts -- but every insert was rejected by the database.

### Fathom: Pagination Not Fetching All Meetings
Only 10 Fathom meetings were imported. The sync function does not send a `limit` parameter to the Fathom API, so it uses the API's default page size (likely 10 or 25). Combined with potential cursor issues, this means only the first page of results is being fetched. Additionally, the `.in()` dedup query can silently truncate if the ID list exceeds Supabase's internal limits, so dedup should be batched for large sets.

---

## Step 1: Database Migration -- Add 'fireflies' to Check Constraint

Drop and re-create the check constraint to include `'fireflies'`:

```sql
ALTER TABLE meeting_recordings_extended
  DROP CONSTRAINT meeting_recordings_extended_source_type_check;

ALTER TABLE meeting_recordings_extended
  ADD CONSTRAINT meeting_recordings_extended_source_type_check
  CHECK (source_type = ANY (ARRAY['tqc_meeting','live_hub','conversation_call','fathom','fireflies']));
```

This is the only fix needed for Fireflies. The edge function code is correct.

## Step 2: Fix Fathom Pagination

Update `supabase/functions/sync-fathom-recordings/index.ts`:

- Add an explicit `limit` parameter (e.g., `100`) to each Fathom API call so it fetches the maximum per page
- Increase `MAX_PAGES` from 20 to 50 to handle larger meeting histories
- Batch the `.in()` dedup query into chunks of 200 IDs to avoid silent truncation

## Step 3: Batch Fireflies Dedup Query

Same `.in()` batching fix for `sync-fireflies-recordings/index.ts` -- split the dedup query into chunks of 200 IDs to handle the 339+ transcripts properly.

---

## Files Summary

| File | Action |
|------|--------|
| Database migration | Add `'fireflies'` to `source_type` check constraint |
| `supabase/functions/sync-fathom-recordings/index.ts` | Add `limit` param, increase max pages, batch dedup |
| `supabase/functions/sync-fireflies-recordings/index.ts` | Batch dedup query into chunks |

## Risk

Low. The constraint change is additive. The pagination fixes follow the same patterns already in use. No schema changes beyond the constraint update.

