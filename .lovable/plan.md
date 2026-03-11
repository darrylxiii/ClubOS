

# Partner Invite System — Ruthless Audit (Post-Implementation)

## Score: 68/100

The previous round fixed the major infrastructure failures (stats querying wrong table, analytics privacy leak, dead Import Contacts button). But it introduced new problems and left critical gaps. Here is what is still broken or missing.

---

## Scorecard

| Area | Score | Detail |
|------|-------|--------|
| **Provisioning → Setup Flow** | 72/100 | `provision-partner` correctly sets `force_password_change: true` and `account_status: 'active'`. `ProtectedRoute` correctly routes to `/partner-setup`. But the magic link redirects to `/partner-setup` which is registered as a **public route** (inside `PublicProviders`, no `ProtectedRoute` wrapper). This means `ProtectedRoute`'s `force_password_change` redirect will never fire for this path — only for partners who navigate to a protected route first. The flow only works because the magic link itself lands on `/partner-setup` directly, but if a partner bookmarks `/home` and comes back later with `force_password_change` still true, they'll correctly be caught. However: the **public** `/partner-setup` route has its own auth guard via `useEffect` — but this guard has a race condition. `useAuth()` may still be loading when the check fires, and `user.user_metadata?.force_password_change` is checked before the auth state settles. |
| **PartnerSetup.tsx** | 65/100 | Functional but fragile. (1) **No password breach check** — the page validates password format (12 char, upper, lower, number, symbol) but does NOT call the `password-reset-set-password` edge function which enforces HIBP breach checks and password history. It calls `supabase.auth.updateUser({ password })` directly, bypassing all security infrastructure. (2) **Avatar upload assumes `avatars` bucket exists** — no check, no error handling if the bucket doesn't exist or has wrong permissions. (3) **LinkedIn URL saved only on "Complete Setup"** — if the user fetches their avatar via LinkedIn but then refreshes, the LinkedIn URL is lost because it's only persisted in `handleCompleteSetup`, not during `handleFetchLinkedInAvatar`. (4) **No "back" navigation** from profile step to password step — partner can't go back if they realize they mistyped. (5) **`onboarding_completed_at` set synchronously** with the metadata clear — if the metadata update fails, the profile is already marked complete, and the partner will never be prompted to set a password again. These should be atomic or ordered correctly. |
| **Auth.tsx Partner Pre-fill** | 75/100 | `validate-invite-code` now returns `recipientName`, `recipientEmail`, `companyName`, `targetRole`. Auth.tsx correctly pre-fills `fullName` and `email` and shows partner-specific welcome copy. This works. But: (1) The `checkOnboardingStatus` effect (line 214-255) redirects authenticated users to `/oauth-onboarding` if they don't have `onboarding_completed_at` — this fires for ALL authenticated users, including partners who just signed up via invite code. A freshly signed-up partner will be redirected to `/oauth-onboarding` (candidate onboarding) instead of the partner welcome flow. The `ProtectedRoute` would catch this for protected routes, but the Auth.tsx redirect happens first and unconditionally. (2) Grammar bug on line 577: "invited you to join" should be "invited you to join" but the ternary produces "has invited you" — works, but the `recipientName` branch says "has invited you" without the referrer name preceding it when `referrerName` is null. |
| **SendInviteTab** | 80/100 | Good. Has name field, partner role, company name, duplicate detection, confetti, WhatsApp share, copy link. Issues: (1) **No rate limiting on invite sends** — a user can spam invites without throttling. (2) **Client-side invite code generation** — `crypto.randomUUID()` is fine for randomness but the code is predictable in format (12-char uppercase hex). Should use a more opaque format or generate server-side. (3) **`companyId` can be empty string** — line 115 falls back to `''` which is passed to `send-team-invite`. The edge function validates `body.companyId` is truthy (line 70), so an empty string will cause a 400 error. If the sender has no company, the invite will fail silently after the DB insert succeeds — orphaning the invite code. |
| **send-team-invite** | 78/100 | Partner domain bypass works. Personalized greeting works. Custom message block works. Partner sender works. Issues: (1) **`companyId` required** even for partner invites — but partners being invited may not have a company yet. The validation on line 70 demands `body.companyId` be truthy. (2) **EMAIL_SENDERS type cast** — line 178 casts to `Record<string, string>` which loses type safety. If `EMAIL_SENDERS.partners` doesn't exist, it silently falls back to `EMAIL_SENDERS.system` without logging. (3) **No retry on Resend API failure** — a single transient error means the email is lost forever. |
| **InviteStatsCards** | 85/100 | Fixed. Queries `invite_codes` scoped to current user. Derives status correctly from `is_active`, `uses_count`, `used_at`, `expires_at`. Uses `useQuery`. Minor: (1) Counts "pending" as `total - accepted - expired - revoked` which could go negative if data is inconsistent. (2) No error state — just shows skeleton forever if query fails. |
| **InviteAnalyticsTab** | 82/100 | Fixed. Scoped to current user. `useQuery` with typed state. Has error toast. Removed `created_by_type` filter. Minor: (1) `avgDaysToUse` uses `updated_at` as proxy for "accepted date" — unreliable because any profile update changes `updated_at`. Should use `used_at` if available. (2) No empty state differentiation between "no data" and "error". |
| **InviteHistoryTab** | 88/100 | Shows recipient name, copy link, resend, revoke. Good. Minor: (1) Resend fires `send-team-invite` but does NOT update `invite_codes.expires_at` — the code may have already expired, and resending doesn't extend it. (2) No confirmation dialog for revoke — one misclick destroys the invite permanently. |
| **InviteDashboardLayout** | 85/100 | Clean. Dead button removed. "Full Provisioning" button for elevated roles navigates to `/admin/companies`. Minor: could show a count badge on the History tab. |
| **fetch-linkedin-avatar** | 70/100 | Functional but: (1) **ProxyCurl costs ~$0.01-0.10 per call** — no rate limiting, no cost tracking. A user could spam the button. (2) **No validation that the user owns the LinkedIn profile** — any user can fetch any LinkedIn profile's photo and set it as their avatar. (3) **Fallback writes external LinkedIn URL directly to `profiles.avatar_url`** (line 141) — this URL will expire/break when LinkedIn rotates CDN tokens, leaving the partner with a broken avatar permanently. Should only store Supabase storage URLs. (4) **30-second Apify timeout** — the user sees a spinner for 30 seconds with no progress indication. |
| **validate-invite-code** | 90/100 | Returns metadata correctly. Rate limited. Logs security events. The metadata extraction (lines 131-146) correctly handles missing fields. Minor: makes a redundant second query to `invite_codes` for `target_role` (line 139-143) when it was already available from the first query — just didn't select that column. |
| **ProtectedRoute** | 90/100 | Correctly handles `force_password_change` for partners vs non-partners. Checks `account_status`. Enforces MFA for elevated roles. Clean. |

