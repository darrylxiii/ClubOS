

# Password Reset and Create Password System -- Full Audit

## Current Score: 22/100

The database proves it: **8 tokens created, 0 ever completed successfully.** Every single user who tried to reset their password failed. Here is every issue found, ranked by severity, followed by the fix plan.

---

## CRITICAL BUGS (System completely broken)

### BUG 1: `APP_URL` secret is missing -- every magic link is dead
- **Where**: `supabase/functions/password-reset-request/index.ts`, line 144
- **What**: The `APP_URL` environment variable is NOT configured (confirmed: not in the 37 secrets). The fallback is `"https://thequantumclub.app"` -- a domain that does not exist.
- **Result**: Every reset email contains a magic link pointing to a dead URL. 100% of magic link clicks fail with a browser error.
- **Fix**: Add `APP_URL` secret with value `https://thequantumclub.lovable.app` (or the custom domain once active).

### BUG 2: ForgotPassword page never navigates to OTP entry
- **Where**: `src/pages/ForgotPassword.tsx`, line 56
- **What**: After successfully requesting a reset, the page shows "Check your email" with only a "Back to Login" button. It never navigates to `/reset-password/verify?email=...`.
- **Result**: Users who receive the OTP code have nowhere to enter it. The OTP verification page exists (`/reset-password/verify`) but is unreachable from the normal flow.
- **Fix**: After success, show an "Enter Code" button that navigates to `/reset-password/verify?email=${encodeURIComponent(email)}`, or navigate automatically.

### BUG 3: SetPasswordModal (Create Password) has the same dead end
- **Where**: `src/components/auth/SetPasswordModal.tsx`, line 47
- **What**: Same issue as BUG 2 -- after sending, shows "Check email" with only a "Back to Login" button. No way to enter the OTP code.
- **Result**: OAuth users who want to create a password can never complete the flow.
- **Fix**: Add navigation to OTP verification page after success.

### BUG 4: validate-token never marks token as used (replay vulnerability)
- **Where**: `supabase/functions/password-reset-validate-token/index.ts`
- **What**: When a user clicks the magic link, the function validates the token exists and is unused, returns `valid: true`, but never updates `is_used = true`.
- **Result**: The same magic link can be used unlimited times within the 10-minute window. Anyone who intercepts the link can use it repeatedly.
- **Fix**: Mark token as used immediately after validation, or transition to a short-lived session token.

### BUG 5: OTP brute-force protection is non-functional
- **Where**: `supabase/functions/password-reset-validate-otp/index.ts`, line 64
- **What**: The function checks `token.attempts >= 5` but never increments the `attempts` column on failed tries. The column stays at 0 forever (confirmed: all 8 tokens in DB have `attempts: 0`).
- **Result**: An attacker can try all 900,000 OTP combinations with no lockout. The 5-attempt limit is cosmetic only.
- **Fix**: Increment `attempts` on every failed OTP try before returning the error response.

---

## HIGH SEVERITY ISSUES

### ISSUE 6: OTP codes logged in plaintext
- **Where**: `password-reset-request/index.ts` line 121, `password-reset-validate-otp/index.ts` line 29
- **What**: Full OTP codes are written to edge function logs: `Token generation - Magic: bc6602db..., OTP: 861449` and `OTP Validation - Email: x@y.com, OTP: 861449`
- **Result**: Anyone with log access can see active OTP codes.
- **Fix**: Remove OTP values from all log statements.

### ISSUE 7: User lookup iterates all users via pagination
- **Where**: `password-reset-request/index.ts`, lines 82-111
- **What**: Uses `auth.admin.listUsers()` in a while-loop, paginating 1000 users at a time to find one email. For 10,000 users this means 10 API calls.
- **Result**: Slow, expensive, and can timeout on larger user bases.
- **Fix**: Use a direct query or `auth.admin.getUserByEmail()` if available, or query the profiles table.

### ISSUE 8: No session invalidation after password change
- **Where**: `password-reset-set-password/index.ts`
- **What**: The confirmation email says "all active sessions have been logged out" (line 74 of send-password-changed-email) but the code never calls `auth.admin.signOut()` or invalidates sessions.
- **Result**: If an account was compromised, the attacker's existing sessions remain active after the victim changes their password. The email is misleading.
- **Fix**: Call `supabase.auth.admin.signOut(userId, 'global')` before sending the confirmation email.

