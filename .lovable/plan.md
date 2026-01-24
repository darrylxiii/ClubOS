
Goal
- Perform a comprehensive, end-to-end audit of the Scheduling + Booking system (internal /scheduling and public /book/:slug), then produce and implement a prioritized set of fixes and upgrades so it behaves like a best-in-class Calendly-style product, aligned with The Quantum Club’s “discreet, fast, precise” standard.
- You confirmed: prioritize ALL areas, availability should consider ALL connected calendars, and all booking types (individual + round-robin + collective) must be production-ready.

What we already know (important audit findings from code review)
1) Availability response format mismatch (high impact)
- get-available-slots currently returns slots as strings in format "HH:MM - YYYY-MM-DD".
- BookingTimeSlots currently expects slot objects { start, end } and filters out non-objects, which can lead to “no times available” even when slots exist.
- UnifiedDateTimeSelector uses the string format and counts slots by date from strings.
- This inconsistent “two competing slot formats” is a root cause class that will keep resurfacing as silent “no availability” bugs.

2) Calendar “All calendars” setting vs backend behavior (logic mismatch)
- UI has booking_availability_settings.check_all_calendars = true/false.
- get-available-slots loops through all calendar_connections but calls calendar provider functions with calendars: ['primary'] every time.
- This means “all calendars” is not truly implemented; it’s “all connections, but only primary calendar inside each connection,” and not user-selectable calendars.

3) Public booking page reads multiple tables directly (security + resilience)
- /book/:slug fetches booking_links + profiles + calendar_connections from the browser using anon access.
- This can be okay, but it increases dependency on correct public RLS policies and risks accidental PII exposure if policies drift.
- For “discretion-first,” it’s safer to serve public booking page data through a backend function that returns only the minimum fields needed.

4) create-booking reCAPTCHA enforcement may be weaker than intended
- create-booking currently verifies reCAPTCHA “if token provided,” otherwise it logs “skipping verification.”
- You said reCAPTCHA is configured + required. If the frontend ever fails to attach a token (race, ad-blockers, provider not ready), the backend currently proceeds instead of failing closed.

5) Rate-limiting mismatch
- create-booking comment says “IP-based rate limiting” but the implementation queries by guest_email, not IP. This is easier to bypass and can also block legitimate users sharing an email alias pattern.

6) Operational risk: huge DB + security linter warnings
- Security linter reports 63 warnings, including multiple “RLS Policy Always True” and “Function Search Path Mutable.”
- With 859 tables in the database, we should narrow to scheduling-related tables and functions, and fix the relevant ones first to avoid scope explosion.

Audit deliverables
A) A “Scheduling System Report” (internal doc in-project) containing:
- Architecture map (UI → services → backend functions → tables)
- Gaps/missing features vs “best-in-class scheduling”
- Security posture for public booking routes (what is public, what is private)
- Reliability review (timeouts, retries, SW/PWA caching interactions)
- Performance review (slot generation cost, calendar calls, caching strategy)
- Concrete implementation backlog with priorities (P0/P1/P2), acceptance criteria, and de-scopes

B) A prioritized implementation plan that we execute in phases, starting with correctness + security before feature expansion.

Phase 1 — Inventory + trace the real system boundaries (fast but thorough)
1) Map routes and modules
- Public: /book/:slug, /bookings/:bookingId (confirmation)
- Internal: /scheduling (+ availability settings, analytics dashboards, approvals, waitlist, calendar connections)
- Backend functions involved: get-available-slots, create-booking, cancel-booking, handle-booking-reschedule, send-booking-confirmation, reminders, sync-to-calendar, etc.
2) Identify the “source of truth” tables for scheduling
- booking_links, bookings, booking_availability_settings, calendar_connections
- approval + waitlist tables mentioned in create-booking: booking_approval_requests, booking_calendar_check_failures, waitlist-related tables
3) Produce an explicit contract for slot data returned by get-available-slots
- Choose ONE canonical schema:
  Option A (recommended): slots: Array<{ start: ISOString; end: ISOString; source?: 'generated' }>
  Plus availabilitySummary: Array<{ date: YYYY-MM-DD; count: number; status: 'many'|'few'|'limited'|'none' }>
