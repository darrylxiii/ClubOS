

# Partner Provisioning System Audit -- Current Score: 68/100

## Scorecard

| Category | Weight | Current | Target | Status |
|---|---|---|---|---|
| Core Provisioning (provision-partner) | 20 | 16/20 | 20/20 | Minor gaps |
| Core Provisioning (approve-partner-request) | 15 | 4/15 | 15/15 | CRITICAL |
| Auth and Authorization | 15 | 8/15 | 15/15 | Dangerous |
| Error Handling and Rollback | 10 | 7/10 | 10/10 | Good, gaps remain |
| Client-Side Error Handling | 5 | 4/5 | 5/5 | Minor gap |
| Welcome Email Integration | 5 | 3/5 | 5/5 | Redundant function |
| Input Validation and Dedup | 5 | 3/5 | 5/5 | No request-level dedup |
| Audit Logging | 5 | 4/5 | 5/5 | approve-partner missing |
| Idempotency and Race Conditions | 5 | 4/5 | 5/5 | Adequate |
| Data Integrity (DB schema, RLS) | 5 | 5/5 | 5/5 | Solid |
| Dead Code Cleanup | 5 | 3/5 | 5/5 | Orphaned function |
| Production Evidence | 5 | 0/5 | 5/5 | Zero provisions ever |

Total: **61/100** (revised after full data review -- initially estimated 68 but production evidence brings it down)

---

## Critical Findings

### 1. `approve-partner-request` Has ZERO Authentication (CRITICAL SECURITY)

This function has `verify_jwt = false` in config.toml AND performs no JWT validation internally. Unlike `provision-partner` (which checks the Authorization header and verifies admin role), `approve-partner-request` accepts an `approvedBy` field from the request body and trusts it blindly.

**Impact**: Any unauthenticated person on the internet can call this endpoint with a valid `requestId` and provision themselves a partner account with full company access. This is a privilege escalation vulnerability.

**Evidence**: Lines 32-33 of `approve-partner-request/index.ts` -- destructures `approvedBy` from the untrusted request body. No `req.headers.get('authorization')` check anywhere in the function.

**Fix**: Add the same JWT verification and admin role check that `provision-partner` has (lines 73-104 of `provision-partner/index.ts`).

### 2. Zero Successful Provisions in Production

- `partner_provisioning_logs` table: 0 rows
- `partner_requests` table: 10 rows, ALL status = 'pending'
- `comprehensive_audit_logs` with partner events: 0 rows
- Edge function logs for `approve-partner-request`: No logs found

Neither provisioning path has ever completed successfully in production. The trigger fix was deployed but never tested against a real request.

**Fix**: After applying the fixes below, run an end-to-end test by provisioning one of the existing pending requests.

### 3. `approve-partner-request` Does Not Send Welcome Email

After creating the user, assigning the role, and generating a magic link, the function returns success but never sends the magic link to the partner. The user is created but has no way to know. The `send-partner-welcome` edge function exists but is never called by either provisioning flow.

**Fix**: After generating the magic link in `approve-partner-request`, invoke `send-partner-welcome` or send the email directly via Resend (matching the pattern in `provision-partner` lines 466-532).

### 4. `send-partner-welcome` is an Orphaned Function

This edge function exists with a full email template, but:
- `provision-partner` sends emails directly via the Resend API (does not call this function)
- `approve-partner-request` does not send any email at all
- No other code in `src/` references `send-partner-welcome`

**Fix**: Either use `send-partner-welcome` from both provisioning flows (DRY) or delete it. Having two independent email-sending paths creates maintenance drift.

### 5. `AdminPartnerRequestsTab` Swallows Server Errors

Line 54-56: `throw new Error(error.message)` -- for `FunctionsHttpError`, `error.message` is literally the string "FunctionsHttpError", not the server's actual error message. The catch block on line 62 shows "Failed to provision partner" with no detail.

