

# Fix: Restore Correct Dates from LinkedIn Data

## Root Cause (Full Audit)

The dates are missing because of a chain of three bugs:

### Bug 1: apimaestro returns month as a NAME, not a number
The API returns `startDate: {month: "Feb", year: 2026}` where `month` is a string like "Feb", "Mar", "Jan" -- not a number.

### Bug 2: Scraper mapper passes the raw object through
Line 212 in `linkedin-scraper/index.ts` does:
```
startDate: exp.startDate || exp.start_date || ...
```
Since `exp.startDate` is the object `{month: "Feb", year: 2026}`, it's truthy and gets used directly. The later fallbacks that would properly format it (like `starts_at`, `start`) never run.

### Bug 3: `normalizeDateField` assumes month is a number
Line 119: `String(obj.month || 1).padStart(2, '0')` -- when `obj.month` is `"Feb"`, this produces `"2026-Feb-01"` which is not a valid date.

### The result
In older scrapes (before `normalizeDateField` existed), the object was stored as `"[object Object]"` in the DB. The UI correctly rejects this and shows nothing. In newer scrapes, `normalizeDateField` would produce `"2026-Feb-01"` which is also invalid.

### Existing good data
The raw `linkedin_profile_data` column still has the original objects with correct `{month: "Feb", year: 2026}` values. We can use this to repair the 3 affected candidate records.

---

## Fix 1: Scraper -- Parse date objects in the mapper (line 212)

**File:** `supabase/functions/linkedin-scraper/index.ts`

The apimaestro mapper (line 207-221) must convert date objects to strings immediately, not pass them through raw.

Add a helper function `parseDateValue` that handles all formats:

```
function parseDateValue(val: any): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    const year = val.year;
    if (!year) return undefined;
    const month = val.month;
    if (typeof month === 'number') {
      return `${year}-${String(month).padStart(2, '0')}`;
    }
    if (typeof month === 'string') {
      // Convert month name to number: "Jan"->01, "Feb"->02, etc.
      const monthMap: Record<string, string> = {
        jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06',
        jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12'
      };
      const num = monthMap[month.toLowerCase().substring(0, 3)];
      return num ? `${year}-${num}` : `${year}-01`;
    }
    return `${year}-01`;
  }
  return undefined;
}
```

Then update lines 212-219:
```
startDate: parseDateValue(exp.startDate) || parseDateValue(exp.start_date) || ...
endDate: parseDateValue(exp.endDate) || parseDateValue(exp.end_date) || ...
```

And lines 227-228 for education:
```
startYear: parseDateValue(exp.startYear) || ...
endYear: parseDateValue(exp.endYear) || ...
```

## Fix 2: `normalizeDateField` -- Handle month name strings

**File:** `supabase/functions/linkedin-scraper/index.ts`

Update `normalizeDateField` (line 107-123) to also parse month name strings in date objects, as a safety net:

```
if (typeof val === 'object' && val !== null) {
  const obj = val as Record<string, any>;
  if (obj.year) {
    let monthNum = '01';
    if (typeof obj.month === 'number') {
      monthNum = String(obj.month).padStart(2, '0');
    } else if (typeof obj.month === 'string') {
      const monthMap: Record<string, string> = {
        jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06',
        jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12'
      };
      monthNum = monthMap[obj.month.toLowerCase().substring(0, 3)] || '01';
    }
    return `${obj.year}-${monthNum}-01`;
  }
}
```

## Fix 3: UI `normalizeDate` -- Same month-name handling

**File:** `src/pages/UnifiedCandidateProfile.tsx`

Update the `normalizeDate` helper (line 86-100) to also handle the case where the data still has a date object with month names (belt-and-suspenders):

```
if (typeof d === 'object' && d !== null && !(d instanceof String)) {
  if (d.year) {
    let monthNum = 1;
    if (typeof d.month === 'number') monthNum = d.month;
    else if (typeof d.month === 'string') {
      const map: Record<string, number> = {
        jan:1, feb:2, mar:3, apr:4, may:5, jun:6,
        jul:7, aug:8, sep:9, oct:10, nov:11, dec:12
      };
      monthNum = map[d.month.toLowerCase().substring(0, 3)] || 1;
    }
    return `${d.year}-${String(monthNum).padStart(2, '0')}-01`;
  }
  return undefined;
}
```

## Fix 4: One-time data repair migration

Run a database function to rebuild `work_history` and `education` dates from the raw `linkedin_profile_data` for the 3 affected candidates. This SQL function will:

1. Read each element from `linkedin_profile_data->'experience'`
2. Extract `startDate.year` and `startDate.month` (month name to number)
3. Update the corresponding `work_history` array element's `start_date` and `end_date`
4. Same for education `start_year` / `end_year`

```sql
-- Repair work_history dates from linkedin_profile_data
UPDATE candidate_profiles
SET work_history = (
  SELECT jsonb_agg(
    jsonb_set(
      jsonb_set(
        wh.elem,
        '{start_date}',
        COALESCE(
          to_jsonb(
            (raw.elem->>'year') || '-' ||
            LPAD(
              CASE lower(left(raw.elem->'startDate'->>'month', 3))
                WHEN 'jan' THEN '01' WHEN 'feb' THEN '02' ...
              END, 2, '0') || '-01'
          ),
          '"null"'::jsonb
        )
      ),
      '{end_date}',
      -- same for endDate
    )
  )
  FROM ...
)
WHERE work_history::text LIKE '%[object Object]%';
```

The exact SQL will be written as a proper migration using `jsonb_array_elements` with index tracking.

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/linkedin-scraper/index.ts` | Add `parseDateValue()` helper; use it in apimaestro mapper for experience and education dates; update `normalizeDateField` to handle month name strings |
| `src/pages/UnifiedCandidateProfile.tsx` | Update `normalizeDate` to handle month name strings in date objects |
| Database migration | One-time repair of 3 candidates' `work_history` and `education` dates using data from `linkedin_profile_data` |

## What This Fixes

1. Existing 3 candidates with `[object Object]` dates get repaired to proper date strings
2. Future scrapes correctly parse `{month: "Feb", year: 2026}` into `"2026-02"` 
3. UI correctly displays "Feb 2026" instead of blank or "Invalid Date"
4. Duration calculations ("2 yrs 3 mos") work correctly again

