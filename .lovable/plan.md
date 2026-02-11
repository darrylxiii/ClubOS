

# Fix: LinkedIn Sync Fails Due to Missing `location` Column

## Root Cause

The scraper succeeds (HTTP 200), but the **client-side database update** fails with:

```
PGRST204: Could not find the 'location' column of 'candidate_profiles' in the schema cache
```

The `candidate_profiles` table has no `location` column. The correct column is `desired_locations`. Three files attempt to write `updates.location = d.location`, which causes the entire `.update()` call to fail.

## Fix

Remove the `location` line from all three files. The location data from LinkedIn is already stored inside `linkedin_profile_data`, so no data is lost.

### File 1: `src/components/candidate-profile/CandidateHeroSection.tsx` (line 71)
- **Delete**: `if (d.location) updates.location = d.location;`

### File 2: `src/components/partner/CandidateQuickActions.tsx` (line 58)
- **Delete**: `if (d.location) updates.location = d.location;`

### File 3: `src/pages/CandidateProfile.tsx` (line 172)
- **Delete**: `if (d.location) updates.location = d.location;`

## Technical Details

- The column `desired_locations` exists but stores an array of preferred work locations (candidate preference), not LinkedIn profile location. Writing a single string there would be semantically wrong, so the correct fix is simply to remove the invalid write.
- The LinkedIn location string is preserved in the `linkedin_profile_data` JSONB column and can be displayed from there if needed.

## Summary

| File | Line | Change |
|------|------|--------|
| `CandidateHeroSection.tsx` | 71 | Remove `updates.location` line |
| `CandidateQuickActions.tsx` | 58 | Remove `updates.location` line |
| `CandidateProfile.tsx` | 172 | Remove `updates.location` line |

One-line removal in three files. After this fix, LinkedIn sync will save all profile data (picture, name, work history, education, skills) without the column-not-found error.

