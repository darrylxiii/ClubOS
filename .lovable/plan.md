

# Full Partner Onboarding System Audit

## Score: 82/100

---

## What works well (+82)

| Area | Score | Notes |
|------|-------|-------|
| PartnerSetup password flow | +15 | Uses `supabase.auth.updateUser({ password })` — Timo's bug is fixed |
| ProtectedRoute gating | +12 | Correct ordering: onboarding → status → MFA → force_password_change |
| approve-partner-request | +15 | JWT auth, rollback, company-required guard, audit trail, magic link, welcome email |
| consume-invite flow | +10 | Role assignment, company_members, auto-approval for partners, schema-compliant audit |
| PendingApproval page | +10 | Realtime subscription + 60s polling fallback, role-aware UI |
| PartnerSetup UX | +8 | 3-step flow, LinkedIn avatar, session refresh after completion |
| PartnerHome conditional | +5 | `needsSetup` check prevents broken redirect loop |
| Welcome email | +4 | Branded, magic link, onboarding checklist |
| Auth invite pre-fill | +3 | `validate-invite-code` pre-fills name/email/company for partner invites |

---

## Issues found (-18)

### 1. `consume-invite` race condition on signup (-5)

When a partner signs up via invite on `Auth.tsx` line 426-439, `consume-invite` is called immediately after `signUp()`. But if email confirmation is required (auto-confirm is off), `authData.session` is null and the user has no JWT yet. The `consume-invite` edge function requires `Authorization: Bearer <token>` (line 24-39). Since `supabase.functions.invoke` sends the current session token and there IS no session, this call **silently fails with 401**.

The invite code is never consumed. When the user later verifies their email and logs in, there's no retry mechanism — the code sits unconsumed, and the partner gets no role, no company, and lands on candidate onboarding.

**Fix:** Store the invite code in `user_metadata` during signup (already done on line 411). After email verification and first login, detect `user_metadata.invite_code` and call `consume-invite` if the user has no roles assigned yet. Add this check to `Auth.tsx`'s `checkOnboardingStatus` effect.

### 2. `validate-invite-code` uses deprecated patterns (-3)

- Uses `serve()` from `deno.land/std@0.168.0` instead of `Deno.serve()` (line 1)
- Uses inline CORS headers missing `x-application-name` and `Access-Control-Allow-Methods` (line 6-9) instead of shared `corsHeaders`
- Uses `.single()` on line 68 (should be `.maybeSingle()` — throws on not-found instead of returning null gracefully)

### 3. `PartnerWelcome` checks `provisioned_by` — excludes invite-based partners (-3)

`PartnerWelcome.tsx` line 51 checks `if (!profile?.provisioned_by)` and redirects to `/home`. Partners who sign up via invite code (not admin-provisioned) will have `provisioned_by = null`. They'll never see the welcome page. The check should also accept invite-based partners (e.g., check if onboarding is incomplete OR if the user was recently created).

**Fix:** Change the guard to check `onboarding_completed_at` instead. If onboarding is done, redirect to `/partner`. If not, show the welcome page regardless of provisioning method.

### 4. `PartnerWelcome` uses `console.error` instead of `logger.error` (-1)

Lines 99 and 131 use `console.error`. Should use `logger.error` per project standards.

### 5. No `TeamInviteStep` in PartnerSetup (-4)

Per memory, the partner setup flow should include a skippable `TeamInviteStep` allowing partners to invite up to 10 colleagues (Admin/Recruiter/Member) before entering the portal. This component doesn't exist anywhere in the codebase. The step indicator shows 3 steps (password → profile → complete) but should be 4 (password → profile → team → complete).

### 6. `Auth.tsx` doesn't differentiate partner signup copy (-2)

When a partner validates an invite with `targetRole: 'partner'`, the Auth page shows the same signup form as candidates. Per memory, it should show partner-specific welcome copy (e.g., "Set up your partnership account" instead of the generic signup header). The `inviteInfo.targetRole` is available but unused in the UI.

---

## Fixes to reach 100/100

### Fix 1: Retry `consume-invite` after email verification
In `Auth.tsx` `checkOnboardingStatus` effect, after confirming the user has a session, check `user.user_metadata?.invite_code`. If present AND the user has no roles in `user_roles`, call `consume-invite` with that code. This handles the case where the initial call failed due to no session.

### Fix 2: Modernize `validate-invite-code`
- Replace `serve()` with `Deno.serve()`
- Import shared `corsHeaders` from `../_shared/cors.ts`
- Replace `.single()` with `.maybeSingle()` on line 68

### Fix 3: Fix `PartnerWelcome` guard
Replace the `provisioned_by` check with an `onboarding_completed_at` check. Show the welcome page for any partner (provisioned or invite-based) who hasn't completed onboarding.

### Fix 4: Replace `console.error` with `logger.error` in `PartnerWelcome`

### Fix 5: Build `TeamInviteStep` component
Create a skippable step in `PartnerSetup` between "profile" and "complete" that lets partners invite up to 10 colleagues via email + role picker. Uses the existing `send-team-invite` edge function.

### Fix 6: Partner-specific Auth copy
When `inviteInfo?.targetRole === 'partner'`, show "Set up your partnership account" heading and a Building2 icon instead of the generic signup copy.

---

### Files to modify

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Retry consume-invite on first login; partner-specific copy |
| `supabase/functions/validate-invite-code/index.ts` | Deno.serve(), shared CORS, .maybeSingle() |
| `src/pages/PartnerWelcome.tsx` | Fix guard to use onboarding_completed_at; logger.error |
| `src/pages/PartnerSetup.tsx` | Add TeamInviteStep as step 3 of 4 |
| `src/components/partner-setup/TeamInviteStep.tsx` | **New** — skippable team invite UI |

