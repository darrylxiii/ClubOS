
<context>
You confirmed:
- Booking pages are working again.
- Google Calendar is the provider.
- The connect flow “succeeds” but Scheduling still says it’s not connected.
- Canonical domain for booking + OAuth redirects is bytqc.com (Vercel).
- Calendar connections should be per-host (per booking link owner).
You also want a full audit of all API keys/secrets to see what is configured and what is actually working.
</context>

<what-I-found (root causes + current state)>
1) There are two different “calendar connection” implementations in the codebase:
   A) New/real implementation (correct):
   - /settings → ConnectionsSettings
   - On OAuth callback it inserts a row into database table calendar_connections (provider/email/access_token/refresh_token/token_expires_at/is_active)
   - Scheduling reads from calendar_connections and will only show “connected” if rows exist.

   B) Legacy implementation (incorrect / misleading):
   - /user-settings → UserSettings page
   - On OAuth callback it saves “connected calendars” only to localStorage (not the database)
   - Scheduling cannot see localStorage, so it keeps showing “No calendar connected”.
   - This matches your symptom: “Connect but not shown”.

2) Your backend secrets already include the key pairs needed for Google and Microsoft OAuth:
- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are present.
So this is not primarily an “API keys missing” problem; it’s primarily “wrong connection flow / data not saved where Scheduling expects”.

3) Your database currently has active Google calendar connections (3 rows, all is_active=true, error_count=0). That means at least one connection flow has worked historically. If your specific user still sees “not connected”, it’s likely they connected using the legacy /user-settings flow or they’re logged in as a different account than the one that owns those 3 connections.

4) Because your canonical domain is now bytqc.com, Google OAuth must allow redirect URIs for bytqc.com (and whichever callback path we use). If a user tries to connect from a domain not listed in Google’s allowed redirect URIs, it will fail with redirect_uri_mismatch (you’d usually see an explicit error). You’re not seeing that, but we’ll still treat domain parity as a must-have in the audit.
</what-I-found>

<goals>
A) Fix Google Calendar connection so that when you connect it, Scheduling reliably shows it as connected and availability uses it.
B) Remove/retire the legacy calendar connection path so we don’t “lose” connections into localStorage again.
C) Add an “Integrations / API Keys Health” audit surface that tells you:
   - Which integrations are configured (secret exists)
   - Which are actually functioning (recent successful call, token refresh, or provider ping)
   - What needs attention (missing secret, invalid key, OAuth redirect mismatch, token revoked, etc.)
D) Keep this privacy-first: never expose secret values; only show status and last check timestamps.
</goals>

<plan-overview>
We will deliver this in two tracks:
1) Calendar connection correctness (user-facing fix)
2) Integration health audit (admin-facing diagnostics)
</plan-overview>

<track-1-calendar-fix>
<step id="1" title="Make /user-settings stop being a trap for calendar connections">
- Audit routing/navigation to see who links to /user-settings.
- Implement one of these (preferred first):
  Option A (preferred): Redirect /user-settings → /settings (preserving query params), so OAuth callbacks land on the page that actually writes to calendar_connections.
  Option B: Keep /user-settings but update its OAuth callback handler to use the same DB insert logic as ConnectionsSettings (calendar_connections), and then remove localStorage storage for calendars.

Acceptance criteria:
- After connecting Google Calendar, Scheduling shows “Calendar Connected” immediately.
- No future connections are stored only in localStorage.
</step>

<step id="2" title="Add a safe migration path for anyone who previously connected via /user-settings">
- Detect “legacy connected calendars” in localStorage (connected_calendars) when the user visits /settings or /scheduling.
- Show a discreet banner: “We found a legacy calendar connection on this device. Reconnect to enable conflict checking.”
- Provide a single CTA that starts the proper /settings connection flow (not an auto-migration, because localStorage lacks refresh_token and we must avoid fabricating credentials).

Acceptance criteria:
- Users who “thought they were connected” get a clear recovery path without confusion.
</step>

<step id="3" title="Ensure Scheduling checks the right host calendar for each booking link">
- Confirm booking link ownership mapping: booking_links.user_id should be the host’s user id.
- Confirm get-available-slots uses that host user_id when fetching calendar_connections.
- If any code currently uses the logged-in viewer’s user id instead of the booking link owner (common bug in public booking pages), correct it.

Acceptance criteria:
- /book/:slug checks conflicts against the booking link owner’s connected Google Calendar.
</step>

<step id="4" title="Tighten UX: show the exact reason a calendar isn’t considered connected">
In Scheduling and Connections:
- If calendar_connections has rows but is_active=false, show “Disconnected (token revoked). Reconnect.”
- If rows exist but token_expires_at is past and refresh failed, show “Token expired. Reconnect.”
- If no rows exist, show “No calendar connected.”

Acceptance criteria:
- The app never silently fails; it always shows the “why” and one next best action.
</step>

<step id="5" title="Domain correctness for OAuth (bytqc.com canonical)">
- Ensure the redirectUri used for calendar auth is exactly:
  - https://bytqc.com/settings (production)
  - plus any preview/staging domains you still use for testing, if applicable
