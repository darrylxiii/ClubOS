
<context>
You’re seeing: “Failed to load available times: Failed to send a request to the Edge Function” when visiting `/book/darryl`.

Key observations gathered:
- It fails on both Vercel and Lovable domains.
- `/scheduling` works (and doesn’t call the availability function), but public `/book/:slug` fails.
- The backend function `get-available-slots` is configured as public (`verify_jwt = false`) in `supabase/config.toml`.
- A direct backend invocation of `get-available-slots` succeeds (HTTP 200) and returns JSON. So the function is deployed and reachable from the backend side; the failure is browser-side (request not successfully made or blocked).
</context>

<likely-root-cause>
Because the function works when called directly, the error is almost certainly a browser-level fetch failure that `supabase.functions.invoke()` surfaces as “Failed to send a request…”. The most common causes in this situation are:
1) CORS/preflight failing (often because the request is getting rejected before your function code runs, which means no CORS headers are returned)
2) A service worker / PWA caching layer interfering with calls to `/functions/v1/*` (stale cache, blocked fetch, offline fallback)
3) Environment mismatch where the browser is using a wrong backend URL (less likely because authenticated pages work, but we will confirm on the booking page specifically)
4) Client-side request timeout / aborted fetch (less likely but we will add explicit timeouts + retries and make errors actionable)

Given the evidence (public route only, and the function works from backend), the plan focuses on making public booking availability calls:
- observable (we can see exactly which URL it tries to hit and the response status)
- resilient (retries + timeouts)
- immune to service worker issues (exclude functions calls from SW caching)
</likely-root-cause>

<scope>
Fix: Public booking page availability loading for `/book/:slug`.
Non-goals: Reworking the scheduling product, changing database schema, or changing calendar logic in `get-available-slots` unless logs show a server-side issue.
</scope>

<implementation-plan>
<phase id="1" name="Reproduce + capture the real browser failure (no guesswork)">
1. Add diagnostic logging (dev-only) in `UnifiedDateTimeSelector.tsx` around the `supabase.functions.invoke("get-available-slots")` call:
   - log the resolved backend URL (from `import.meta.env.VITE_SUPABASE_URL`)
   - log whether we have a publishable key present
   - log the exact payload sent
   - when errors occur, log:
     - error name/type (FunctionsHttpError vs fetch error)
     - error message
     - any status code/body if available
2. Add a “debug hint” in the toast for public booking pages:
   - “Availability service unreachable. Please refresh. If it persists, contact support.”
   - (In admin/dev mode, include a short code like AVAIL_NET_01 so we can correlate logs.)

Acceptance criteria:
- When the issue happens, we can definitively see whether it’s:
  - a CORS block
  - a network error
  - an auth preflight failure
  - a wrong URL / missing env
  - a service worker interception
</phase>

<phase id="2" name="Make availability calls robust (timeouts + retries + fallback transport)">
1. Implement a small helper (e.g. `src/services/availability.ts`) for public availability calls:
   - primary attempt: `supabase.functions.invoke("get-available-slots")`
   - if it fails with a network-level error:
     - fallback: direct `fetch(`${VITE_SUPABASE_URL}/functions/v1/get-available-slots`)` using headers:
       - `Content-Type: application/json`
       - `apikey: VITE_SUPABASE_PUBLISHABLE_KEY`
       - (No Authorization for public booking pages)
   - wrap both with:
     - 5s timeout via `AbortController`
     - retry (2 attempts) with small jitter (e.g. 250ms then 750ms)
2. Replace the direct invoke usage in `UnifiedDateTimeSelector` (and any other booking-time availability checks) to use the helper.

Why this helps:
- If `supabase-js` is failing in some browser context, the fallback transport often still works.
- If the issue is transient (edge POP hiccup), retries recover instantly.
- We get consistent, richer error handling.

Acceptance criteria:
- `/book/darryl` reliably loads times (or shows “No available times” if that is the truth), without “Failed to send request”.
- If the backend is actually unreachable, users see a clean message and we log a clear failure reason.
</phase>

<phase id="3" name="Prevent PWA/service worker from interfering with /functions/v1 calls">
1. Inspect the current PWA configuration (Vite PWA / Workbox settings) and confirm whether runtime caching includes `*/functions/v1/*`.
2. Update the service worker config to explicitly:
   - NetworkOnly for `**/functions/v1/**` (do not cache)
   - or exclude that pattern from runtime caching routes entirely
3. Add a one-time “SW cache bust” strategy (if needed):
   - bump SW version
   - ensure clients activate the new SW quickly

Acceptance criteria:
- Availability calls are not cached/offlined by the service worker.
- Redeploys don’t create “stale booking pages” or broken availability calls.
</phase>

<phase id="4" name="Backend-side hardening (only if logs indicate it)">
If browser logs show calls reach the function but return error:
1. Add structured logging inside `get-available-slots` for:
   - input validation failures
   - booking link lookup
   - calendar_connections count
   - internal calendar API invocation errors (google-calendar-events)
2. Ensure every response path returns JSON + CORS headers (already mostly true, but we confirm every early return).

Acceptance criteria:
- If anything fails server-side, the browser receives a real JSON error (not a blocked response), and we can see the exact failure in backend logs.
</phase>
</implementation-plan>

<testing-plan>
1. Public test:
   - open `/book/darryl` in an incognito window
   - verify month availability indicators load
   - select a date -> time slots load without errors
2. Regression:
   - ensure `/scheduling` still works and doesn’t slow down
3. Cross-domain:
   - verify on both bytqc.com and the Lovable published domain
4. Network resilience:
   - simulate slow network (or just rely on timeout) and confirm retries/fallback behave and don’t spam the UI
</testing-plan>

<notes-on-your-question-about-creating-booking-links>
Your “Calendly-like” booking link builder is `/scheduling`.
That page already includes a “New Booking Link” button and stores records in `booking_links` which power `/book/:slug`.

If you want a more discoverable entry point later, we can add:
- a prominent “Create booking link” CTA in the main sidebar header or command palette
- a dedicated “Booking Links” section inside Settings
(Out of scope for the immediate availability failure fix.)
</notes-on-your-question-about-creating-booking-links>

<expected-outcome>
After these changes:
- Public booking pages will stop failing with “Failed to send a request…”
- When availability truly can’t be fetched, the UI will degrade gracefully and we’ll have definitive logs to fix any deeper cause.
- No service worker caching surprises for booking availability.
</expected-outcome>
