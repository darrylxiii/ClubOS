
# Booking Page Reliability + Full Scheduling Audit

## Problem Summary

The `/book/:slug` page shows "Booking page unavailable" because:

1. **Environment variables missing in preview**: The Supabase client is initialized with placeholder URLs when `VITE_SUPABASE_URL` is unavailable
2. **OpenTelemetry fetch interception**: All `fetch` calls go through OTel instrumentation which tries to POST traces to `/api/traces` (returns 404 in preview), causing cascading failures
3. **Fallback not working**: Even though `src/services/booking-page.ts` has a direct fetch fallback, both paths fail due to the OTel wrapper
4. **Time slot display issues**: Times appear correctly formatted now, but user wants start-end ranges and dual timezone display

---

## Phase 1: Fix Booking Page Loading (Critical)

### 1.1 Auto-detect Environment + Skip Invoke
Update `src/services/booking-page.ts` and `src/services/availability.ts`:

```text
Strategy: If we detect the Supabase client is using a placeholder URL, skip 
invoke entirely and go straight to direct fetch with hardcoded config.
```

Changes:
- Add helper `isPlaceholderClient()` that checks if the current Supabase URL contains "placeholder"
- If placeholder detected, skip `invokeGetBookingPage()` entirely and use only `fetchGetBookingPageDirect()`
- Keep retry logic but with longer initial timeout (8s) for cold-start edge functions

### 1.2 Bypass OpenTelemetry for Critical Public Paths
Modify the fallback fetch to use a "raw" fetch that bypasses OTel instrumentation:

```typescript
// Use native fetch directly to avoid OTel wrapper in fallback paths
const nativeFetch = window.fetch.bind(window);
```

Or configure OTel to exclude booking endpoints from instrumentation.

---

## Phase 2: Time Slot Display Improvements

### 2.1 Show Time Ranges (User Request)
Update `UnifiedDateTimeSelector.tsx` to display slots as "9:00 AM – 9:30 AM" instead of just "9:00 AM":

```typescript
const formatTimeRange = (slot: TimeSlot) => {
  const start = formatInTimeZone(new Date(slot.start), guestTimezone, 'h:mm a');
  const end = formatInTimeZone(new Date(slot.end), guestTimezone, 'h:mm a');
  return `${start} – ${end}`;
};
```

### 2.2 Dual Timezone Display (User Request)
Show both guest timezone (primary) and host timezone (secondary) for clarity:

```text
┌─────────────────────────────────────┐
│ 9:00 AM – 9:30 AM                   │
│ 3:00 PM – 3:30 PM (Host timezone)   │
└─────────────────────────────────────┘
```

Implementation:
- Add a small secondary line below each slot showing the same time in host timezone
- Only show if host timezone differs from guest timezone

---

## Phase 3: Code Quality Fixes

### 3.1 Error State Improvements
- Replace generic "Booking page unavailable" with actionable messages:
  - "Connection error – please check your internet and retry"
  - "This booking link doesn't exist or has been deactivated"
  - "Unable to reach scheduling service – retrying..."

### 3.2 Loading State Enhancement
- Add visual progress indicator (pulsing animation) during retries
- Show retry count: "Connecting... (attempt 2 of 3)"

### 3.3 Remove Render-phase Side Effects
Ensure no `toast()` calls happen during component render (already partially done, verify completeness)

---

## Phase 4: Backend Reliability Hardening

### 4.1 Edge Function Health Check
Add a lightweight `/health` endpoint or use OPTIONS pre-flight to verify function availability before main request.

### 4.2 Caching Layer
Cache the `get-booking-page` response in sessionStorage for 5 minutes to avoid repeated calls on navigation.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/booking-page.ts` | Auto-detect placeholder client, native fetch fallback |
| `src/services/availability.ts` | Same auto-detect pattern for slots |
| `src/config/backend.ts` | Add `isPlaceholderEnvironment()` helper |
| `src/components/booking/UnifiedDateTimeSelector.tsx` | Time range display, dual timezone |
| `src/pages/BookingPage.tsx` | Better error messages, retry UI |
| `src/lib/tracing/index.ts` | Exclude booking endpoints from OTel (optional) |

---

## Technical Details

### Auto-detect Placeholder Client
```typescript
// src/config/backend.ts
export function isPlaceholderEnvironment(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  return !url || url.includes('placeholder');
}
```

### Native Fetch Bypass
```typescript
// Capture native fetch before any instrumentation
const nativeFetch = globalThis.fetch?.bind?.(globalThis) || fetch;

async function fetchWithBypass(url: string, options: RequestInit) {
  // Use native fetch to bypass OTel in critical paths
  return nativeFetch(url, options);
}
```

### Time Range Formatting
```typescript
const formatSlotDisplay = (slot: TimeSlot) => {
  const guestStart = formatInTimeZone(new Date(slot.start), guestTimezone, 'h:mm a');
  const guestEnd = formatInTimeZone(new Date(slot.end), guestTimezone, 'h:mm a');
  
  // Only calculate host time if different timezone
  if (hostTimezone && hostTimezone !== guestTimezone) {
    const hostStart = formatInTimeZone(new Date(slot.start), hostTimezone, 'h:mm a');
    return {
      primary: `${guestStart} – ${guestEnd}`,
      secondary: `${hostStart} in host timezone`
    };
  }
  
  return { primary: `${guestStart} – ${guestEnd}`, secondary: null };
};
```

---

## Expected Outcome

After implementation:
1. `/book/:slug` loads reliably in all environments (preview, production, custom domains)
2. Time slots show as ranges: "9:00 AM – 9:30 AM"
3. Dual timezone display when guest and host are in different timezones
4. Better error messages with retry UI
5. Faster cold-start recovery with intelligent fallback