- Provide a checklist inside the app (admin-only) that prints the exact redirect URIs your app will request (without guessing).

Acceptance criteria:
- Connecting on bytqc.com works consistently for all users.
</step>
</track-1-calendar-fix>

<track-2-integration-health-audit>
<step id="6" title="Inventory: produce a formal Integration Matrix from secrets + code usage">
We will generate an internal “integration registry” (in code) listing:
- Integration name (Google Calendar, Microsoft Calendar, Email, SMS, LiveKit, Stripe, ElevenLabs, PostHog, reCAPTCHA, etc.)
- Required secrets (names only)
- Where it’s used (backend function(s) / frontend module)
- What a “health check” means (e.g., token refresh + /userinfo for Google, send test email for email provider, etc.)
- Whether it is user-scoped (OAuth tokens in DB) or system-scoped (single API key)

Output surfaces:
- Admin diagnostics page: “Integrations Health”
- Optional: a markdown doc inside repo for maintainers

Acceptance criteria:
- One place answers “what do we use, where, and what needs to be configured”.
</step>

<step id="7" title="Build an admin-only healthcheck backend function">
Create a backend function (admin-protected) that returns a status report per integration:
- configured: boolean (secret exists)
- last_success_at / last_error_at
- current_status: ok | degraded | failing | not_configured
- actionable_message (human readable, calm tone)
- for user-scoped integrations (calendar/email OAuth): counts of active connections and counts of inactive/revoked

Checks (non-destructive):
- Google Calendar: sample 1–3 recent active connections → attempt refresh if needed → call a lightweight endpoint (userinfo or calendarList with maxResults=1) → record ok/error.
- Microsoft Calendar: similar lightweight /me or calendar list.
- Resend/email provider: do not send email by default; instead validate key presence + optionally offer “Send test email” button that requires confirmation.
- Twilio: validate key presence + optionally “Send test SMS” button requiring explicit target number and confirmation.
- LiveKit: validate key presence + optionally mint a token (no external call needed).
- Stripe: validate key presence + optionally fetch account info via server-side call (safe).
- PostHog: frontend-only; validate env presence and optionally call /decide endpoint.
- reCAPTCHA: detect currently disabled mismatch and show remediation steps.

Acceptance criteria:
- One click gives a truthful readout: configured vs actually working.
- No secrets are exposed in responses.
</step>

<step id="8" title="Add an ‘Integrations Health’ admin UI in-app">
- New page under Settings (Admin-only): /settings/integrations-health
- Table view with:
  - Integration
  - Status badge (Ok/Degraded/Failing/Not configured)
  - “Details” drawer: last error snippet, what to fix, link to connect flow (for calendar)
  - Actions:
    - “Run checks”
    - “Reconnect Google Calendar” (deep link to /settings with the correct tab)
    - Optional: “Send test email/SMS” (guarded)

Acceptance criteria:
- You can diagnose 90% of integration issues without logs.
- Fits TQC luxury/discreet UI standards (minimal, precise, no clutter).
</step>

<step id="9" title="Logging + audit trail (privacy-first)">
- Record each health check run in audit_logs:
  - who ran it, when, which integration, result, error code (no secrets)
- If an integration fails due to token revoked/invalid_grant, mark the relevant calendar_connection is_active=false with last_error, token_expired_at.

Acceptance criteria:
- You have an audit trail suitable for enterprise operations.
</step>
</track-2-integration-health-audit>

<testing-and-verification>
We will verify end-to-end on bytqc.com:
1) Login as a host user.
2) Go to /settings → connect Google Calendar.
3) Confirm a row appears in calendar_connections for that user (is_active=true).
4) Go to /scheduling → CalendarConnectionStatus shows connected.
5) Open /book/:slug for that host → available slots reflect real agenda conflicts (no double-bookings).
6) Run Integrations Health check → Google Calendar shows OK with a recent timestamp.
</testing-and-verification>

<risks-and-mitigations>
- Risk: Some users still rely on /user-settings for other settings.
  Mitigation: redirect only calendar-related flows first, or keep /user-settings but remove calendar section and point to /settings.
- Risk: OAuth redirect mismatch for bytqc.com.
  Mitigation: diagnostics page shows exact redirect URI strings and error guidance; we standardize to /settings for calendar callback.
- Risk: RLS blocks reading calendar_connections.
  Mitigation: verify RLS policies for calendar_connections allow authenticated users to select their own rows; ensure admin diagnostics uses server-side permissions safely.
</risks-and-mitigations>

<what-I-need-from-you (minimal)>
Nothing else required right now; you already answered the key questions (provider, where it breaks, canonical domain, per-host model). During implementation, I may ask for:
- One host account email that you expect to be connected (to compare with calendar_connections rows), but only if needed for debugging.
</what-I-need-from-you>

<de-scope (to keep this controlled)>
- No new calendar providers (Google only for this fix).
- No new scheduling UX features beyond connection reliability + diagnostics.
- No sending real test emails/SMS unless you explicitly trigger it from the admin UI.
</de-scope>