**Fix**: Use `getEdgeFunctionErrorMessage(error)` from `edgeFunctionErrors.ts` (same pattern already applied in `usePartnerProvisioning.ts`).

### 6. No Deduplication on Partner Requests

The same email (`darryl@thequantumclub.nl`) submitted 6 separate requests. No unique constraint or dedup logic exists. If an admin approves all 6, it would attempt to create 6 auth users with the same email (5 would fail, but wastefully).

**Fix**: Add a unique index on `(contact_email, status)` WHERE `status = 'pending'`, or add dedup logic in the submission form / edge function.

### 7. `approve-partner-request` Does Not Create Invite Code or Provisioning Log

Unlike `provision-partner` (which creates an invite code in Step 8 and a provisioning log in Step 9), `approve-partner-request` skips both. This means:
- No invite code for the partner to share with their team
- No record in `partner_provisioning_logs` (making the admin panel's provisioning history incomplete)
- No tracking of `first_login_at` or `welcome_email_sent`

**Fix**: Add invite code creation and provisioning log entry to `approve-partner-request`, mirroring Steps 8-9 of `provision-partner`.

### 8. Company Rollback is Incomplete

If role assignment fails in `provision-partner` (Step 4, line 318), the function rolls back the auth user via `deleteUser` but leaves the company record (Step 2) orphaned in the database. Same issue in `approve-partner-request`.

**Fix**: Track `companyId` as a rollback target. If a later step fails and the company was just created (not pre-existing), delete it.

---

## Implementation Plan

### Phase 1: Security Fix (BLOCKER)

1. **Add authentication to `approve-partner-request`**: Copy the JWT verification + admin role check pattern from `provision-partner` (lines 72-104). Reject with 401/403 if not an authenticated admin. Ignore the client-supplied `approvedBy` -- use the authenticated user's ID instead.

### Phase 2: Feature Parity for `approve-partner-request`

2. **Add welcome email delivery**: After generating the magic link, send it via Resend (inline, matching `provision-partner`'s pattern) or invoke `send-partner-welcome`.
3. **Add invite code creation**: Generate a `PARTNER-xxx` invite code and insert into `invite_codes` (matching `provision-partner` Step 8).
4. **Add provisioning log entry**: Insert into `partner_provisioning_logs` (matching Step 9).
5. **Update `partner_requests` with `reviewed_by` and `reviewed_at`**: The table has these columns but `approve-partner-request` only updates `status`, wasting the audit trail.

### Phase 3: Robustness

6. **Improve company rollback**: In both functions, if a step after company creation fails and the company was newly created, delete it before returning the error.
7. **Add request deduplication**: Add a partial unique index on `partner_requests (contact_email)` WHERE `status = 'pending'` to prevent duplicate pending requests for the same email.

### Phase 4: Cleanup and Client Polish

8. **Fix `AdminPartnerRequestsTab` error handling**: Use `getEdgeFunctionErrorMessage` to surface the real server error in the toast.
9. **Consolidate or remove `send-partner-welcome`**: Since `provision-partner` sends emails directly, either refactor both flows to use `send-partner-welcome` (preferred for DRY), or delete the orphaned function.
10. **Add `company_members` insert to `approve-partner-request`**: Currently missing -- the user gets a `partner` role but is never added to `company_members`, so company-scoped RLS policies will exclude them.

### Files to modify:
- `supabase/functions/approve-partner-request/index.ts` -- Add auth, welcome email, invite code, provisioning log, company_members insert, reviewed_by/reviewed_at update
- `supabase/functions/provision-partner/index.ts` -- Improve company rollback
- `src/components/admin/AdminPartnerRequestsTab.tsx` -- Fix error handling with `getEdgeFunctionErrorMessage`
- New DB migration: Add partial unique index on `partner_requests (contact_email) WHERE status = 'pending'`

### Edge function deployments needed:
- `approve-partner-request`
- `provision-partner`

