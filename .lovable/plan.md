

# Fix LinkedIn Sync End-to-End: Scraper + Candidate Profile Display

## Root Cause (confirmed from logs and DB)

The scraper is completely broken. Here is the evidence:

| Evidence | Detail |
|----------|--------|
| Edge function logs | `crawlkit~best-linkedin-profile-scraper` times out after 30s, every time |
| Previous actor | `apify~linkedin-profile-scraper` returns 404 (actor not found) |
| Database state | `work_history: []`, `education: []`, `skills: []` for the synced candidate |
| Result | Falls back to URL extraction (name only), score stays at 22% |

The UI side is fine structurally -- it renders `work_history` and `education` correctly. But since the data is always empty arrays, nothing shows up. There are also no empty states telling the user what happened.

---

## Fix 1: Switch to a Reliable Apify Actor

**File:** `supabase/functions/linkedin-scraper/index.ts`

Switch from `crawlkit~best-linkedin-profile-scraper` (2 total users, 0 rating, times out) to **`apimaestro/linkedin-profile-detail`** (8,600 users, 3.6 rating, $5/1,000 profiles, no cookies needed).

Key differences in the new actor:
- Input takes `username` (extracted from URL), not a full URL
- Faster response (no headless browser -- public API scraping)
- Returns structured `experience`, `education`, `certifications`, `languages` fields

Changes:
- Extract username from LinkedIn URL (e.g., `daan-van-lieshout-0ab013256` from `linkedin.com/in/daan-van-lieshout-0ab013256`)
- Call `apimaestro~linkedin-profile-detail` with `{ username }` input
- Map response fields to our normalized schema (same `start_date`/`end_date` normalization)
- Keep the existing Proxycurl and URL-extraction fallbacks
- Increase timeout to 45s (this actor is typically faster but allow headroom)

## Fix 2: Add LinkedIn Posts Scraping (Separate Actor Call)

**File:** `supabase/functions/linkedin-scraper/index.ts`

The profile detail actor does not return posts. Add an optional second call to `apimaestro/linkedin-posts-scraper` (or similar) to fetch recent activity. This call is fire-and-forget -- if it fails or times out, we still return the profile data. Posts get stored in `linkedin_profile_data.posts`.

## Fix 3: Experience Tab Empty States + LinkedIn Activity Section

**File:** `src/pages/CandidateProfile.tsx`

Currently, when `work_history` or `education` are empty arrays, nothing renders and the tab looks broken. Fix:

- Add empty state cards when work_history/education are empty: "No work experience on record. Sync LinkedIn to import."
- Add a "LinkedIn Activity" section inside the Experience tab that renders posts from `linkedin_profile_data.posts` (showing post text preview, date, engagement counts)
- Add a "Sync LinkedIn" button directly in the empty state so users can trigger a sync from the Experience tab itself

## Fix 4: Improve the Experience Tab Layout

**File:** `src/pages/CandidateProfile.tsx`

Professional improvements to the Experience tab rendering:
- Add company logos placeholder (first letter badge)
- Show duration for each role (e.g., "2 years 3 months")
- Better timeline layout with a vertical connector line
- Education: show degree + field on one line, institution below
- Certifications: show issue date if available

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/linkedin-scraper/index.ts` | Modify | Switch to `apimaestro/linkedin-profile-detail` actor, fix input schema, add posts scraping |
| `src/pages/CandidateProfile.tsx` | Modify | Add empty states for Experience tab, add LinkedIn Activity section, improve layout |

No database migrations needed.

---

## Technical Details

### New Apify Actor Input/Output

```text
Input: { "username": "daan-van-lieshout-0ab013256" }

Expected output fields:
- fullName / firstName + lastName
- headline / title
- location / geo
- profilePicture / profilePictureUrl  
- experience[] -- each has: title, company, location, startDate, endDate, description
- education[] -- each has: school/institution, degree, field, startYear, endYear
- skills[] 
- certifications[]
- languages[]
```

The existing resilient field mapping (checking multiple possible field names) stays in place -- we just change which actor we call and how we format the input.

### Username Extraction

```text
Input:  "https://linkedin.com/in/daan-van-lieshout-0ab013256"
Output: "daan-van-lieshout-0ab013256"

Regex: /linkedin\.com\/in\/([^\/\?#]+)/
```

### Empty State UX

When work_history is empty, the Experience tab will show:
- A card with a briefcase icon, "No work experience on record" message
- A "Sync LinkedIn" button that triggers the same handleLinkedInImport function
- Similar pattern for education (graduation cap icon)

### LinkedIn Activity Section

When `linkedin_profile_data?.posts` has data, show:
- Section header: "LinkedIn Activity (X posts)"
- Each post as a card with: text preview (first 200 chars), date, engagement (likes/comments)
- Collapsible for posts longer than 200 characters

