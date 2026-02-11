

# Fix: Invalid Dates and Missing Profile Pictures

## Root Cause Analysis

### Issue 1: "Invalid Date" and "NaN yrs NaN mos" everywhere

The database contains `start_date: [object Object]` for work history entries. This happens because:

1. The LinkedIn API sometimes returns dates as objects (e.g., `{year: 2020, month: 3}`) rather than strings
2. The scraper's `emptyToNull()` helper only handles strings and null -- when it receives a date object, it passes it through unchanged
3. This object gets serialized to `"[object Object]"` when stored as JSONB text
4. The UI's `normalizeDate()` receives `"[object Object]"` which produces `Invalid Date` from `new Date()`
5. `calculateDuration()` then produces `NaN yrs NaN mos`

The same issue affects education dates (`start_year`, `end_year` stored as objects).

### Issue 2: Profile pictures not showing

All checked candidates have `avatar_url = NULL`. The `downloadAndStoreAvatar` function in the scraper creates a Supabase client to upload, but the LinkedIn CDN likely rejects the server-side fetch (403/expired URLs). Additionally, apimaestro may not return a `profilePicture` field at all for some profiles.

---

## Fix 1: Scraper Date Normalization (prevents future bad data)

**File:** `supabase/functions/linkedin-scraper/index.ts`

Replace `emptyToNull()` calls for date fields in the normalizer (lines 339-358) with a proper `normalizeDateField()` helper that handles all formats:

```text
function normalizeDateField(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'string') {
    if (val.trim() === '' || val === '[object Object]') return null;
    return val;
  }
  if (typeof val === 'number') return `${val}-01-01`;
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, any>;
    if (obj.year) {
      return `${obj.year}-${String(obj.month || 1).padStart(2, '0')}-01`;
    }
  }
  return null;
}
```

Then update the normalizer to use it:

```text
const normalizedWorkHistory = (profile.experience || []).map(exp => ({
  title: emptyToNull(exp.title),
  position: emptyToNull(exp.title),
  company: emptyToNull(exp.company),
  company_logo: emptyToNull(exp.companyLogo),
  location: emptyToNull(exp.location),
  start_date: normalizeDateField(exp.startDate),  // was emptyToNull
  end_date: normalizeDateField(exp.endDate),       // was emptyToNull
  description: emptyToNull(exp.description),
})).filter(e => e.title || e.company);

const normalizedEducation = (profile.education || []).map(edu => ({
  institution: emptyToNull(edu.school),
  school: emptyToNull(edu.school),
  school_logo: emptyToNull(edu.schoolLogo),
  degree: emptyToNull(edu.degree),
  field_of_study: emptyToNull(edu.field),
  start_year: normalizeDateField(edu.startYear),   // was emptyToNull
  end_year: normalizeDateField(edu.endYear),        // was emptyToNull
})).filter(e => e.institution || e.degree);
```

## Fix 2: UI Date Normalization (handles existing bad data)

**File:** `src/pages/UnifiedCandidateProfile.tsx`

Harden the `normalizeDate` helper (line 86-92) to handle `"[object Object]"` strings and other edge cases:

```text
const normalizeDate = (d: any): string | undefined => {
  if (!d) return undefined;
  if (typeof d === 'number') return `${d}-01-01`;
  if (typeof d === 'object' && d !== null && !(d instanceof String)) {
    if (d.year) return `${d.year}-${String(d.month || 1).padStart(2, '0')}-01`;
    return undefined;
  }
  if (typeof d === 'string') {
    if (d.trim() === '' || d.includes('[object') || d === 'undefined' || d === 'null') return undefined;
    // If it's just a year like "2020"
    if (/^\d{4}$/.test(d)) return `${d}-01-01`;
    // If it's year-month like "2020-03"
    if (/^\d{4}-\d{1,2}$/.test(d)) return `${d}-01`;
    return d;
  }
  return undefined;
};
```

