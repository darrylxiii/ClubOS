
<context>
You report that booking pages used to render, but availability wasn’t showing. After the recent changes, the booking page still opens, but now all booking links show:
“Failed to load available times: Failed to fetch”.

So the booking page itself is not failing to load; the availability fetch is failing consistently on all /book/:slug pages.
</context>

<what-i-found>
1) The public booking pages load available times via `getAvailableSlots()` in `src/services/availability.ts`.
2) When `supabase.functions.invoke('get-available-slots')` fails with a network-ish error, we fall back to a direct `fetch()`:
   `POST ${VITE_SUPABASE_URL}/functions/v1/get-available-slots`
   with headers currently:
   - Content-Type
   - apikey

3) For the backend functions gateway, many setups require BOTH:
   - `apikey: <anon/publishable key>`
   - `Authorization: Bearer <anon/publishable key or user token>`
   
If `Authorization` is missing, the gateway can reject the request before your function runs and may not include CORS headers. In browsers, that surfaces as:
- `TypeError: Failed to fetch`
(because the browser blocks reading the response due to CORS).

This fits your symptom exactly: “Failed to fetch” across all booking links.
</what-i-found>

<goal>
Make `/book/:slug` reliably load available times again (minimum: restore prior behavior), while keeping the resiliency improvements (timeout/retries/fallback) so we don’t regress back to “Failed to send a request”.
</goal>

<implementation_plan>
<step id="1" title="Fix direct-fetch fallback headers so the browser request is authorized + CORS-safe">
Update `src/services/availability.ts` in `fetchGetAvailableSlotsDirect()` to include:
- `Authorization: Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}`

Keep:
- `apikey: ${VITE_SUPABASE_PUBLISHABLE_KEY}`
- `Content-Type: application/json`

Why:
- This makes the fallback call behave like the SDK call.
- Prevents the gateway from rejecting the request without CORS headers (the common cause of browser “Failed to fetch”).

Acceptance:
- On `/book/:slug`, selecting a date no longer shows “Failed to fetch”.
</step>

<step id="2" title="Improve error observability without spamming users">
Add structured logging (dev + production-safe) around availability failures:
- Log which transport failed: invoke vs direct fetch
- Log whether it was timeout, CORS-like failure (TypeError), or HTTP error code (e.g., 401/403)

Update user-facing toast copy to be calmer and more useful:
- “Availability temporarily unreachable. Please refresh.”
And (dev/admin only) include a short debug code.

Acceptance:
- If something fails again, we can distinguish:
  - gateway auth/CORS rejection
  - function runtime error
  - network timeout
</step>

<step id="3" title="Verify end-to-end on public booking routes">
Test flows:
1) Open `/book/darryl` in a fresh session (incognito).
2) Select a date; confirm times load.
3) Confirm the request in network panel is:
   - POST `/functions/v1/get-available-slots`
   - Returns 200 with JSON `{ slots: [...] }`
4) Repeat for at least one other booking slug to confirm “all booking links” are fixed.

Acceptance:
- Booking pages render and load available times again across all slugs.
</step>

<step id="4" title="(If still failing) Confirm gateway + function CORS behavior for 401/403 paths">
If we still see “Failed to fetch” after Step 1:
- Inspect whether the function endpoint is responding with missing CORS headers on auth failures.
- If necessary, adjust the backend function configuration/handlers so CORS headers are present even for error responses (though usually the header fix is sufficient).

Acceptance:
- Even in error states, browser receives a readable JSON error rather than opaque “Failed to fetch”.
</step>
</implementation_plan>

<scope_control>
- No database schema changes.
- No changes to scheduling page (/scheduling).
- Focus only on public booking availability transport stability.
</scope_control>

<expected_outcome>
- Public booking pages stop showing “Failed to fetch”.
- Availability loads again (or correctly shows “No available times” when true).
- We keep the resilience improvements (timeouts + retries + fallback) without breaking public access.
</expected_outcome>
