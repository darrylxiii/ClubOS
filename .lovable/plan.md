

# Fix: LinkedIn Profile Pictures, School Logos, and Data Mapping

## Root Cause

The apimaestro API returns data in a **nested structure**, not flat. The scraper assumes flat fields but the actual response looks like:

```text
{
  "basic_info": {
    "fullname": "Lilian K.",
    "profile_picture_url": "https://media.licdn.com/...",
    "headline": "...",
    "about": "..."
  },
  "experience": [...],
  "education": [...],
  "languages": [...]
}
```

The scraper currently does `data.profilePicture` which is `undefined` because the actual field is `data.basic_info.profile_picture_url`. This is why:

1. **Profile pictures are always empty** -- the URL exists at `basic_info.profile_picture_url` but is never read
2. **School logos may be empty** -- the API might store them under a different education sub-field
3. **Name, headline, location, summary** are also partially broken -- they work only because the fallback chain (`data.fullName || ... || extractNameFromUrl()`) eventually catches something

## Fix: Flatten `basic_info` before mapping

**File:** `supabase/functions/linkedin-scraper/index.ts`

After line 215 (`const data = ...`), flatten `basic_info` into the top-level data object so all existing field mappings work, plus add the new field names:

```text
// Flatten basic_info into data for unified field access
const basicInfo = data.basic_info || {};
const flatData = { ...basicInfo, ...data };
```

Then replace all `data.` references in the mapper (lines 220-265) with `flatData.`:

### Profile picture fix (most critical):
```text
imageUrl: flatData.profile_picture_url || flatData.profilePicture 
  || flatData.profilePictureUrl || flatData.image || flatData.avatar 
  || flatData.profile_pic_url || flatData.profileImage || '',
```

### Name fix:
```text
const fullName = flatData.fullname || flatData.fullName || flatData.full_name 
  || flatData.name || (flatData.first_name && flatData.last_name 
    ? `${flatData.first_name} ${flatData.last_name}` : null) 
  || extractNameFromUrl(linkedinUrl);
```

### Other basic fields:
```text
headline: flatData.headline || flatData.title || flatData.occupation || '',
location: flatData.location || flatData.addressLocality || flatData.city || '',
summary: flatData.about || flatData.summary || flatData.description || '',
email: flatData.email || flatData.personal_email || '',
```

### Education school logos:
Add more logo field names to the education mapper:
```text
schoolLogo: edu.logo || edu.logoUrl || edu.schoolLogo || edu.school_logo 
  || edu.school_logo_url || edu.schoolLogoUrl || edu.companyLogo || '',
```

## Fix: Data Repair for existing candidates

Run a one-time SQL update to set `avatar_url` from the raw `linkedin_profile_data` for candidates where the profile picture was captured but never saved:

Since the raw data already has `imageUrl: ""` for current candidates (the profile picture URL was never captured in the first place), the fix primarily prevents this from happening on the **next sync**. After deploying the scraper fix, a re-sync via "Sync LinkedIn" will correctly capture the profile picture.

However, to avoid requiring manual re-syncs, also write a small migration that calls the scraper for all candidates with `avatar_url IS NULL AND linkedin_url IS NOT NULL`. This is optional -- a manual "Sync LinkedIn" click per candidate would also work.

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/linkedin-scraper/index.ts` | Flatten `basic_info` into `flatData` before mapping; add `profile_picture_url` and `fullname` to field chains; add more education logo field names |

After deployment, clicking "Sync LinkedIn" on any candidate will:
1. Correctly capture their profile picture from `basic_info.profile_picture_url`
2. Download and store it in the avatars bucket
3. Save the permanent URL as `avatar_url`
4. Capture school/university logos if available from the API

No UI changes needed -- the `CandidateHeroSection` and `ExperienceTimeline` components already render `avatar_url`, `company_logo`, and `school_logo` correctly. The issue was purely that the scraper never extracted these values from the API response.

