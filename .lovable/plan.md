

# Password Reset System -- Full Audit Report

## Executive Summary

**The password reset system has never successfully completed a single password change.** Out of 8 tokens created across multiple users (sean@riifiidesign.com, darryl@thequantumclub.nl, jasper@thequantumclub.nl, adrian.pg@icloud.com, jnieuwenhuizen@qualogy.com), all 8 remain unused. The password_history table has 0 records. Every user who attempted to reset their password has failed.

---

## Critical Bugs (system-breaking)

### BUG 1: Magic link token is consumed on validation, then rejected on password set

**Severity: CRITICAL -- breaks 100% of magic link resets**

The magic link flow is:
1. User clicks link in email -> `/reset-password/verify-token?token=abc`
2. `ResetPasswordMagicLink.tsx` calls `password-reset-validate-token` which **marks the token as `is_used = true`** (line 62-66 of validate-token)
3. Then redirects to `/reset-password/new?token=abc`
4. `ResetPasswordNew.tsx` calls `password-reset-set-password` which looks for tokens where **`is_used = true` AND `used_at` within 15 minutes** (line 47-53 of set-password)

The problem: `validate-token` sets `is_used = true` and `used_at = now()`, then `set-password` looks for tokens with `is_used = true` and `used_at > 15 minutes ago`. This should work in theory, BUT: the `validate-token` function does NOT return the `magic_token` value back to the frontend. Look at `ResetPasswordMagicLink.tsx` line 41:

```typescript
navigate(`/reset-password/new?token=${token}`, { replace: true });
```

It passes the same `token` from the URL, which IS the `magic_token`. So `set-password` queries by `magic_token = token` AND `is_used = true`. This should match... **unless the token was already invalidated by a prior request or the 10-minute expiry already passed by the time the user opens the email.**

Actually, looking again more carefully: this flow should work. The real issue is more subtle -- see Bug 2.

### BUG 2: OTP validation marks token as used, then set-password cannot find it

**Severity: CRITICAL -- breaks 100% of OTP resets**

The OTP flow:
1. User enters 6-digit code on `/reset-password/verify`
2. `password-reset-validate-otp` is called, which on success:
   - Marks the token as `is_used = true`, `used_at = now()` (lines 126-132)
   - Returns `{ success: true, reset_token: token.magic_token }` (line 144)
3. Frontend navigates to `/reset-password/new?token=${data.reset_token}`
4. `password-reset-set-password` looks for token with `magic_token = token` AND `is_used = true` AND `used_at > 15 min ago`

This should work... BUT look at `password-reset-request` lines 137-142:

```typescript
// FIX ISSUE 12: Invalidate all existing unused tokens for this email
await supabaseAdmin
  .from('password_reset_tokens')
  .update({ is_used: true, used_at: new Date().toISOString() })
  .eq('email', email.toLowerCase())
  .eq('is_used', false);
```

When a user clicks "Resend Code" on the verify page (line 99 of ResetPasswordVerify.tsx), it calls `password-reset-request` again, which **invalidates all existing tokens** before creating a new one. But the frontend still holds the OLD timer state. After resend, the user gets a NEW OTP, but if they had already tried the old one, the attempts counter is on the OLD (now invalidated) token. The new token has 0 attempts. This part is actually fine.

**The real critical bug**: Looking at the database data, ALL 8 tokens have `is_used = false`. This means neither `validate-token` nor `validate-otp` was ever successfully called. The tokens are expiring (10 minutes) before users complete the flow, OR the edge functions are failing silently.

### BUG 3: User lookup fallback paginates all auth users

**Severity: HIGH -- causes timeouts for large user bases**

In `password-reset-request` lines 100-131, if the profile lookup fails, it falls back to paginating through ALL auth users (1000 at a time) to find a match. This is extremely slow and can timeout the edge function. The "fix" comment says "Direct profile lookup instead of paginating" but the fallback pagination is still there.

### BUG 4: Rate limit logs success even for non-existent users

**Severity: MEDIUM -- pollutes rate limit data**

Line 219-224 of `password-reset-request`: the success attempt is logged AFTER the user lookup, but regardless of whether a user was found. This means requests for non-existent emails count toward the rate limit window, which is correct for security (prevents enumeration), but the `success: true` flag is misleading. The rate limit function counts ALL attempts in the last 15 minutes (max 3 per email), so a legitimate user who typos their email 3 times gets locked out for 15 minutes.

### BUG 5: Supabase client invocation error handling is wrong

**Severity: CRITICAL -- silently swallows server errors**

When `supabase.functions.invoke()` returns an HTTP 400/429 status, the Supabase client does NOT throw -- it returns `{ data, error }` where `error` is `null` for non-2xx responses that still return a JSON body. The edge functions return 429 for rate limits and 400 for invalid OTP, but the **response body is in `data`**, not `error`.

