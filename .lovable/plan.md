

# Fix "formatInTimeZone is not defined" Error - Comprehensive Audit

## Problem Identified

The booking page crashes with `ReferenceError: formatInTimeZone is not defined` when clicking a time slot. Root cause analysis reveals:

1. **Module Loading Failure**: The `date-fns-tz` library fails to load properly in the preview environment due to OpenTelemetry instrumentation conflicts
2. **Incomplete Migration**: While `UnifiedDateTimeSelector.tsx` was migrated to use `safeFormatTime`, several other files still depend on the fragile `date-fns-tz` imports
3. **Cascading Failure**: When any component imports from `timezoneUtils.ts`, it triggers the broken `date-fns-tz` import

---

## Files Still Using date-fns-tz (Must Fix)

| File | Usage | Impact |
|------|-------|--------|
| `src/lib/timezoneUtils.ts` | `formatInTimeZone`, `toZonedTime` | Core utility used by many components |
| `src/components/settings/WorkAvailabilitySettings.tsx` | `formatInTimeZone`, `toZonedTime` | Settings page (lower priority) |
| `src/pages/GuestBookingPage.tsx` | `formatInTimeZone` | Guest view after booking |
| `src/components/booking/BookingWeekView.tsx` | Uses `format` from date-fns (no TZ) | Week view selector |

---

## Solution: Complete Migration to Native APIs

### Phase 1: Update timezoneUtils.ts (Critical)

Replace all `date-fns-tz` functions with native `Intl` alternatives:

```text
Current (Broken):
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
export function formatDateForTimezone(date, tz) {
  return formatInTimeZone(date, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

New (Robust):
// Use native Intl.DateTimeFormat instead
export function formatDateForTimezone(date: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);
    
    // Construct ISO-like string from parts
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
  } catch {
    return date.toISOString();
  }
}
```

### Phase 2: Update formatTimeSlot in timezoneUtils.ts

Replace:
```typescript
export function formatTimeSlot(isoStart, isoEnd, timezone) {
  const start = formatInTimeZone(isoStart, timezone, 'h:mm a'); // BROKEN
  const end = formatInTimeZone(isoEnd, timezone, 'h:mm a');
  return `${start} - ${end}`;
}
```

With import from safeTimeFormat:
```typescript
import { formatTimeRange } from '@/lib/safeTimeFormat';

export function formatTimeSlot(isoStart: string, isoEnd: string, timezone: string): string {
  return formatTimeRange(isoStart, isoEnd, timezone, '12h');
}
```

### Phase 3: Update GuestBookingPage.tsx

Replace direct `formatInTimeZone` usage:
```typescript
// Before (broken)
import { formatInTimeZone } from 'date-fns-tz';
const displayTime = formatInTimeZone(booking.scheduled_start, timezone, 'h:mm a');

// After (robust)
import { safeFormatTime } from '@/lib/safeTimeFormat';
const displayTime = safeFormatTime(booking.scheduled_start, timezone, '12h');
```

### Phase 4: Update WorkAvailabilitySettings.tsx

Replace timezone formatting:
```typescript
// Before
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

// After
import { safeFormatTime } from '@/lib/safeTimeFormat';
// Use native Date + Intl for timezone conversions
```

### Phase 5: Add Fallback for toZonedTime

Create a native replacement for `toZonedTime`:
```typescript
/**
 * Convert a date to a specific timezone using native APIs
 * Returns a Date object representing the time in that timezone
 */
export function toTimezone(date: Date, timezone: string): Date {
  try {
    // Get the time string in the target timezone
    const tzString = date.toLocaleString('en-US', { timeZone: timezone });
    return new Date(tzString);
  } catch {
    return date;
  }
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/timezoneUtils.ts` | Remove all `date-fns-tz` imports, use native APIs + safeTimeFormat |
| `src/lib/safeTimeFormat.ts` | Add `formatDateForTimezone` helper with native implementation |
| `src/pages/GuestBookingPage.tsx` | Switch to `safeFormatTime` import |
| `src/components/settings/WorkAvailabilitySettings.tsx` | Switch to native formatting |
| `src/components/booking/BookingWeekView.tsx` | Switch to `safeFormatTime` for time display |

---

## Technical Implementation

### New safeTimeFormat.ts additions

```typescript
/**
 * Format a date to ISO-like string in a specific timezone
 */
export function formatDateForTimezone(date: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
  } catch {
    return date.toISOString();
  }
}

/**
 * Get start and end of day boundaries for a date in a timezone
 */
export function getDateRangeForTimezone(date: Date, timezone: string) {
  try {
    // Format date as YYYY-MM-DD in target timezone
    const dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
    
    return {
      start: dateStr,
      end: dateStr,
    };
  } catch {
    const fallback = date.toISOString().split('T')[0];
    return { start: fallback, end: fallback };
  }
}
```

### Updated timezoneUtils.ts

```typescript
// Remove this:
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

// Add this:
import { safeFormatTime, formatTimeRange, formatDateForTimezone as safeDateFormat } from '@/lib/safeTimeFormat';
```

---

## Expected Outcome

After implementation:
1. No more "formatInTimeZone is not defined" errors
2. Time slots display correctly in all environments (preview, production)
3. All timezone-related formatting uses robust native browser APIs
4. Zero dependency on potentially broken `date-fns-tz` imports
5. Time format toggle works seamlessly
6. Booking flow completes without runtime errors

---

## Verification Checklist

- [ ] `/book/:slug` loads without errors
- [ ] Clicking time slots works correctly
- [ ] Times display as ranges: "9:00 AM - 9:30 AM"
- [ ] 12h/24h toggle switches format correctly
- [ ] Dual timezone display shows when applicable
- [ ] Guest booking page shows correct times
- [ ] Settings page availability preview works

