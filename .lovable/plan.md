
Audit complete. I traced this failure to a CORS contract mismatch, not partner business logic or timeout.

What I found (evidence)
1) The UI error is network-level:
- `FunctionsFetchError: Failed to send a request to the Edge Function`
- inner `TypeError: Failed to fetch`
This means the browser blocked before receiving a normal function response.

2) The request likely never completed at function level:
- No meaningful invocation log entries for `approve-partner-request` around the failure window.
- `partner_requests` row for Timo is still `pending`, no profile created for `t.schuringa@det.nl`, no audit row.

3) Root cause in code:
- Client always sends global header `x-application-name` (`src/integrations/supabase/client.ts`).
- `approve-partner-request` CORS allows many headers, but **does not include `x-application-name`** (`supabase/functions/approve-partner-request/index.ts`, CORS header line).
- Preflight fails => browser throws `Failed to fetch` => exactly what you see.

4) Full flow audit found the same CORS weakness in related approval functions:
- `send-partner-declined-email` (missing `x-application-name`)
- `send-approval-notification` (missing `x-application-name`)
- `send-approval-sms` (missing `x-application-name`)
- `send-partner-welcome-email` (missing `x-application-name`)
- `notify-admin-partner-request` also uses minimal headers.
So this is systemic drift, not one isolated file.

Implementation plan
Phase 1 — Immediate unblock (hotfix)
1. Update `approve-partner-request` CORS headers to include:
   - `x-application-name`
   - existing platform/runtime headers (already present)
2. Ensure OPTIONS response and all error/success responses use the same CORS header object.

Phase 2 — Stabilize the whole approval notification surface
3. Apply the same header standard to all browser-invoked approval-related functions:
   - `send-partner-declined-email`
   - `send-approval-notification`
   - `send-approval-sms`
   - `send-partner-welcome-email` (for direct/manual invokes)
4. Optional but recommended: add `Access-Control-Allow-Methods: POST, OPTIONS` for stricter preflight compatibility.

Phase 3 — Remove recurrence risk
5. Standardize on one shared web CORS constant in `_shared` and import it across all web-invoked functions to stop drift.
6. Add lightweight function-entry logs in `approve-partner-request` (request received, requestId, admin user id, step checkpoints) so future failures are diagnosable in minutes.

Phase 4 — Tighten adjacent bugs found during audit
7. Fix `send-approval-sms` body handling bug (currently parses `req.json()` then tries `req.text()` again, second read is invalid). This silently breaks SMS notification logging.
8. Improve admin UI error surfacing in `AdminMemberRequests` to parse edge error body consistently (same helper pattern used elsewhere), so admins see precise messages instead of generic failure text.

Validation plan (end-to-end)
1. Retry approve on Timo from `/admin/talent-hub`.
2. Confirm no browser fetch/CORS error.
3. Confirm DB state transitions:
   - `partner_requests.status = approved`
   - profile exists for `t.schuringa@det.nl` with `account_status='active'`
   - `user_roles` includes `partner`
   - `company_members` row exists
   - `partner_provisioning_logs` row exists
4. Confirm welcome email send result in provisioning log and verify magic-link onboarding path works.
5. Negative test: attempt decline path and candidate approval path to confirm related CORS fixes are also working.

Why I am not proposing timeout/offload first
- This failure pattern is preflight/network-blocked (`Failed to fetch`), not a server timeout (`5xx`/long execution with function logs).
- We should fix CORS contract first; only consider async job/offload if logs later show real runtime limits.