---

## Critical Bugs

### 1. **Password bypass — no HIBP/history check on PartnerSetup** (Security)
`PartnerSetup.tsx` line 80 calls `supabase.auth.updateUser({ password })` directly. This bypasses:
- HIBP breach database check (passwords appearing in data breaches)
- Password history check (last 5 passwords)
- Dictionary/pattern rejection ("Password123!")

The existing `password-reset-set-password` edge function enforces all of these. `PartnerSetup` should call that function instead of the raw auth API.

### 2. **Empty `companyId` breaks `send-team-invite`**
`SendInviteTab` line 115: if the sender has no company membership, `companyId` is `''`. This is passed to `send-team-invite` which validates `body.companyId` as truthy on line 70. Empty string is falsy → 400 error. But the invite code has already been inserted into the database (line 77-97 execute before the edge function call on line 118). Result: orphaned invite code in DB, no email sent, user sees "Invite created but email delivery failed" toast — but the invite is dead because it has no company association.

### 3. **LinkedIn avatar fallback stores expiring external URL**
`fetch-linkedin-avatar` line 141: if the storage upload fails, it falls back to writing the raw LinkedIn/ProxyCurl CDN URL to `profiles.avatar_url`. These URLs expire within hours/days. The partner's avatar will break silently.

### 4. **`onboarding_completed_at` before `force_password_change` clear — order-of-operations risk**
`PartnerSetup.tsx` line 162-171: `handleCompleteSetup` first updates `profiles.onboarding_completed_at`, then calls `supabase.auth.updateUser` to clear `force_password_change`. If the second call fails (network error, token expired), the profile is marked as onboarded but the metadata flag is still true. On next visit, `ProtectedRoute` will redirect to `/partner-setup` again (because `force_password_change` is still true), but `PartnerSetup` checks `force_password_change !== true` and redirects to `/home` — creating an infinite redirect loop (the `ProtectedRoute` sends them back to `/partner-setup` but the page itself sends them to `/home`, but `/home` is protected so `ProtectedRoute` sends them to `/partner-setup` again).

Wait — actually `PartnerSetup` line 45 redirects to `/home` if `force_password_change !== true`, and `ProtectedRoute` line 70-72 redirects to `/partner-setup` if `force_password_change === true`. So if the metadata clear fails, `force_password_change` remains true → `ProtectedRoute` keeps sending to `/partner-setup` → `PartnerSetup` sees `force_password_change === true` and stays. No infinite loop, but the partner is stuck on setup with `onboarding_completed_at` already set, and the "Complete Setup" button will try again. This is recoverable but not clean.

### 5. **`validate-invite-code` makes redundant DB query**
Lines 139-143 make a second query to `invite_codes` to get `target_role`, but the first query (line 61) already fetches `code, is_active, expires_at, used_by, used_at, created_by`. Just add `target_role` to the first `select` and eliminate the second query.

---

## Missing Features for 100/100

