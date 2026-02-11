

# Deduplication Protection for Email Dump

## Current Gaps (Audit)

| # | Gap | Risk |
|---|-----|------|
| 1 | Pre-extraction duplicate check only queries `applications` for this job, not `candidate_profiles` globally | A candidate already in the system (on another job) gets created again |
| 2 | No name-based fuzzy matching during import | Candidates without email/LinkedIn create duplicates if pasted twice |
| 3 | No within-batch dedup | Same candidate appearing twice in one email paste gets imported twice |
| 4 | DB `unique_email_when_present` constraint violation crashes instead of being caught gracefully | Import fails with cryptic error |
| 5 | New profiles from email dump are not surfaced in Merge Dashboard for candidate-to-user linking | Breaks the merge flow when the candidate later signs up |

---

## Fixes

### Fix 1: Three-Layer Duplicate Detection in `checkDuplicates`

Currently only checks `applications` for this job. Will add a second layer that checks `candidate_profiles` globally:

1. **Layer 1 -- Within-batch dedup**: Before sending to AI or during preview, detect duplicate entries within the pasted content itself (same email or LinkedIn appearing multiple times). Auto-deselect duplicates within the batch.

2. **Layer 2 -- Global candidate_profiles check**: Query `candidate_profiles` by email (case-insensitive) and LinkedIn URL. If a match is found, flag it as "Existing profile" and pre-link the `candidate_id` so the import uses the existing profile instead of creating a new one.

3. **Layer 3 -- Job-specific application check**: Keep the current check against `applications` for this job. If the candidate already has an active application for THIS job, flag as "Already in pipeline" and auto-deselect.

### Fix 2: Name-Based Fuzzy Matching

For candidates without email or LinkedIn, add a name-based check:
- Query `candidate_profiles` where `full_name ILIKE` the extracted name
- If found, show as "Possible match" (yellow) with the existing profile info
- Do NOT auto-merge by name alone -- let the user confirm

### Fix 3: Graceful Constraint Violation Handling

Wrap the `candidate_profiles` insert in a try-catch that specifically handles the `unique_email_when_present` constraint:
- If the insert fails with a uniqueness violation, fetch the existing profile and use its ID instead
- This acts as a final safety net even if the frontend checks miss something

### Fix 4: Merge Flow Integration

When a new `candidate_profile` is created via email dump (source_channel = 'email_dump'):
- The existing merge system already picks these up because `merge_suggestions` is typically populated by matching email addresses
- Add `source_metadata` with `{ origin: 'email_dump', dump_id: '...' }` so the merge dashboard can show the source context
- No additional tables or triggers needed -- the existing merge flow handles this

### Fix 5: Enhanced UI Feedback

Update `ExtractedCandidatesPreview` to show richer duplicate info:
- "New" (green) -- no match found anywhere
- "Existing profile" (blue) -- matched in candidate_profiles, will link to existing
- "Already in pipeline" (yellow) -- already has an application for this job, auto-deselected
- "Possible name match" (orange) -- fuzzy name match, needs user confirmation
- "Duplicate in batch" (red) -- same person appears multiple times in the paste

---

## Files to Modify

1. **`src/components/jobs/email-dump/EmailDumpTab.tsx`** -- Rewrite `checkDuplicates` function with three-layer detection including global candidate_profiles lookup and within-batch dedup
2. **`src/components/jobs/email-dump/ExtractedCandidatesPreview.tsx`** -- Enhanced duplicate badge UI with match types (existing/pipeline/name/batch), graceful constraint error handling in import logic, add `source_metadata` when creating profiles
3. No database or edge function changes needed -- the existing `unique_email_when_present` index and merge flow already support this

## Technical Details

### Updated `checkDuplicates` function

```text
1. Collect all emails and LinkedIn URLs from extracted candidates
2. Batch query candidate_profiles WHERE email IN (...) OR linkedin_url IN (...)
3. Batch query applications WHERE job_id = X AND (candidate_email IN (...) OR candidate_linkedin_url IN (...))
4. For candidates with no email/LinkedIn, query candidate_profiles WHERE full_name ILIKE name
5. Within-batch: detect duplicates by grouping on email or LinkedIn
6. Return candidates with match_type: 'new' | 'existing_profile' | 'in_pipeline' | 'name_match' | 'batch_duplicate'
```

### Graceful Insert with Fallback

```text
try:
  insert into candidate_profiles
catch unique_violation:
  select id from candidate_profiles where email = X
  use that id instead
```

### Merge Flow Compatibility

New profiles get `source_channel: 'email_dump'` and `source_metadata: { dump_id, job_id }`. When the candidate later signs up with the same email, the existing merge system (auto-merge toggle or Merge Dashboard) will detect the match and link the user account to the existing profile.