**File:** `src/components/candidate-profile/ExperienceTimeline.tsx`

Harden `formatDate` (line 84-86) and `calculateDuration` (line 72-82) to guard against invalid dates:

```text
function formatDate(date: string): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function calculateDuration(start: string, end?: string): string {
  if (!start) return '';
  const startDate = new Date(start);
  if (isNaN(startDate.getTime())) return '';
  const endDate = end ? new Date(end) : new Date();
  if (isNaN(endDate.getTime())) return '';
  const months = Math.max(0, Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  ));
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0 && remainingMonths === 0) return 'Less than a month';
  if (years === 0) return `${remainingMonths} mos`;
  if (remainingMonths === 0) return `${years} yrs`;
  return `${years} yrs ${remainingMonths} mos`;
}
```

Also guard the render calls to skip showing date/duration when empty:

```text
// In SingleRoleCard and grouped role rendering:
{formatDate(exp.start_date) && (
  <span>{formatDate(exp.start_date)} – {exp.current ? 'Present' : formatDate(exp.end_date!)}</span>
)}
{calculateDuration(exp.start_date, exp.end_date) && (
  <>
    <span>·</span>
    <span>{calculateDuration(exp.start_date, exp.end_date)}</span>
  </>
)}
```

Same guards for education date display (line 279-281).

## Fix 3: Avatar Display -- Re-sync and Fallback

**File:** `supabase/functions/linkedin-scraper/index.ts`

The `downloadAndStoreAvatar` function silently fails when LinkedIn CDN blocks the fetch. Two improvements:

1. If download fails, keep the raw LinkedIn URL as `avatar_url` anyway (it may work temporarily and is better than nothing)
2. Log more detail about why it failed

This is already the current behavior (the scraper keeps the URL on failure), but the issue is apimaestro may not return any image URL at all. Add broader field mapping:

```text
imageUrl: data.profilePicture || data.profilePictureUrl || data.image 
  || data.avatar || data.profile_pic_url || data.profileImage 
  || data.profilePictureOriginal || data.profilePictures?.[0] || '',
```

**File:** `src/components/candidate-profile/CandidateHeroSection.tsx`

The hero section already renders `candidate.avatar_url` in an Avatar with a fallback to initials (line 148-153). This works correctly -- the issue is simply that `avatar_url` is NULL in the database. The sync button (line 70) correctly saves `avatar_url` from the scraper response.

No changes needed to the hero section display logic.

**File:** `supabase/functions/batch-linkedin-enrich/index.ts`

Ensure the batch enrichment also re-downloads avatars for candidates with NULL `avatar_url` (already implemented per the earlier plan). Verify the avatar update condition catches all cases.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/linkedin-scraper/index.ts` | Add `normalizeDateField()` helper; use it for all date fields in the normalizer; broaden image URL field mapping |
| `src/pages/UnifiedCandidateProfile.tsx` | Harden `normalizeDate` to handle `"[object Object]"`, year-only strings, year-month strings |
| `src/components/candidate-profile/ExperienceTimeline.tsx` | Guard `formatDate` and `calculateDuration` against invalid dates; conditional rendering to hide "Invalid Date" and "NaN" |

No database migrations needed. Existing bad data (`[object Object]`) will be handled gracefully by the UI fixes. Future scrapes will produce clean date strings.

---

## What This Fixes

1. All "Invalid Date" labels will disappear -- entries with bad dates show no date instead
2. All "NaN yrs NaN mos" labels will disappear -- entries with bad dates show no duration
3. Future LinkedIn scrapes will produce proper date strings (e.g., `"2020-03-01"`) instead of `[object Object]`
4. Re-syncing a candidate via "Sync LinkedIn" will overwrite the bad dates with clean ones
5. Avatar URLs will be captured more broadly from API responses
6. Education dates (`start_year`, `end_year`) are also fixed at both scraper and UI level
