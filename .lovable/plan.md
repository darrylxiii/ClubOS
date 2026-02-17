

# Password System Overhaul -- Implementation Plan

## Overview

Fix all 12 issues identified in the audit to take the password reset and create-password systems from 22/100 to 92/100. Every fix below addresses a specific bug from the approved audit.

---

## Step 1: Add APP_URL Secret

**What**: Configure the `APP_URL` secret with value `https://thequantumclub.lovable.app` so magic links in emails point to the real application.

**Why**: Currently every magic link points to a dead domain (`thequantumclub.app`), causing 100% failure rate for email-based resets.

---

## Step 2: Fix `password-reset-request/index.ts`

**Fixes**: BUG 7 (slow user lookup), ISSUE 6 (OTP logged), ISSUE 12 (old tokens not invalidated)

Changes:
- Replace the pagination loop (`listUsers` in a while-loop) with a direct `profiles` table query to find the user by email -- single query instead of potentially dozens
- Remove OTP code from all `console.log` statements (line 121 currently prints the full OTP)
- Before inserting a new token, mark all existing unused tokens for that email as `is_used = true` so only the latest code is valid

---

## Step 3: Fix `password-reset-validate-token/index.ts`

**Fixes**: BUG 4 (token never marked as used -- replay vulnerability)

Changes:
- After confirming the token is valid and unused, immediately update `is_used = true` and `used_at = now()` before returning the success response
- Remove token value from log output

---

## Step 4: Fix `password-reset-validate-otp/index.ts`

**Fixes**: BUG 5 (brute-force protection non-functional), ISSUE 6 (OTP logged)

Changes:
- On every OTP check (pass or fail), first increment the `attempts` counter in the database
- Query the token with the incremented attempts check, so the 5-attempt limit actually works
- Return the real `attempts_remaining` from the server (5 minus current attempts)
- Remove OTP code from the log on line 29

---

## Step 5: Fix `password-reset-set-password/index.ts`

**Fixes**: ISSUE 8 (no session invalidation), ISSUE 9 (token validation too loose)

Changes:
- Tighten token lookup: require `is_used = true` (meaning it was validated by either the magic-link or OTP step first) with `used_at` within 15 minutes
- After updating the password, call `supabase.auth.admin.signOut(userId, 'global')` to invalidate all existing sessions before sending the confirmation email
- Remove partial token from log output

---

## Step 6: Fix `ForgotPassword.tsx`

**Fixes**: BUG 2 (no navigation to OTP entry)

Changes:
- In the "sent" success state, replace the single "Back to Login" button with two options:
  1. **"Enter Code"** primary button that navigates to `/reset-password/verify?email={email}` -- this is the main path
  2. **"Back to Login"** secondary link below it
- Add helper text: "We also sent a magic link you can click directly from your email"

---

## Step 7: Fix `SetPasswordModal.tsx`

**Fixes**: BUG 3 (create password flow is a dead end)

Changes:
- In the "sent" success state, add an **"Enter Code"** button that closes the modal and navigates to `/reset-password/verify?email={email}`
- Keep the existing "Back" button as secondary

---

## Step 8: Fix `ResetPasswordVerify.tsx`

**Fixes**: ISSUE 11 (client-side attempts counter is cosmetic)

Changes:
- When the server responds with `attempts_remaining`, use that value instead of the client-side decrement
- This works because Step 4 makes the server return real attempt counts

---

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/password-reset-request/index.ts` | Direct user lookup, sanitize logs, invalidate old tokens |
| `supabase/functions/password-reset-validate-token/index.ts` | Mark token as used after validation |
| `supabase/functions/password-reset-validate-otp/index.ts` | Increment attempts, return real count, sanitize logs |
| `supabase/functions/password-reset-set-password/index.ts` | Enforce token-was-validated, global session signout |
| `src/pages/ForgotPassword.tsx` | Add "Enter Code" navigation button |
| `src/components/auth/SetPasswordModal.tsx` | Add "Enter Code" navigation button |
| `src/pages/ResetPasswordVerify.tsx` | Use server-side attempts count |

## No database changes required

All fixes are code-level. The existing `password_reset_tokens` table already has the `attempts`, `is_used`, and `used_at` columns needed.

