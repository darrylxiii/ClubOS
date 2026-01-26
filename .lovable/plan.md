
# Fix: Booking "Security Verification Required" Error

## Problem

Sebastiaan cannot complete a booking on `/book/darryl` from `bytqc.com` because:

```
BACKEND: RECAPTCHA_SECRET_KEY = ✓ configured
FRONTEND: VITE_RECAPTCHA_SITE_KEY = ✗ commented out (disabled)

Result: Frontend sends NO token → Backend blocks production domains
```

The current logic blocks all non-preview domains when the secret key is configured but no token is provided. Since reCAPTCHA is intentionally disabled on the frontend (the `.env` has a comment: "temporarily disabled due to site key/secret key mismatch"), the backend needs to be updated to handle this gracefully.

---

## Solution: Make Backend Gracefully Handle Missing Frontend reCAPTCHA

We will update the `create-booking` edge function to:

1. **Recognize known TQC production domains as "trusted"** - If the request comes from a known TQC domain (`bytqc.com`, `thequantumclub.app`, `thequantumclub.nl`), allow it through even without a token (with logging)
2. **Add rate limiting awareness** - The function should rely on other protections (rate limiting, input validation) when reCAPTCHA is not available
3. **Log clearly** - Make it obvious in logs when reCAPTCHA is being bypassed so we can monitor

---

## Implementation Plan

### Phase 1: Update Edge Function Logic

**File**: `supabase/functions/create-booking/index.ts`

Update the reCAPTCHA verification block to allow known production domains through when no token is provided:

```
Current Logic:
├── Token provided? → Verify with Google API
├── Preview environment? → Allow with warning  
└── Production (no token)? → BLOCK ❌

New Logic:
├── Token provided? → Verify with Google API
├── Preview environment? → Allow with warning
├── Known TQC production domain? → Allow with warning (NEW) ✓
└── Unknown production domain? → Block (protection against spam from other origins)
```

Changes:
```typescript
// Lines 53-66: Update the fallback logic
} else if (isPreviewEnvironment) {
  // No token in preview - allow with warning
  console.warn('[Booking] reCAPTCHA token missing in preview environment - allowing request');
} else if (isKnownProductionDomain) {
  // NEW: Known TQC production domain without token - allow but log for monitoring
  // This handles the case where frontend reCAPTCHA is disabled/misconfigured
  console.warn('[Booking] reCAPTCHA token missing on known production domain - allowing request', {
    origin,
    note: 'Frontend reCAPTCHA may be disabled. Consider re-enabling for spam protection.'
  });
} else {
  // Unknown origin without token - block for security
  console.error("[Booking] reCAPTCHA token MISSING from unknown origin:", { origin });
  return new Response(
    JSON.stringify({ error: 'Security verification required. Please refresh and try again.' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
```

### Phase 2: Add Booking Link Domain to Allowed Origins

Also update the `isPreviewEnvironment` check to include edge cases:

```typescript
// Add id-preview pattern for Lovable's domain format
const isPreviewEnvironment = origin.includes('lovableproject.com') || 
                             origin.includes('lovable.app') ||
                             origin.includes('id-preview') ||  // NEW: Lovable preview subdomain pattern
                             origin.includes('localhost');
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/create-booking/index.ts` | Update reCAPTCHA fallback logic to allow known TQC production domains |

---

## Why This Is Safe

1. **Only known TQC domains are allowed** - Unknown origins are still blocked
2. **Other protections remain active**:
   - Input validation with Zod (email, phone, name length limits)
   - Database constraints (unique booking prevention)
   - Rate limiting at Supabase Edge Functions level
3. **Full audit trail** - All bypasses are logged with warnings
4. **Easy to re-enable** - When reCAPTCHA frontend keys are fixed, the normal flow resumes automatically

---

## Long-Term Recommendation

After this immediate fix, consider:
1. **Re-enable reCAPTCHA properly** - Create new matching site key + secret key pair
2. **Update both** `VITE_RECAPTCHA_SITE_KEY` (frontend) and `RECAPTCHA_SECRET_KEY` (backend)
3. This provides an additional layer of spam protection for public booking pages

---

## Expected Result

After implementation:
- Booking from `bytqc.com/book/darryl` works immediately
- Booking from `thequantumclub.app` and `thequantumclub.nl` also works
- Lovable preview URLs continue to work
- Unknown/malicious origins are still blocked
- Clear logging for monitoring reCAPTCHA bypass situations
