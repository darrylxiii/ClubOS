

# Fix: Auth Edge Functions CORS Blocking Login & Password Reset

## Root Cause

The file `supabase/functions/_shared/auth-cors.ts` has a hardcoded allowlist of 3 origins:
- `https://thequantumclub.lovable.app`
- `https://os.thequantumclub.com`
- `https://app.thequantumclub.nl`

But Evelien (and anyone using the published URL or `lovableproject.com` domain) gets CORS-blocked when the app calls `check-login-lockout` and `password-reset-request` edge functions. The console confirms: `FunctionsFetchError: Failed to send a request to the Edge Function`.

Login still works because `useLoginLockout` fails open, but `password-reset-request` (Set Password) fails hard -- that is why Evelien gets a 2xx-looking response with no actual email sent.

## Fix

### Change 1 -- `supabase/functions/_shared/auth-cors.ts`
Add the `lovableproject.com` domain and lovable preview domains to the allowlist. Use a pattern match for `*.lovable.app` and `*.lovableproject.com` so all preview/published variants work:

```typescript
const ALLOWED_ORIGINS = [
  'https://thequantumclub.lovable.app',
  'https://os.thequantumclub.com',
  'https://app.thequantumclub.nl',
];

// Lovable preview & project domains
const LOVABLE_PATTERN = /^https:\/\/.*\.lovable(project)?\.app$/;

if (Deno.env.get('DENO_ENV') === 'development') {
  ALLOWED_ORIGINS.push('http://localhost:5173', 'http://localhost:8080');
}

export function getAuthCorsOrigin(req: Request): string {
  const origin = req.headers.get('origin') || '';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (LOVABLE_PATTERN.test(origin)) return origin;
  return ALLOWED_ORIGINS[0];
}
```

This single change fixes both login lockout checks and password reset requests from any Lovable domain.

### Change 2 -- `supabase/functions/check-login-lockout/index.ts`
Replace the legacy `serve()` import with `Deno.serve()` for consistency and to avoid import issues:
```typescript
// Line 1: Replace
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// With: remove import, use Deno.serve() instead of serve()
```

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/_shared/auth-cors.ts` | Add lovable domain pattern matching to CORS allowlist |
| `supabase/functions/check-login-lockout/index.ts` | Switch to `Deno.serve()` for consistency |

## Impact
- Evelien can log in without CORS errors on the lockout check
- Set Password flow sends the reset email successfully
- All Lovable preview/published domains work automatically
- Custom domains (`os.thequantumclub.com`, `app.thequantumclub.nl`) continue working