However, looking at the frontend code in `ForgotPassword.tsx` line 43-46:
```typescript
if (error) throw error;
if (data?.rate_limited) { ... }
```

This is checking `data.rate_limited` correctly. But in `ResetPasswordVerify.tsx` line 68:
```typescript
if (error) throw error;
```

When the edge function returns a 400 status, `supabase.functions.invoke` DOES set `error` to a `FunctionsHttpError`. So `throw error` fires, and the catch block on line 87-89 shows a generic error message instead of the specific "Invalid code" or "Too many attempts" message from the response body.

**This is likely THE primary reason users report failures** -- they enter a wrong OTP and get "Verification failed" instead of "Invalid code. 4 attempts remaining."

### BUG 6: No password_hash column enforcement

**Severity: LOW** -- the `password_history` table lacks an index on `user_id`, meaning the history check on every password change does a sequential scan. Not a bug per se, but a performance concern.

---

## Plan: Fix All Critical Bugs

### Step 1: Fix OTP error handling in ResetPasswordVerify.tsx

The `supabase.functions.invoke()` call returns a `FunctionsHttpError` for non-2xx responses. We need to parse the error body to get the actual message and attempts_remaining.

**File**: `src/pages/ResetPasswordVerify.tsx`
- In `handleVerify`, instead of `if (error) throw error`, parse the error response body for 400 responses to extract `attempts_remaining` and `message`
- Same fix needed for the resend handler

### Step 2: Fix magic link error handling in ResetPasswordMagicLink.tsx

**File**: `src/pages/ResetPasswordMagicLink.tsx`
- Parse `FunctionsHttpError` body to get the actual error message

### Step 3: Fix set-password error handling in ResetPasswordNew.tsx

**File**: `src/pages/ResetPasswordNew.tsx`
- Parse `FunctionsHttpError` body to show "Invalid or expired token" instead of generic error

### Step 4: Fix ForgotPassword error handling

**File**: `src/pages/ForgotPassword.tsx`
- Parse 429 rate limit responses properly from the error object

### Step 5: Remove user pagination fallback from password-reset-request

**File**: `supabase/functions/password-reset-request/index.ts`
- Remove the pagination fallback (lines 114-131) that loops through all auth users
- Keep just the profile lookup + single-page auth admin check as fallback
- This prevents edge function timeouts

### Step 6: Add a shared error parsing utility

**File**: `src/utils/edgeFunctionErrors.ts` (new)
- Create a helper function that extracts JSON body from `FunctionsHttpError` objects
- Reuse across all password reset pages

---

## Files Changed

| File | Action |
|------|--------|
| `src/utils/edgeFunctionErrors.ts` | **Create** -- shared error body parser |
| `src/pages/ResetPasswordVerify.tsx` | **Edit** -- fix error handling to parse response body from FunctionsHttpError |
| `src/pages/ResetPasswordMagicLink.tsx` | **Edit** -- fix error handling |
| `src/pages/ResetPasswordNew.tsx` | **Edit** -- fix error handling for expired token and reuse detection |
| `src/pages/ForgotPassword.tsx` | **Edit** -- fix rate limit error handling |
| `src/components/auth/SetPasswordModal.tsx` | **Edit** -- fix error handling (same pattern) |
| `supabase/functions/password-reset-request/index.ts` | **Edit** -- remove pagination fallback |

## Technical Detail

### The core fix: error body parsing

When a backend function returns HTTP 400, `supabase.functions.invoke()` returns:
```typescript
{ data: null, error: FunctionsHttpError }
```

The actual response body (with `success`, `message`, `attempts_remaining`) is inside `error.context`. We need to extract it:

```text
async function parseEdgeFunctionError(error: unknown) {
  if (error is FunctionsHttpError) {
    try { return await error.context.json() } catch { return null }
  }
  return null;
}
```

Then in each page, instead of:
```text
if (error) throw error;
if (data?.success) { ... }
```

We do:
```text
if (error) {
  const body = await parseEdgeFunctionError(error);
  if (body) { handle body.message, body.attempts_remaining, etc. }
  else { show generic error }
  return;
}
if (data?.success) { ... }
```

### Removing the pagination fallback

In `password-reset-request`, keep only:
1. Profile table lookup (fast, indexed)
2. Single auth admin `listUsers` call with `page: 1, perPage: 1` -- if the user isn't in the first page, return "success" silently (security: no enumeration)

This prevents the edge function from timing out when there are many users.

## Risk

Low-medium. The error handling fix is purely frontend parsing logic. The pagination removal is a defensive simplification. No database changes needed. The token lifecycle (create -> validate -> set password) is correct in the backend; it is the frontend error handling that has been hiding all server responses from users.
