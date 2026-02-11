

# Fix: LinkedIn Sync Failing to Save Data

## Root Cause Analysis

After a comprehensive audit of the scraper, client code, database, and logs, here is what is happening:

### The scraper works perfectly
The edge function logs confirm successful runs. For example, the most recent sync for "Lilian K." at 23:23:55 correctly returned:
- Profile picture URL (persisted to storage)
- 5 work history entries with dates
- 2 education entries
- Full name "Lilian K."

### The database was never updated
Despite the scraper succeeding, the database still shows:
- `avatar_url`: null
- `full_name`: "Liliankalman" (URL-extracted fallback, not "Lilian K.")
- `enrichment_last_run`: 23:18:20 (from an earlier attempt, not the 23:23 run)

### Bug: Response key mismatch in CandidateQuickActions

The scraper returns:
```text
{ success: true, data: { full_name: "...", avatar_url: "...", ... } }
```

But `CandidateQuickActions.tsx` (line 50) checks for `data?.candidateData` which does NOT exist in the response. The correct key is `data.data`. This causes the entire update block to be silently skipped -- no error is thrown, no toast is shown, and the profile data is never saved to the database.

### Other entry points are correct
- `CandidateHeroSection.tsx` -- uses `data.data` (correct)
- `CandidateProfile.tsx` -- uses `data.data` (correct)
- `AddCandidateDialog.tsx` -- uses `data.data` (correct)

So if the user is triggering the sync from the "Import LinkedIn" button in `CandidateQuickActions`, it will always silently fail. If using "Sync LinkedIn" in the hero section, it should work -- unless the deployed frontend code was stale.

## Fix

### File: `src/components/partner/CandidateQuickActions.tsx`

Update the response handling to match the actual scraper response format and use the same null-safe update pattern as the other entry points:

**Line 50**: Change `data?.candidateData` to `data?.data`

**Lines 50-73**: Replace the entire update block:
- Read from `data.data` instead of `data.candidateData`
- Use null-safe field-by-field updates (matching the pattern in CandidateHeroSection)
- Add `enrichment_last_run` and `linkedin_profile_data` to the update
- Add `source_metadata`, `enrichment_data` timestamps

### Before (broken):
```text
if (data?.candidateData) {
  const { error: updateError } = await supabase
    .from("candidate_profiles")
    .update({
      full_name: data.candidateData.full_name || undefined,
      ...
    })
    .eq("id", candidateId);
```

### After (fixed):
```text
if (data?.success && data?.data) {
  const d = data.data;
  const updates: Record<string, unknown> = {};

  if (d.full_name) updates.full_name = d.full_name;
  if (d.current_title) updates.current_title = d.current_title;
  if (d.current_company) updates.current_company = d.current_company;
  if (d.avatar_url) updates.avatar_url = d.avatar_url;
  if (d.location) updates.location = d.location;
  if (d.years_of_experience) updates.years_of_experience = d.years_of_experience;
  if (d.work_history?.length) updates.work_history = d.work_history;
  if (d.education?.length) updates.education = d.education;
  if (d.skills?.length) updates.skills = d.skills;
  if (d.ai_summary) updates.ai_summary = d.ai_summary;
  if (d.linkedin_profile_data) updates.linkedin_profile_data = d.linkedin_profile_data;
  updates.linkedin_url = linkedinUrl;
  updates.enrichment_last_run = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("candidate_profiles")
    .update(updates)
    .eq("id", candidateId);
```

## Summary

| File | Issue | Fix |
|------|-------|-----|
| `src/components/partner/CandidateQuickActions.tsx` | Reads `data.candidateData` (does not exist) | Change to `data.data` with null-safe updates |

This is a one-file fix. No scraper changes needed -- the scraper is working correctly. After this fix, clicking "Import LinkedIn" from CandidateQuickActions will correctly save the profile picture, name, work history, education, and all other fields to the database.