### 1. **No invite expiry extension on resend**
When a user clicks "Resend" in history, the email is re-sent but the `expires_at` on the invite code is NOT updated. If the invite was created 6 days ago with a 7-day expiry, resending gives the partner only 1 day to accept. Should extend `expires_at` by 7 days on resend.

### 2. **No revoke confirmation dialog**
One click revokes an invite permanently. Should have a confirmation dialog.

### 3. **No progress indicator for LinkedIn fetch**
The LinkedIn avatar fetch can take 15-30 seconds (ProxyCurl + Apify fallback). The user sees a small spinner on a button with no explanation. Should show a progress state with text like "Fetching your photo from LinkedIn…"

### 4. **No skeleton/loading state for Auth.tsx invite validation**
When a partner clicks an invite link, `validate-invite-code` is called asynchronously but there's no loading indicator during validation. The form appears instantly with no pre-fill, then the fields suddenly populate when validation completes — jarring.

### 5. **`send-team-invite` should not require `companyId` for partner invites**
Partners are external. They may not belong to any company yet. The edge function should make `companyId` optional when `role === 'partner'`.

### 6. **No audit log when partner completes setup**
`PartnerSetup.tsx` clears `force_password_change` and sets `onboarding_completed_at` but does not write to `comprehensive_audit_logs`. This is a gap in the audit trail for partner lifecycle events.

---

## Implementation Plan

### Phase 1: Security Fix (Critical)

| # | Task | Files |
|---|------|-------|
| 1 | **Route password setting through `password-reset-set-password` edge function** instead of raw `supabase.auth.updateUser` — this enforces HIBP check, history check, and dictionary rejection | `src/pages/PartnerSetup.tsx` |
| 2 | **Fix order of operations** — clear `force_password_change` metadata FIRST, then set `onboarding_completed_at`. If metadata clear fails, don't mark onboarding complete. | `src/pages/PartnerSetup.tsx` |

### Phase 2: Data Integrity Fixes

| # | Task | Files |
|---|------|-------|
| 3 | **Remove LinkedIn URL fallback** — if storage upload fails, return `avatarUrl: null` instead of writing an expiring external URL to profile | `supabase/functions/fetch-linkedin-avatar/index.ts` |
| 4 | **Make `companyId` optional for partner invites** in `send-team-invite` — skip the `companyId` check when `role === 'partner'` | `supabase/functions/send-team-invite/index.ts` |
| 5 | **Handle empty `companyId` in SendInviteTab** — pass `undefined` instead of `''` when user has no company | `src/components/invites/SendInviteTab.tsx` |
| 6 | **Eliminate redundant query in `validate-invite-code`** — add `target_role` to the first SELECT, remove the second query | `supabase/functions/validate-invite-code/index.ts` |

### Phase 3: UX Polish

| # | Task | Files |
|---|------|-------|
| 7 | **Extend `expires_at` on resend** — when resending from history, update `invite_codes.expires_at` to 7 days from now | `src/components/invites/InviteHistoryTab.tsx` |
| 8 | **Add confirmation dialog for revoke** — use existing AlertDialog component | `src/components/invites/InviteHistoryTab.tsx` |
| 9 | **Add loading state for invite validation on Auth.tsx** — show a skeleton/spinner while `validate-invite-code` is in-flight | `src/pages/Auth.tsx` |
| 10 | **Better LinkedIn fetch progress** — show a dedicated loading state with descriptive text instead of just a button spinner | `src/pages/PartnerSetup.tsx` |
| 11 | **Persist LinkedIn URL during avatar fetch** — save `linkedin_url` to profile immediately when fetching, not just on "Complete Setup" | `src/pages/PartnerSetup.tsx` |
| 12 | **Add audit log entry when partner completes setup** — write to `comprehensive_audit_logs` with `event_type: 'partner_setup_completed'` | `src/pages/PartnerSetup.tsx` |
| 13 | **Negative pending count guard** — clamp pending to `Math.max(0, ...)` in `InviteStatsCards` | `src/components/invites/InviteStatsCards.tsx` |

### Files to Edit

| File | Changes |
|------|---------|
| `src/pages/PartnerSetup.tsx` | Use `password-reset-set-password` edge function; fix operation order; persist LinkedIn URL early; audit log; loading states |
| `supabase/functions/fetch-linkedin-avatar/index.ts` | Remove external URL fallback |
| `supabase/functions/send-team-invite/index.ts` | Make `companyId` optional for partner role |
| `supabase/functions/validate-invite-code/index.ts` | Add `target_role` to first query, remove second query |
| `src/components/invites/SendInviteTab.tsx` | Pass `undefined` instead of `''` for empty companyId |
| `src/components/invites/InviteHistoryTab.tsx` | Extend expiry on resend; add revoke confirmation |
| `src/pages/Auth.tsx` | Add invite validation loading state |
| `src/components/invites/InviteStatsCards.tsx` | Clamp negative pending |

### No database changes needed.

