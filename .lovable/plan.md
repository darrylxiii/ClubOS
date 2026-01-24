
# Fix Booking Page Time Formatting + Add Time Format Toggle

## Problem Identified

The booking page at `/book/:slug` is displaying raw ISO timestamps (`2026-01-27T09:00:00.000Z`) instead of formatted times (`9:00 AM – 9:30 AM`). Analysis reveals:

1. **Root Cause**: The `formatInTimeZone` function from `date-fns-tz` is throwing an error, and both the primary catch block fallback AND the nested fallback are failing, causing the raw ISO string to be returned
2. **Likely Trigger**: The `date-fns-tz` library has module loading issues in certain preview environments, or the function signature has compatibility issues with the installed versions

## Solution Strategy

Replace the fragile `date-fns-tz` formatting with a more robust approach that uses native browser APIs (`Intl.DateTimeFormat`) as the primary formatter, with `date-fns-tz` as an optional enhancement for complex timezone conversions.

---

## Phase 1: Fix Time Slot Formatting (Critical)

### Changes to `src/components/booking/UnifiedDateTimeSelector.tsx`

Replace the current `formatSlotDisplay` function with a more robust implementation:

```text
Strategy:
1. Use native Intl.DateTimeFormat as primary formatter (always available, never fails)
2. Wrap date parsing in additional safety checks
3. Format time ranges with proper locale detection
4. Add the time format toggle component
```

Key changes:
- Create a `safeFormatTime` helper that uses `Intl.DateTimeFormat` with the guest's timezone
- Accept a format parameter (`'12h'` or `'24h'`) for the time format toggle
- Display start-end ranges as requested: `9:00 AM – 9:30 AM`
- Add secondary line for host timezone when different

### New Formatting Logic

```typescript
const safeFormatTime = (isoString: string, timezone: string, use24h: boolean = false): string => {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    // Use native Intl.DateTimeFormat - always available, always works
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: !use24h,
      timeZone: timezone,
    }).format(date);
  } catch {
    // Ultimate fallback - just show local time
    try {
      return new Date(isoString).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: !use24h,
      });
    } catch {
      return isoString;
    }
  }
};
```

---

## Phase 2: Add Time Format Toggle

### New File: `src/hooks/useTimeFormatPreference.ts`

Implements the detection chain:
1. **Logged-in user**: Check `user_preferences` table for saved preference
2. **System detection**: Use `Intl.DateTimeFormat().resolvedOptions().hourCycle`
3. **Country fallback**: Use existing `useCountryDetection` hook
4. **Default**: 12-hour for US/UK/etc, 24-hour for Europe

### New File: `src/components/booking/TimeFormatToggle.tsx`

A compact toggle switch displayed near the timezone selector:
- Shows preview of both formats
- Persists choice to `localStorage` for anonymous users
- Persists to database for authenticated users
- Subtle design matching TQC aesthetic

### Country Mapping Constants

```typescript
const TWELVE_HOUR_COUNTRIES = [
  'US', 'CA', 'AU', 'NZ', 'PH', 'MY', 'IN', 'PK', 'BD', 'EG', 'SA', 'AE', 'KR', 'CO', 'MX'
];
// All other countries default to 24-hour
```

---

## Phase 3: Integration

### Update `UnifiedDateTimeSelector.tsx`
- Import and use `useTimeFormatPreference` hook
- Pass format to the new `safeFormatTime` helper
- Add `TimeFormatToggle` component in the header area

### Update `BookingPage.tsx`
- Wrap with time format context if needed
- Ensure toggle persists across page refreshes

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useTimeFormatPreference.ts` | Time format detection and persistence hook |
| `src/components/booking/TimeFormatToggle.tsx` | Compact 12h/24h toggle switch |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/booking/UnifiedDateTimeSelector.tsx` | Replace `formatSlotDisplay` with robust native formatting, add toggle |
| `src/pages/BookingPage.tsx` | Minor layout adjustments for toggle placement |

---

## Technical Implementation Details

### Robust Time Formatting (No External Dependencies)

The new approach uses `Intl.DateTimeFormat` which:
- Is built into all modern browsers
- Handles timezone conversion natively via the `timeZone` option
- Supports both 12-hour and 24-hour formats via `hour12`
- Never throws on valid Date objects

### Time Format Detection Priority

```text
1. Authenticated user preference (from database)
     ↓ if not set
2. Local storage preference (for returning guests)
     ↓ if not set
3. System locale detection (Intl.DateTimeFormat().resolvedOptions().hourCycle)
     ↓ if not available
4. Country-based default (IP geolocation already available)
     ↓ if unknown
5. Default to 12-hour format
```

### UI Display Format

Time slots will display as:
```text
┌─────────────────────────────────────┐
│ ⏰  9:00 AM – 9:30 AM               │
│     15:00 – 15:30 (host timezone)   │
└─────────────────────────────────────┘
```

Toggle component:
```text
┌──────────────────────────────────────────────┐
│  Clock format:  [ 9:00 AM ] | [ 09:00 ]      │
└──────────────────────────────────────────────┘
```

---

## Expected Outcome

After implementation:
1. Time slots always display correctly formatted (no more raw ISO strings)
2. Format shown as start-end range: `9:00 AM – 9:30 AM` or `09:00 – 09:30`
3. Automatic detection of preferred format based on user's system/locale
4. Toggle switch for manual override
5. Preference persists across sessions
6. Dual timezone display when guest and host are in different timezones
