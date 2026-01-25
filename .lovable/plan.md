

# Fix Time Slot Display Bug

## Problem Identified

The booking page at `/book/darryl` is displaying raw ISO timestamps (e.g., `2026-01-26T09:00:00.000Z`) instead of formatted times (e.g., `10:00 AM – 10:30 AM`). When a user clicks on a time slot, it fails with "not a valid value."

### Root Cause Analysis

The `safeFormatTime` function in `src/lib/safeTimeFormat.ts` has a fallback path that returns the raw ISO string when formatting fails:

```typescript
// Line 34-35 in safeTimeFormat.ts
// Ultimate fallback: return raw string
return isoString;
```

**Why formatting is failing**: The function catches errors silently without logging, making it impossible to debug. The likely cause is:
1. An issue with timezone resolution in `Intl.DateTimeFormat`
2. The date parsing failing due to an edge case with the ISO string format

### Data Flow Issue

```text
Edge Function → { start: "2026-01-26T09:00:00.000Z", end: "2026-01-26T09:30:00.000Z" }
       ↓
formatSlotWithDualTimezone(slot.start, slot.end, guestTimezone, hostTimezone, format)
       ↓
formatTimeRange() → safeFormatTime() 
       ↓
Intl.DateTimeFormat() FAILS → returns raw ISO string
       ↓
Display: "2026-01-26T09:00:00.000Z" (BUG!)
```

---

## Solution: Robust Formatting with Better Fallbacks

### Fix 1: Improve safeFormatTime with Debug Logging and Better Fallbacks

Update `src/lib/safeTimeFormat.ts` to:
1. Add debug logging when formatting fails
2. Implement a more robust manual fallback that always produces readable times
3. Never return raw ISO strings to the UI

```typescript
export function safeFormatTime(
  isoString: string,
  timezone: string,
  format: TimeFormat = '12h'
): string {
  // Manual fallback that never returns raw ISO
  const manualFallback = (date: Date, fmt: TimeFormat): string => {
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    if (fmt === '24h') {
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${minutes} ${period}`;
  };

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      console.warn('[safeFormatTime] Invalid date:', isoString);
      // Try to extract time from ISO string directly
      const match = isoString.match(/T(\d{2}):(\d{2})/);
      if (match) {
        const h = parseInt(match[1], 10);
        const m = match[2];
        if (format === '24h') return `${h.toString().padStart(2, '0')}:${m}`;
        const period = h >= 12 ? 'PM' : 'AM';
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${displayHour}:${m} ${period}`;
      }
      return 'Invalid time';
    }

    // Try native Intl.DateTimeFormat
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: format === '12h',
      timeZone: timezone,
    }).format(date);
  } catch (err) {
    console.warn('[safeFormatTime] Intl.DateTimeFormat failed:', err, { isoString, timezone });
    
    // Fallback: try without timezone
    try {
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: format === '12h',
        }).format(date);
      }
    } catch {
      // Continue to manual fallback
    }
    
    // Ultimate manual fallback - never return raw ISO
    try {
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return manualFallback(date, format);
      }
    } catch {
      // Even this failed
    }
    
    // Last resort: extract time from string pattern
    const match = isoString.match(/T(\d{2}):(\d{2})/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = match[2];
      if (format === '24h') return `${h.toString().padStart(2, '0')}:${m}`;
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${displayHour}:${m} ${period}`;
    }
    
    return 'Time unavailable';
  }
}
```

### Fix 2: Add Debug Logging to UnifiedDateTimeSelector

Add temporary logging to identify where the failure occurs:

```typescript
// In UnifiedDateTimeSelector.tsx, update formatSlotDisplay
const formatSlotDisplay = (slot: TimeSlot) => {
  console.log('[formatSlotDisplay] Input:', { 
    start: slot.start, 
    end: slot.end, 
    guestTimezone, 
    hostTimezone, 
    timeFormat 
  });
  
  const result = formatSlotWithDualTimezone(
    slot.start,
    slot.end,
    guestTimezone,
    hostTimezone,
    timeFormat
  );
  
  console.log('[formatSlotDisplay] Output:', result);
  return result;
};
```

### Fix 3: Validate Timezone Before Use

The guest timezone detection might be returning an invalid value:

```typescript
// In UnifiedDateTimeSelector.tsx
const rawGuestTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const guestTimezone = rawGuestTimezone || 'UTC'; // Fallback to UTC if undefined
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/safeTimeFormat.ts` | Robust fallback chain that never returns raw ISO strings |
| `src/components/booking/UnifiedDateTimeSelector.tsx` | Add timezone fallback and debug logging |

---

## Verification Steps

After implementation:
1. Navigate to `/book/darryl`
2. Select a date with available times
3. Verify times display as "9:00 AM – 9:30 AM" (not raw ISO)
4. Click on a time slot
5. Verify the form step loads correctly
6. Complete a test booking to ensure end-to-end flow works

---

## Technical Notes

### Why Intl.DateTimeFormat Might Fail

1. **Invalid timezone string**: If `Intl.DateTimeFormat().resolvedOptions().timeZone` returns `undefined` or an invalid IANA timezone
2. **Browser compatibility**: Older browsers may not support all timezone options
3. **Preview environment quirks**: OpenTelemetry instrumentation or other polyfills may interfere

### Defense in Depth Strategy

The fix implements multiple fallback layers:
1. Native `Intl.DateTimeFormat` with timezone
2. Native `Intl.DateTimeFormat` without timezone (local time)
3. Manual UTC-based calculation
4. Regex extraction from ISO string
5. "Time unavailable" as absolute last resort (never show raw ISO)

