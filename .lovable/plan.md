

# Partner Password & Account Creation Audit — Round 4

## Score: 91/100

---

## What works well (+91)

| Area | Score |
|------|-------|
| PartnerSetup password flow (`updateUser({ password })`, Timo bug fixed) | +15 |
| ProtectedRoute gating chain (onboarding → status → MFA → force_password_change) | +12 |
| approve-partner-request (JWT, rollback, company guard, audit, magic link) | +15 |
| consume-invite (role, company, auto-approve, force_password_change, audit) | +12 |
| Auth.tsx (invite retry on first login, partner-specific UI copy) | +8 |
| TeamInviteStep (correct payload, company fetch, invite_codes insert, per-invite send) | +8 |
| validate-invite-code (rate-limited, shared CORS, .maybeSingle, metadata pre-fill) | +6 |
| PartnerWelcome (onboarding_completed_at guard, logger.error, activation event) | +5 |
| send-team-invite (domain validation, partner bypass, branded email, audit) | +5 |
| PartnerHome (conditional setup/no-company cards) | +3 |
| PendingApproval (realtime + polling, role-aware) | +2 |

---

## Issues found (-9)

### 1. Auth.tsx consume-invite retry doesn't refresh session (-4)

**File:** `src/pages/Auth.tsx` lines 258-261

When the retry `consume-invite` succeeds on first login, it sets `force_password_change: true` server-side via `admin.updateUserById`. But the local session still has `force_password_change` as `undefined`. The code falls through to line 285, sees `onboarding_completed_at` is null, and routes the partner to `/oauth-onboarding` (candidate flow).

**Fix:** After successful consume-invite retry, call `await supabase.auth.refreshSession()` and re-read `user.user_metadata`. If `force_password_change === true`, navigate to `/partner-setup` and return early.

### 2. No password strength indicator in AssistedPasswordConfirmation (-3)

**File:** `src/components/ui/assisted-password-confirmation.tsx`

The component shows character-matching feedback but gives zero guidance on requirements (12+ chars, uppercase, lowercase, number, symbol, no common patterns). The `validatePasswordStrength` utility exists in `src/utils/passwordReset.ts` but is unused. Partners setting passwords see no real-time feedback until they click "Continue" and get a generic toast.

Additionally, `PartnerSetup.tsx` uses a basic Zod schema (line 23) that skips the `noCommonPattern` check from `validatePasswordStrength`. A partner could set "Password1234!" which passes Zod but should fail.

**Fix:** 
- Add a strength indicator to `AssistedPasswordConfirmation` using `validatePasswordStrength` — show requirement checklist when `password.length > 0`
- Replace Zod validation in `PartnerSetup.handleSetPassword` with `validatePasswordStrength`

### 3. Auth.tsx "For Partners" navigates to nonexistent route (-2)

**File:** `src/pages/Auth.tsx` line 808

Navigates to `/partner-request` — this route does not exist in App.tsx. The public partner funnel is at `/partner`. This will 404.

**Fix:** Change `navigate('/partner-request')` to `navigate('/partner')`.

---

## Fixes to reach 100/100

### Fix 1: Session refresh after consume-invite retry
In `Auth.tsx` after `consumeResult?.success` (line 258), add:
```typescript
await supabase.auth.refreshSession();
const { data: { user: refreshedUser } } = await supabase.auth.getUser();
if (refreshedUser?.user_metadata?.force_password_change === true) {
  navigate('/partner-setup');
  return;
}
```

### Fix 2: Password strength indicator + validation upgrade
- Add `validatePasswordStrength` import to `AssistedPasswordConfirmation`
- Render a requirement checklist (6 items with check/x icons) below the password input when `password.length > 0`
- Show a strength bar (weak/medium/strong with colors)
- In `PartnerSetup.handleSetPassword`, replace Zod `passwordSchema.parse()` with `validatePasswordStrength(password)` and show specific missing requirements

### Fix 3: Fix "For Partners" route
Change `navigate('/partner-request')` → `navigate('/partner')` in Auth.tsx line 808.

---

### Files to modify

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Refresh session after consume-invite retry; fix `/partner-request` → `/partner` |
| `src/components/ui/assisted-password-confirmation.tsx` | Add strength indicator using `validatePasswordStrength` |
| `src/pages/PartnerSetup.tsx` | Replace Zod with `validatePasswordStrength` in `handleSetPassword` |

