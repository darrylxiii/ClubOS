

# Fix: All Dates Showing "Jan 2000" and "26 yrs 6 mos"

## Root Cause

Two bugs on lines 108-110 and 121 in `UnifiedCandidateProfile.tsx`:

1. **`normalizeDate(job.start_date) || '2000-01-01'`** — The `normalizeDate` function correctly rejects `"[object Object]"` and returns `undefined`. But the `|| '2000-01-01'` fallback then forces every entry with bad data to show January 1, 2000.

2. **`current: !job.end_date`** — The raw `end_date` from the database is `"[object Object]"` (a truthy string), so `!job.end_date` is always `false`. Every role shows as non-current, displaying "Jan 2000 -" as the end date.

3. **Duration "26 yrs 6 mos"** — Follows directly from start=Jan 2000 to today (Feb 2026) = exactly 26 years and ~6 months. Correct math, wrong input.

## Fix

### File: `src/pages/UnifiedCandidateProfile.tsx`

**Line 108** — Remove the `'2000-01-01'` fallback. If the date is invalid, pass empty string so the UI hides the date entirely:
```
start_date: normalizeDate(job.start_date) || '',
```

**Line 109** — End date same treatment (already no fallback, just confirm):
```
end_date: normalizeDate(job.end_date) || undefined,
```

**Line 110** — Use `normalizeDate` to check if end_date is actually valid before deciding "current":
```
current: !normalizeDate(job.end_date),
```
This means: if end_date is `null`, `undefined`, `""`, or `"[object Object]"`, normalizeDate returns `undefined` which is falsy, so `!undefined = true` = current role. Correct behavior.

**Line 121** — Same for education start_date:
```
start_date: normalizeDate(edu.start_date || edu.start_year) || '',
```

**Line 122** — Education end_date already has `|| undefined`, no change needed.

### File: `src/components/candidate-profile/ExperienceTimeline.tsx`

**Lines 72-86 (calculateDuration)** — Already has the `isNaN` guard and returns `''`. No change needed since the inputs will now be empty strings instead of `'2000-01-01'`.

**Lines 88-93 (formatDate)** — Already guards with `isNaN`. No change needed.

**Line 65 (buildGroup totalDuration)** — The group-level duration calculation uses `earliest.start_date` which will now be `''` for bad data. `calculateDuration('')` returns `''` since `new Date('')` is invalid. This is correct — no duration shown.

**Line 188** — The group header shows `group.totalDuration`. When empty, it will render as blank text. Add a guard:
```
{group.totalDuration && (
  <p className="text-sm text-muted-foreground">{group.totalDuration}</p>
)}
```

## Summary of Changes

| File | Line | Change |
|------|------|--------|
| `UnifiedCandidateProfile.tsx` | 108 | Remove `'2000-01-01'` fallback, use `''` |
| `UnifiedCandidateProfile.tsx` | 110 | Use `!normalizeDate(job.end_date)` for `current` |
| `UnifiedCandidateProfile.tsx` | 121 | Remove `'2000-01-01'` fallback, use `''` |
| `ExperienceTimeline.tsx` | 187-189 | Conditional render for `group.totalDuration` |

No database changes. No edge function changes. The existing bad data (`[object Object]`) will simply not show any dates — entries will display title, company, and location only. Once candidates are re-synced via LinkedIn, the scraper (already fixed) will write proper date strings.