- Ensure all consumers (UnifiedDateTimeSelector, BookingTimeSlots, BookingForm verification) use the same schema and do not rely on string parsing.

Acceptance criteria (Phase 1)
- We have a single documented “slot contract.”
- We have a list of all tables/functions the scheduling system depends on.
- We have a “P0 issues” shortlist for immediate fixes.

Phase 2 — Correctness hardening (P0)
This phase is about making the current experience correct and consistent for all booking links and environments.

1) Unify availability slot format end-to-end
- Update get-available-slots to return structured slots (start/end ISO), not "HH:MM - YYYY-MM-DD" strings.
- Update UnifiedDateTimeSelector month indicators to use availabilitySummary instead of parsing slots (it’s already returned by the function).
- Update BookingTimeSlots to render from slot.start/slot.end consistently.
- Update BookingForm “slot still available” verification to compare against canonical slot starts (ISO) rather than time string normalization.

2) Enforce advance booking window server-side
- Even if the UI restricts date selection, enforce on backend too:
  - Respect bookingLink.advance_booking_days (max horizon)
  - Respect bookingLink.min_notice_hours (already done)
  - Respect working days/hours and buffers

3) Align “All calendars” behavior with settings
- If you want “All calendars”:
  - When check_all_calendars=true: query busy times from all relevant calendars (not just primary)
  - When primary_calendar_id is set and check_all_calendars=false: query only that specific calendar (or the best available mapping)
- This likely requires that calendar_connections store/select calendar IDs per provider, not only the connection record. We’ll validate current schema and add missing fields if needed.

4) Make backend fail closed on reCAPTCHA when required
- If RECAPTCHA is configured in the backend, require token for create-booking:
  - Missing token => 400/401 with clear error
  - Failed verification => current behavior
- Ensure public booking UX gracefully handles “reCAPTCHA blocked” scenarios (common with privacy tools) with calm copy.

5) Fix rate-limiting to match intent
- Implement true IP-based limiting (and optionally per-email) using a dedicated table keyed by ip/email with timestamps, or an insert-only log with indexed lookups.
- Make it privacy-safe (store hashed IP if desired) and avoid blocking legitimate repeats (e.g., reschedule flow).
- Return Retry-After headers consistently.

Acceptance criteria (Phase 2)
- Public booking page always shows correct availability when slots exist.
- No “silent no-times” due to slot parsing mismatch.
- Backend enforces booking window constraints regardless of client behavior.
- reCAPTCHA cannot be bypassed if configured as required.
- Rate-limits are effective and measurable.

Phase 3 — Security & privacy audit (P0/P1)
1) Public data exposure review
- Verify exactly which tables/columns are accessible to anon users on /book/:slug.
- Restrict public access to only what’s necessary:
  - booking_links: only is_active links + fields needed to render (title, description, duration, color, slug, allow guest platform choice)
  - profiles: only public fields (full_name display name, avatar_url, timezone if needed)
  - calendar_connections should NOT be publicly readable; the public page only needs a boolean “has calendar connected,” which should be computed server-side.

2) Introduce a dedicated backend function for public booking page bootstrap (recommended)
- Example: get-booking-page (public) returns:
  - bookingLink: limited fields
  - host: limited fields
  - feature flags (calendarConnected boolean, clubAI enabled, etc.)
- This removes fragile dependence on public RLS for multiple tables.

3) Address relevant security linter warnings
- Filter linter findings down to tables/functions used by scheduling.
- Fix:
  - “RLS Policy Always True” on scheduling tables for write operations (UPDATE/INSERT/DELETE should never be true)
  - “Function Search Path Mutable” for custom functions used by scheduling (rpc locks etc.)

Acceptance criteria (Phase 3)
- Public booking routes cannot read calendar_connections or other sensitive tables directly.
- Public booking data is minimal and intentional.
- Scheduling-related linter warnings are remediated or explicitly justified.

