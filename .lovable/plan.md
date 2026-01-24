
# Automatic Time Format Detection with Toggle Switch

## Overview

Implement an intelligent time format system that automatically detects whether to display times in 12-hour (AM/PM) or 24-hour format, with a manual toggle so users can override the auto-detected preference.

---

## Detection Priority Chain

```text
1. Logged-in user        -> Use saved preference from user_preferences table
2. System/Browser locale -> Use Intl API to detect system format
3. Country detection     -> Use IP geolocation (already have useCountryDetection hook)
4. Default fallback      -> 12-hour for US/UK/etc, 24-hour for Europe
```

---

## Implementation Phases

### Phase 1: Core Time Format Detection Hook

Create a new hook `useTimeFormatPreference` that implements the full detection chain:

**File**: `src/hooks/useTimeFormatPreference.ts`

Features:
- Check if user is authenticated and has a saved preference
- Detect system preference using `Intl.DateTimeFormat().resolvedOptions().hourCycle`
- Fall back to country-based defaults using existing `useCountryDetection`
- Provide a toggle function that persists the choice

**Country-to-Format Mapping**:
| Region | Countries | Default Format |
|--------|-----------|----------------|
| 12-hour | US, CA, AU, PH, MY, IN, PK, EG, SA, KR | AM/PM |
| 24-hour | NL, DE, FR, ES, IT, BE, AT, CH, PL, CZ, RU, JP, CN, BR | HH:MM |

### Phase 2: Database Schema Update

Add `time_format` column to `user_preferences` table:

```sql
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS time_format TEXT DEFAULT NULL
  CHECK (time_format IN ('12h', '24h', NULL));
```

- `NULL` means "auto-detect" (respect system/country)
- `'12h'` means always use AM/PM
- `'24h'` means always use 24-hour format

### Phase 3: Time Format Context Provider

Create a context provider that makes the time format preference available app-wide:

**File**: `src/contexts/TimeFormatContext.tsx`

```typescript
interface TimeFormatContextValue {
  format: '12h' | '24h';
  isAuto: boolean;
  source: 'user' | 'system' | 'country' | 'default';
  setFormat: (format: '12h' | '24h' | 'auto') => void;
}
```

This context will:
- Load user preference if logged in
- Detect system preference for anonymous users
- Fall back to country-based detection
- Persist changes to localStorage (anonymous) or database (authenticated)

### Phase 4: Update Time Formatting Utilities

Modify `src/lib/timezoneUtils.ts` to accept format parameter:

```typescript
export function formatTimeSlot(
  isoStart: string,
  isoEnd: string,
  timezone: string,
  format: '12h' | '24h' = '12h'
): string {
  const pattern = format === '24h' ? 'HH:mm' : 'h:mm a';
  const start = formatInTimeZone(isoStart, timezone, pattern);
  const end = formatInTimeZone(isoEnd, timezone, pattern);
  return `${start} - ${end}`;
}
```

### Phase 5: Toggle Component for Booking Pages

Create a compact toggle switch component:

**File**: `src/components/booking/TimeFormatToggle.tsx`

Design:
```text
┌─────────────────────────────────────┐
│  🕐  9:00 AM  |  09:00              │
│      ○────●   (toggle switch)       │
└─────────────────────────────────────┘
```

Features:
- Shows current format with visual preview
- Toggle between 12h and 24h
- Saves to localStorage for anonymous users
- Saves to database for authenticated users
- Subtle, non-intrusive design matching TQC aesthetic

### Phase 6: Update Booking Components

**UnifiedDateTimeSelector.tsx**:
- Import and use `useTimeFormatPreference`
- Pass format to `formatSlotDisplay`
- Update both guest and host timezone displays

**BookingPage.tsx**:
- Add `TimeFormatToggle` component near timezone selector
- Pass format to all time display functions

### Phase 7: Settings Page Integration

Update `PreferencesSettings.tsx` to include time format toggle:

```text
┌─────────────────────────────────────┐
│ Time Format                         │
│                                     │
│ ○ Auto-detect (based on location)   │
│ ○ 12-hour (9:00 AM)                │
│ ○ 24-hour (09:00)                  │
│                                     │
│ Current: Using system preference    │
└─────────────────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useTimeFormatPreference.ts` | Main detection hook with priority chain |
| `src/contexts/TimeFormatContext.tsx` | App-wide context provider |
| `src/components/booking/TimeFormatToggle.tsx` | Compact toggle for booking pages |
| `src/lib/timeFormatConstants.ts` | Country-to-format mapping constants |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/timezoneUtils.ts` | Add format parameter to formatting functions |
| `src/components/booking/UnifiedDateTimeSelector.tsx` | Use time format preference |
| `src/pages/BookingPage.tsx` | Add toggle component |
| `src/components/settings/PreferencesSettings.tsx` | Add time format setting |
| `src/App.tsx` | Wrap with TimeFormatProvider |

---

## Technical Details

### System Detection Logic

```typescript
function detectSystemTimeFormat(): '12h' | '24h' | null {
  try {
    const locale = navigator.language || 'en-US';
    const options = Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions();
    
    // hourCycle: 'h11', 'h12' = 12-hour; 'h23', 'h24' = 24-hour
    if (options.hourCycle === 'h11' || options.hourCycle === 'h12') {
      return '12h';
    }
    if (options.hourCycle === 'h23' || options.hourCycle === 'h24') {
      return '24h';
    }
    return null; // Couldn't determine
  } catch {
    return null;
  }
}
```

### Country-Based Fallback

```typescript
const TWELVE_HOUR_COUNTRIES = [
  'US', 'CA', 'AU', 'NZ', 'PH', 'MY', 'IN', 'PK', 'BD', 'EG', 'SA', 'AE', 'KR', 'CO', 'MX'
];

function getCountryDefaultFormat(countryCode: string): '12h' | '24h' {
  return TWELVE_HOUR_COUNTRIES.includes(countryCode) ? '12h' : '24h';
}
```

### LocalStorage Keys for Anonymous Users

```typescript
const STORAGE_KEYS = {
  TIME_FORMAT: 'tqc_time_format_preference',
  TIME_FORMAT_SOURCE: 'tqc_time_format_source',
};
```

---

## UI/UX Considerations

1. **Non-intrusive toggle**: Small icon-based toggle near timezone selector
2. **Instant feedback**: Time slots update immediately on toggle
3. **Persistence**: Choice remembered across sessions
4. **Clear indication**: Show which detection method is being used
5. **Accessibility**: Toggle is keyboard accessible and has proper ARIA labels

---

## Expected Behavior Examples

**Scenario 1**: Anonymous user in Netherlands
- System locale: nl-NL (24-hour)
- Display: 09:00 - 09:30
- Can toggle to: 9:00 AM - 9:30 AM

**Scenario 2**: Anonymous user in USA
- System locale: en-US (12-hour)
- Display: 9:00 AM - 9:30 AM
- Can toggle to: 09:00 - 09:30

**Scenario 3**: Logged-in user with saved preference
- User preference: 24-hour
- Display: 09:00 - 09:30 (regardless of location)

**Scenario 4**: User with VPN (location mismatch)
- System locale: en-US (12-hour)
- IP location: Netherlands
- Priority: System locale wins (12-hour)
- Can toggle to 24-hour if preferred