### ISSUE 9: set-password accepts tokens that were never single-use validated
- **Where**: `password-reset-set-password/index.ts`, lines 43-49
- **What**: The query fetches tokens by `magic_token` where `expires_at > now()` but does NOT filter on `is_used = false` for the magic link path. It allows `is_used = true` tokens if `used_at` is within 15 minutes (designed for the OTP flow). But since validate-token never marks tokens as used (BUG 4), the magic link path effectively bypasses single-use enforcement entirely.
- **Result**: Combined with BUG 4, tokens are reusable indefinitely within their 10-minute expiry.
- **Fix**: The validate-token function should mark the token as used, and set-password should only accept tokens that are properly marked.

---

## MEDIUM SEVERITY ISSUES

### ISSUE 10: Client-side timer is cosmetic
- **Where**: `src/pages/ResetPasswordVerify.tsx`, line 20
- **What**: A 10-minute countdown runs in the browser but has no relation to the actual server-side token expiry. Navigating away and back resets it to 10:00.
- **Fix**: Pass the token creation timestamp from the server, or fetch remaining time.

### ISSUE 11: Client-side attempts counter is cosmetic
- **Where**: `src/pages/ResetPasswordVerify.tsx`, line 74
- **What**: `attemptsRemaining` is decremented client-side (`attemptsRemaining - 1`) but the server never returns actual remaining attempts (because it never increments them -- BUG 5).
- **Fix**: After fixing BUG 5, return actual remaining attempts from the server.

### ISSUE 12: No old-token invalidation on resend
- **Where**: `password-reset-request/index.ts`
- **What**: When a user requests a new reset code (resend), the old tokens remain valid. Multiple active tokens can exist simultaneously for the same user.
- **Fix**: Invalidate (mark as used) all existing unused tokens for the email before creating a new one.

---

## FIX PLAN (Priority Order)

### Step 1: Add `APP_URL` secret
Set `APP_URL` to `https://thequantumclub.lovable.app` so magic links point to the correct domain.

### Step 2: Fix ForgotPassword.tsx navigation
After success, add an "Enter Code" button that navigates to `/reset-password/verify?email=${email}`. Keep the magic link path as a secondary option.

### Step 3: Fix SetPasswordModal.tsx navigation
Same as Step 2 -- after sending, provide a path to the OTP entry page.

### Step 4: Fix validate-token to mark token as used
After confirming the token is valid, update `is_used = true` and `used_at = now()` before returning success.

### Step 5: Fix OTP attempt counter
In `password-reset-validate-otp`, increment `attempts` on every failed OTP try:
```sql
UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE id = token.id
```

### Step 6: Remove OTP/token values from logs
Replace all `console.log` lines that output OTP codes or magic tokens with redacted versions.

### Step 7: Fix user lookup performance
Replace the pagination loop with a direct query against the profiles table or a single admin API call.

### Step 8: Add session invalidation after password change
Call `supabase.auth.admin.signOut(userId, 'global')` in `password-reset-set-password` before the success response.

### Step 9: Invalidate old tokens on resend
Before inserting a new token, mark all existing unused tokens for that email as `is_used = true`.

### Step 10: Fix set-password token validation logic
Enforce single-use properly: for the magic-link path, require `is_used = true` (set by validate-token) with `used_at` within 15 minutes. For the OTP path, `is_used = true` (set by validate-otp) with the same window.

### Files to modify:
- `supabase/functions/password-reset-request/index.ts` -- user lookup, logging, old token invalidation
- `supabase/functions/password-reset-validate-token/index.ts` -- mark token as used
- `supabase/functions/password-reset-validate-otp/index.ts` -- increment attempts, fix logging
- `supabase/functions/password-reset-set-password/index.ts` -- session invalidation, token validation logic
- `src/pages/ForgotPassword.tsx` -- add OTP navigation
- `src/components/auth/SetPasswordModal.tsx` -- add OTP navigation

### Target Score After Fixes: 92/100
The remaining 8 points would require: CAPTCHA on the forgot-password form, server-synced countdown timer, IP-based anomaly detection, and a full penetration test. These are future enhancements.
