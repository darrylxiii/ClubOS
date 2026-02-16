

# Fix: Password Reset Flow -- Complete Fix for All Edge Functions

## Problem

Jasper reached the "Create New Password" page, filled in a valid password, and clicked "Reset Password." The call to `password-reset-set-password` fails with "Edge function returned a non-2xx code" because of two issues:

1. **CORS headers are outdated** on `password-reset-set-password` and `password-reset-validate-otp` -- the same missing `x-application-name` and Supabase client headers that were already fixed on the other two functions.

2. **Token already marked as used** -- The OTP verification step (`password-reset-validate-otp`) marks the token `is_used = true` on line 80-86. Then when `password-reset-set-password` tries to look up that same token, it filters by `is_used = false` (line 48), finds nothing, and returns a 400 "Invalid or expired token." This is a logic bug: the OTP step consumes the token before the password-set step can use it.

## Root Cause Summary

```text
Flow:  Email --> OTP Page --> Verify OTP --> Create Password Page --> Set Password
                              |                                      |
                              sets is_used = true                    queries is_used = false
                              (validate-otp, line 82)                (set-password, line 48)
                                                                     --> FINDS NOTHING --> 400 error
```

## Fixes (3 files)

### 1. `supabase/functions/password-reset-set-password/index.ts`

**CORS fix (line 8):** Update the `Access-Control-Allow-Headers` to include all Supabase client headers:

```
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-application-name"
```

**Token lookup fix (line 48):** Remove the `.eq('is_used', false)` filter so the set-password function can find the token that was already validated by the OTP step. Instead, add a check that the token was used recently (within 15 minutes) to maintain security:

```typescript
// Before (broken):
.eq('magic_token', token)
.eq('is_used', false)
.gt('expires_at', new Date().toISOString())

// After (fixed):
.eq('magic_token', token)
.gt('expires_at', new Date().toISOString())
```

Then after fetching, add a guard: if the token `is_used` is true but `used_at` is older than 15 minutes, reject it. This allows the normal flow (OTP validates, then password is set within minutes) while still blocking stale reuse.

Also remove the second "mark token as used" block (lines 127-133) since it was already marked by the OTP step. Instead, just update `used_at` to the current time so the audit trail reflects when the password was actually set.

### 2. `supabase/functions/password-reset-validate-otp/index.ts`

**CORS fix (line 7):** Same header update as above.

**Token logic fix (lines 80-86):** Instead of marking the token as fully `is_used = true`, just record the OTP verification timestamp without consuming the token. Change to:

```typescript
// Mark OTP as verified but keep token usable for password-set step
.update({
  otp_verified_at: new Date().toISOString()
})
```

However, since `otp_verified_at` may not exist as a column, the simpler approach: keep `is_used = true` as-is (it is fine for preventing OTP reuse), and fix the set-password side to accept used tokens as described above.

**Final approach for validate-otp:** Keep existing logic unchanged, just fix CORS.

### 3. `supabase/functions/send-password-changed-email/index.ts`

**CORS fix (line 11):** Same header update. This function is called server-to-server from `set-password`, but the fix is preventive for consistency.

## Summary of Changes

| File | What Changes |
|---|---|
| `supabase/functions/password-reset-set-password/index.ts` | Fix CORS headers. Fix token lookup to allow tokens marked used by OTP step (remove `is_used = false` filter, add 15-min window check). |
| `supabase/functions/password-reset-validate-otp/index.ts` | Fix CORS headers. |
| `supabase/functions/send-password-changed-email/index.ts` | Fix CORS headers (preventive). |

All three functions are then redeployed.

## Why This Fully Fixes It

1. CORS allows the browser request through.
2. The token lookup finds the token even after OTP verification consumed it.
3. The 15-minute window ensures stale tokens cannot be abused.
4. The confirmation email sends successfully with consistent CORS.

After these fixes, Jasper can complete the full flow: enter email, receive code, verify OTP, create password, get confirmation email.
