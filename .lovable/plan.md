

# Deep System Audit — Round 6

## Score: 93/100

---

## What works well (+93)

The partner password flow, invite consumption, force_password_change lifecycle, PartnerSetup, ProtectedRoute gating, session refresh, and password validation are all solid. Previous rounds resolved all critical and medium issues.

---

## Issues found (-7)

### 1. CRITICAL: Non-partner `force_password_change` users hit redirect loop (-4)

**File:** `src/components/ProtectedRoute.tsx` line 72, `src/pages/ResetPasswordNew.tsx` line 31-35

When an admin force-resets a **non-partner** user's password via `admin-force-password-reset`, the user gets `force_password_change: true` in their metadata. On next login:

1. `ProtectedRoute` line 72: `isPartnerForceSetup` is false → redirects to `/reset-password/new`
2. `ResetPasswordNew` line 32: checks `searchParams.get('token')` → it's `null` (no token was provided — this is a force-reset, not a forgot-password flow)
3. Line 33-34: redirects to `/forgot-password`
4. User logs in again → back to step 1 → **infinite redirect loop**

The `ResetPasswordNew` page was designed for the forgot-password flow (token-based). It cannot handle the force-password-change flow which is session-based.

**Fix:** Create a dedicated `/change-password` page (or adapt `ResetPasswordNew`) for force-password-change users. This page should:
- Check `user.user_metadata?.force_password_change === true` as its auth guard (no token needed)
- Use `supabase.auth.updateUser({ password })` (same as PartnerSetup)
- Clear `force_password_change` after success
- Redirect to `/home`

Update `ProtectedRoute` line 72 to route non-partners to `/change-password` instead of `/reset-password/new`.

### 2. PartnerWelcome navigates to `/partner` which is the public PartnerFunnel page (-2)

**File:** `src/pages/PartnerWelcome.tsx` lines 55, 122

After completing onboarding, `PartnerWelcome` navigates to `/partner`. But in `App.tsx` line 233-239, `/partner` is a **public** route that renders `PartnerFunnel` (the partner request form). The actual partner dashboard is at `/partner/hub`.

An authenticated partner completing onboarding lands on the public "Request Partnership" form instead of their dashboard.

**Fix:** Change `navigate('/partner')` to `navigate('/partner/hub')` in PartnerWelcome lines 55 and 122.

### 3. `AssistedPasswordConfirmation` password input is hidden when `showPasswordInput` is false (-1)

**File:** `src/components/ui/assisted-password-confirmation.tsx` line 115-122

When `showPasswordInput` is `false` (the default, used in Auth.tsx signup and ResetPasswordNew), the password `<input>` is still rendered but the `onPasswordChange` prop is optional. In Auth.tsx line 779, `onPasswordChange` is `setPassword` so this works. But the component's password input has no `id` or `aria-label`, and when `showPasswordInput` is false the character-matching overlay obscures the input — purely a UX/a11y issue, not a functional bug.

**Fix:** Add `id="password-input"` and `aria-label="Password"` to the password input. Add `id="confirm-password-input"` and `aria-label="Confirm password"` to the confirmation input.

---

## Implementation Plan

### Fix 1: Create `/change-password` page for force-password-change users

Create `src/pages/ChangePassword.tsx`:
- Session-based (no token) — guard with `user.user_metadata?.force_password_change === true`
- Reuse `AssistedPasswordConfirmation` with `showPasswordInput` and `validatePasswordStrength`
- Call `supabase.auth.updateUser({ password })` on submit
- Clear `force_password_change` via `supabase.auth.updateUser({ data: { force_password_change: false } })`
- Refresh session and redirect to `/home`

Add route in `App.tsx` under the public/semi-public routes (like `/partner-setup`).

Update `ProtectedRoute.tsx` line 72: change `/reset-password/new` to `/change-password`.

### Fix 2: Fix PartnerWelcome navigation target

In `src/pages/PartnerWelcome.tsx`:
- Line 55: `navigate('/partner')` → `navigate('/partner/hub')`
- Line 122: `navigate('/partner')` → `navigate('/partner/hub')`

### Fix 3: Add a11y attributes to AssistedPasswordConfirmation

In `src/components/ui/assisted-password-confirmation.tsx`:
- Add `id` and `aria-label` to both inputs

---

### Files to modify/create

| File | Change |
|------|--------|
| `src/pages/ChangePassword.tsx` | **NEW** — force-password-change page for non-partner users |
| `src/App.tsx` | Add `/change-password` route |
| `src/components/ProtectedRoute.tsx` | Route non-partners to `/change-password` instead of `/reset-password/new` |
| `src/pages/PartnerWelcome.tsx` | Fix navigation from `/partner` to `/partner/hub` |
| `src/components/ui/assisted-password-confirmation.tsx` | Add a11y attributes |

