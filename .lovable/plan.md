

# Fix LinkedIn Sync: Data Not Populating on Candidate Profile

## Score of Current Implementation: 30/100

### Root Cause Analysis

There are **two separate "Sync LinkedIn" code paths** -- both broken differently:

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| 1 | **CandidateHeroSection** does `.update(data.data)` -- dumps raw scraper response directly into DB. Fields like `source_metadata` (object) may conflict with column types, and no field mapping is applied. | `CandidateHeroSection.tsx:64-67` | Score jumps (completeness recalculates) but most fields don't actually persist due to column mismatches |
| 2 | **Field name mismatch**: Scraper returns `{startDate, endDate}` for work history but the Experience tab renders `{start_date, end_date}`. Same for education: `{school, startYear, endYear}` vs `{institution, start_year, end_year}` | `linkedin-scraper/index.ts` vs `CandidateProfile.tsx:638-674` | Work history and education appear empty even after sync because field names don't match |
| 3 | **CandidateProfile page** (the one the user is on) has its own `handleLinkedInImport` (line 129-174) that maps fields correctly BUT uses `||` fallback which means empty strings from the scraper are treated as truthy and override nothing | `CandidateProfile.tsx:150-157` | `avatar_url: ''` from URL-extraction prevents setting avatar even when scraper finds one |
| 4 | No enrichment/completeness recalculation is triggered after sync | Both locations | Score stays at 22% even if data is written |
| 5 | LinkedIn posts are never scraped -- Apify actor `apify~linkedin-profile-scraper` does not return posts | `linkedin-scraper/index.ts` | Missing feature entirely |

---

## Fix Plan (100/100)

### Fix 1: Normalize field names in `linkedin-scraper` edge function

**File:** `supabase/functions/linkedin-scraper/index.ts`

Change the `candidateData` construction (lines 241-263) to output field names that match what the DB and UI expect:

- `work_history` items: use `start_date`/`end_date` instead of `startDate`/`endDate`, add `position` alias for `title`
- `education` items: use `institution` instead of `school`, `start_year`/`end_year` instead of `startYear`/`endYear`, `field_of_study` instead of `field`
- `certifications`: map to `{name, issuer, issue_date}` format
- Filter out empty strings: return `null` instead of `''` for missing fields so `||` fallbacks work correctly in the UI

### Fix 2: Fix CandidateHeroSection sync handler

**File:** `src/components/candidate-profile/CandidateHeroSection.tsx`

Replace the blind `.update(data.data)` (line 64-67) with a proper field-by-field update that:
- Only updates fields that have actual values (not empty strings or null)
- Never overwrites manually edited data unless the new value is richer
- Sets `enrichment_last_run` and `last_profile_update` timestamps
- Merges skills arrays (union, no duplicates)

### Fix 3: Fix CandidateProfile sync handler

**File:** `src/pages/CandidateProfile.tsx`

Update `handleLinkedInImport` (lines 147-158) to:
- Use truthy checks that exclude empty strings: `data.data.avatar_url || null` patterns
- Merge skills instead of replacing
- Set `enrichment_last_run` timestamp
- Trigger completeness recalculation after update (call `enrich-candidate-profile` or rely on DB trigger)

### Fix 4: Add LinkedIn posts scraping via Apify

**File:** `supabase/functions/linkedin-scraper/index.ts`

The default `apify~linkedin-profile-scraper` actor does not return posts. Add a secondary Apify call to `apify~linkedin-posts-extractor` (or use `apify~linkedin-profile-scraper` with `fetchArticles: true` parameter if supported) to pull recent posts. Store them in `linkedin_profile_data.posts` and generate a posts summary in `ai_summary`.

If the posts actor is separate, make it optional (fire-and-forget, don't block the main profile response). Store posts as:

```text
candidate_profiles.linkedin_profile_data = {
  ...profile,
  posts: [
    { text, date, likes, comments, shares, url },
    ...
  ],
  posts_scraped_at: timestamp
}
```

### Fix 5: Trigger enrichment after sync

**Files:** `CandidateHeroSection.tsx` and `CandidateProfile.tsx`

After a successful LinkedIn sync + DB update:
1. Call `enrich-candidate-profile` edge function to regenerate AI summary, talent tier, and embedding based on the new data
2. This also recalculates `profile_completeness` via the existing DB trigger
3. Show a second toast: "Profile enriched with updated data"

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/linkedin-scraper/index.ts` | Normalize field names in `candidateData` output; add posts scraping; filter empty strings to null |
| `src/components/candidate-profile/CandidateHeroSection.tsx` | Replace blind `.update(data.data)` with field-mapped null-safe update + enrichment trigger |
| `src/pages/CandidateProfile.tsx` | Fix `handleLinkedInImport` with proper truthy checks, skill merging, and post-sync enrichment call |

No database migrations needed -- all data fits in existing JSONB columns (`work_history`, `education`, `linkedin_profile_data`, `skills`, `enrichment_data`).

---

## Technical Details

### Normalized Field Mapping (linkedin-scraper output)

```text
work_history: [
  {
    title: "Software Engineer",      // kept
    position: "Software Engineer",   // alias for UI compatibility
    company: "Acme Corp",           // kept
    location: "Amsterdam",          // kept
    start_date: "2020-01",          // was: startDate
    end_date: "2023-06",            // was: endDate
    description: "Led team..."      // kept
  }
]

education: [
  {
    institution: "University of X",  // was: school
    school: "University of X",       // kept for backward compat
    degree: "BSc",                   // kept
    field_of_study: "CS",            // was: field
    start_year: "2016",              // was: startYear
    end_year: "2020"                 // was: endYear
  }
]
```

### Null-Safe Update Pattern

```text
const updates: Record<string, any> = {};

// Only set if scraper returned a real value
if (data.data.current_title) updates.current_title = data.data.current_title;
if (data.data.current_company) updates.current_company = data.data.current_company;
if (data.data.avatar_url) updates.avatar_url = data.data.avatar_url;
if (data.data.skills?.length) updates.skills = mergeSkills(candidate.skills, data.data.skills);
if (data.data.work_history?.length) updates.work_history = data.data.work_history;
if (data.data.education?.length) updates.education = data.data.education;
// Always update these
updates.linkedin_profile_data = data.data.linkedin_profile_data;
updates.enrichment_last_run = new Date().toISOString();
updates.last_profile_update = new Date().toISOString();
```

### Posts Scraping (Apify)

The Apify `linkedin-profile-scraper` actor supports a `getArticles` parameter. We will enable this in the actor input to scrape recent posts/articles. The posts data will be:
- Stored in `linkedin_profile_data.posts` (JSONB)
- Summarized in `ai_summary` (e.g., "Active on LinkedIn: 12 posts in last 90 days. Topics: AI, recruitment, leadership.")
- Used to calculate engagement signals for the candidate assessment radar chart

