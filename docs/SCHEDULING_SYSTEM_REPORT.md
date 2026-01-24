# Scheduling System Report (Audit)

Last updated: 2026-01-24

Scope
- Internal scheduling dashboard: `/scheduling`
- Public booking flow: `/book/:slug`
- Guest booking management: `/bookings/:bookingId`
- Backend functions used by booking: availability, create, cancel, reschedule, reminders, calendar sync

Principles (TQC)
- Discreet by default, explicit consent for sensitive fields.
- Correctness first: no silent “no availability” states.
- Calendar truth: availability must respect **ALL connected calendars**.
- Security first: public booking should not require broad public table access.

---

## 1) Architecture map (current)

### Public booking (`/book/:slug`)
Frontend
- `src/pages/BookingPage.tsx`
  - Loads booking link via `booking_links` (public read)
  - Loads host profile via `profiles` (public read)
  - Checks Google calendar connected via `calendar_connections` (public read)
  - Renders date/time selector (`UnifiedDateTimeSelector`) then `BookingForm`

Availability
- `src/components/booking/UnifiedDateTimeSelector.tsx`
  - Calls `getAvailableSlots()` (client) for month indicators + day slots
- `src/services/availability.ts`
  - Primary: `supabase.functions.invoke('get-available-slots')`
  - Fallback: direct fetch `/functions/v1/get-available-slots`

Booking creation
- `src/components/booking/BookingForm.tsx`
  - Optional client-side slot recheck via `getAvailableSlots()`
  - Calls backend function `create-booking` with optional `x-recaptcha-token`

### Guest booking management (`/bookings/:bookingId`)
- `src/pages/GuestBookingPage.tsx`
  - Loads booking (public read) + booking_link nested
  - Loads host profile separately
  - Cancel via backend function `cancel-booking`
  - Reschedule redirects back to `/book/:slug?reschedule=<id>`

### Internal dashboard (`/scheduling`)
- `src/pages/Scheduling.tsx`
  - CRUD booking links (`booking_links`)
  - Reads upcoming bookings (`bookings`)
  - Reads connected calendars (`calendar_connections`)
  - Settings via `BookingAvailabilitySettings` (`booking_availability_settings`)

Backend functions (observed)
- `supabase/functions/get-available-slots/index.ts`
- `supabase/functions/create-booking/index.ts`
- `supabase/functions/cancel-booking/*`
- `supabase/functions/handle-booking-reschedule/*`
- `supabase/functions/process-booking-reminders/*`
- `supabase/functions/sync-booking-to-calendar/*`

---

## 2) Canonical contracts (current vs required)

### Availability response
Current backend behavior:
- `get-available-slots` returns:
  - `slots`: **string[]** formatted as `"HH:MM - YYYY-MM-DD"`
  - `availabilitySummary`: `{ date: string; count: number; status: 'many'|'few'|'limited'|'none' }[]`

Current frontend expectations (inconsistent):
- `UnifiedDateTimeSelector` supports string slots and a fallback object shape.
- `BookingTimeSlots` currently expects `{ start: string; end: string }[]` and silently drops string slots.
- `BookingForm` verification currently assumes string slots.

Required (“best-in-class” contract):
- Adopt **one** canonical slot schema across all consumers:
  - `slots: Array<{ start: string; end: string }>` where `start`/`end` are ISO timestamps.
  - Keep `availabilitySummary` for month indicators.

Why this is P0:
- Mixed formats cause silent “no times available” even when times exist.
- String slots are ambiguous without timezone context; ISO is unambiguous.

---

## 3) P0 gaps / risks (must fix)

### P0-1: Slot shape mismatch
Impact
- Some UIs will show zero slots due to client filtering (object-only).

Evidence
- `BookingTimeSlots.tsx` drops non-objects.
- `get-available-slots` produces string slots.

Fix
- Move `get-available-slots` to return ISO slot objects and update consumers.

### P0-2: “All calendars” not actually implemented
Impact
- Users can still be double-booked if conflicts exist in non-primary calendars.

Evidence
- `get-available-slots` always passes `calendars: ['primary']`.
- `create-booking` conflict checks also pass `calendars: ['primary']`.

Fix
- Respect `booking_availability_settings.check_all_calendars`:
  - If true: query all calendars for each connection (provider-specific listing + freeBusy).
  - If false: query only the selected primary calendar.

### P0-3: Public booking reads `calendar_connections` directly
Impact
- Fragile privacy posture; increases blast radius of any future RLS drift.

Fix
- Introduce a public backend function `get-booking-page` returning only:
  - booking link public fields
  - host display fields (per host setting)
  - calendarConnected boolean

### P0-4: reCAPTCHA “fails open” server-side
Impact
- If frontend fails to attach a token, `create-booking` currently proceeds.

Evidence
- `create-booking` logs “skipping verification” when token is missing.

Fix
- If reCAPTCHA is enabled/expected: require token; missing token => 400/401.

### P0-5: Rate limiting mismatch
Impact
- Current “IP-based” limit is actually per email; easy to bypass, and can block legitimate repeats.

Evidence
- Query uses `eq('guest_email', guestEmail)`.

Fix
- Implement real IP-based limiting (optionally also email) with privacy-safe hashing.

---

## 4) P1 improvements (high ROI)

### P1-1: Host identity display policy
User decision
- Host should be able to choose public display mode per booking link (or default + override).

Current
- Public booking always shows full host name + avatar.

Recommended
- Add per-link “Host display” option:
  - Full identity (name + avatar)
  - Discreet ("A member of The Quantum Club")
  - Hybrid (avatar only / name only)

### P1-2: Enforce booking window server-side
- `advance_booking_days` and working hours/days should be enforced in backend functions, not only UI.

### P1-3: Performance
- Month availability should rely on `availabilitySummary` and avoid huge `slots` payloads.
- Add short-lived caching for calendar busy windows (60–120s) per connection + date range.

---

## 5) Security posture notes

Database linter status
- 63 warnings overall (project-wide). We will filter to only scheduling-related tables/functions first.

Public endpoints
- `get-available-slots`, `create-booking`, `cancel-booking` are public (no JWT).
  - This is expected, but must be hardened with:
    - strict input validation
    - rate limits
    - fail-closed verification (reCAPTCHA)

---

## 6) Proposed execution order (next)

Phase 2 (P0 correctness)
1) Unify slot schema end-to-end (ISO start/end objects).
2) Implement “All calendars” properly in availability + booking conflict checks.

Phase 3 (P0 security)
3) Add `get-booking-page` backend function + migrate public booking UI to it.
4) Fail closed on missing reCAPTCHA token when enabled.
5) Fix rate limiting to be IP-based (plus optional email).

Phase 4+ (P1)
6) Add per-link host display option in link creation/edit.
7) Round-robin + collective: make production-ready end-to-end.
