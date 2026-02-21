

# Fix: Surface "Breached Password" Error Clearly During Password Reset

## What Happened

The password reset flow worked end-to-end (auth-email RPC fix confirmed working). The failure occurred at the final step: the password Darryl chose was flagged as "pwned" — it appears in the Have I Been Pwned breached passwords database. The auth system rejected it with `AuthWeakPasswordError` (reason: `"pwned"`).

The user saw a generic error instead of a clear message explaining why.

## Root Cause

In `password-reset-set-password/index.ts` (line 177), when `updateUserById` throws `AuthWeakPasswordError`, the function does `throw updateError` which falls into the generic catch block and returns a 500 with just `error.message`. The frontend has no way to distinguish "weak password" from "server crash".

## The Fix — Two Files

### 1. `supabase/functions/password-reset-set-password/index.ts`

Replace the generic `throw updateError` on line 177 with a structured response that passes back the error code and reasons:

```typescript
if (updateError) {
  console.error(`[PasswordReset][${correlationId}][set_password] Update error:`, updateError);

  // Handle weak/breached password specifically
  if (updateError.code === 'weak_password' || updateError.name === 'AuthWeakPasswordError') {
    const reasons = (updateError as any).reasons || [];
    return new Response(
      JSON.stringify({
        weak_password: true,
        reasons,
        error: reasons.includes('pwned')
          ? "This password has appeared in a data breach and cannot be used. Please choose a different password."
          : "Password is too weak. Please choose a stronger password."
      }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  throw updateError;
}
```

### 2. `src/pages/ResetPasswordNew.tsx`

Add handling for the `weak_password` response in the error/data checks (alongside the existing `reused` check):

```typescript
// After the existing reused check, add:
if (data?.weak_password) {
  const reasons = data.reasons || [];
  const msg = reasons.includes('pwned')
    ? "This password has been found in a known data breach. Please choose a unique password."
    : "This password is too weak. Please choose a stronger one.";
  toast.error(msg, { duration: 6000 });
  return;
}
```

Also handle it in the `error` path (status 422 from edge function):

```typescript
if (body?.weak_password) {
  const reasons = body.reasons || [];
  const msg = reasons.includes('pwned')
    ? "This password has been found in a known data breach. Please choose a unique password."
    : "This password is too weak. Please choose a stronger one.";
  toast.error(msg, { duration: 6000 });
  return;
}
```

## Files to Change

| File | Change |
|---|---|
| `supabase/functions/password-reset-set-password/index.ts` | Return structured 422 for weak/breached passwords instead of throwing generically |
| `src/pages/ResetPasswordNew.tsx` | Handle `weak_password` response with clear user-facing message |

## After the Fix

When a user picks a breached password, they see:
> "This password has been found in a known data breach. Please choose a unique password."

When they pick a weak password (other reasons), they see:
> "This password is too weak. Please choose a stronger one."

No more generic "Failed to reset password" for a recoverable validation error.