Phase 4 — “Best-in-class” workflow completeness (P1)
This is where we make it feel like a premium Calendly competitor.

1) Booking link builder completeness
- Round robin: team assignment rules, fairness, overrides, “owner,” and exclusion rules.
- Collective: group events with capacity, attendee lists, optional approval.
- Single-use + max_uses enforcement server-side (not only UI).

2) Reschedule + cancel flows
- Ensure reschedule retains original guest identity and rechecks availability.
- Ensure cancellations release slot and trigger:
  - calendar updates
  - waitlist autopromotion (if enabled)
  - notifications

3) Waitlist system
- Confirm tables + policies + autopromotion logic:
  - join-waitlist function?
  - promote-waitlist function?
  - notifications + confirmation flows

4) Notifications + reminders
- Email confirmation already exists.
- Ensure reminders:
  - respect quiet hours
  - are idempotent
  - handle timezone correctly (host vs guest)
  - have clear unsubscribe/opt-out for SMS where applicable

Acceptance criteria (Phase 4)
- Round-robin and collective are genuinely usable end-to-end (not “Coming Soon”).
- Reschedule/cancel are reliable and sync to calendars.
- Waitlist adds measurable conversion lift and never spams.

Phase 5 — UX polish to match TQC brand (P1)
- Ensure booking pages reflect luxury/discretion:
  - calmer microcopy (no exclamation-heavy text)
  - gold accent sparingly, dark UI, whitespace
  - minimal but clear “Powered by The Quantum Club”
- Accessibility + keyboard-first on date/time selection.
- i18n readiness (EN/NL) for booking public pages.

Acceptance criteria (Phase 5)
- Booking feels premium, fast, and calm on mobile and desktop.
- No confusing timezone presentation; warnings are clear and subtle.

Phase 6 — Performance + resilience (P1/P2)
1) Reduce expensive calendar calls
- Cache busy times per (connectionId, dateRange) short-term (e.g., 60–120 seconds) to reduce API load and speed up month views.
- Prefer availabilitySummary for month indicators instead of fetching full slots across a month if possible.

2) Observability
- Add structured logs for:
  - slot generation time
  - calendar fetch time per provider
  - cache hit rate
  - create-booking conflict reasons
- Hook into your existing error logging system so scheduling errors are grouped and actionable.

Acceptance criteria (Phase 6)
- Month view availability loads quickly and consistently.
- Calendar calls are bounded and do not time out in normal conditions.
- Errors are diagnosable without guesswork.

Phase 7 — Testing & QA gates (P0 → ongoing)
1) Expand Playwright E2E coverage (public + authenticated)
- Create booking link (authenticated)
- Open /book/:slug (incognito)
- Select date/time
- Submit booking with reCAPTCHA (mock or test key mode)
- Verify booking row exists and status correct
- Reschedule + cancel flows
- Round-robin + collective scenarios
2) Add contract tests for slot API shape (ensuring no future format regressions)

Acceptance criteria (Phase 7)
- A regression like “no times show up” becomes impossible to ship silently.

Proposed sequencing (so we don’t blow scope)
- First execute Phases 1–3 (correctness + security). This gives a stable foundation.
- Then Phase 4 (feature completeness).
- Then Phase 5–7 as continuous improvements.

Explicit de-scopes (to keep the audit actionable)
- We will not attempt to clean up all 859 tables or all 63 linter warnings immediately.
- We will focus on scheduling-related tables/functions first, then expand outward only if a real dependency is discovered.

What I need from you (non-technical, one-time decisions)
- You already answered: “ALL” for focus and booking types, and “All calendars” for availability. I will treat those as the north star constraints during implementation.
- If you want an additional constraint: should public booking pages expose the host’s full name and avatar, or should it default to a more discreet display unless the host opts in? (We can implement an opt-in toggle.)

Next action if you approve this audit approach
- I will start by producing the Phase 1 inventory report (in code changes mode: add an internal markdown doc + small refactors only if needed for clarity), then immediately execute Phase 2 P0 fixes (slot contract unification + enforcement), followed by Phase 3 privacy hardening.
