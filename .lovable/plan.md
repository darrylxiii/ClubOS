
# Fix reCAPTCHA Configuration Mismatch

## Problem Identified

The booking fails with "reCAPTCHA token missing" due to a configuration mismatch:

| Component | Status | Result |
|-----------|--------|--------|
| Backend (`RECAPTCHA_SECRET_KEY`) | Configured | Enforces token validation |
| Frontend (`VITE_RECAPTCHA_SITE_KEY`) | Not configured | Skips token generation |

The frontend check `RECAPTCHA_ENABLED` evaluates to `false` because the site key is missing, so no token is generated. But the backend sees its secret key is configured and enforces validation, returning a 403 error.

---

## Solution Options

### Option A: Add Frontend Site Key (Recommended)

Add the `VITE_RECAPTCHA_SITE_KEY` environment variable so the frontend can generate tokens that the backend validates.

**Steps:**
1. Get the reCAPTCHA v3 site key from Google reCAPTCHA admin console (the one paired with your secret key)
2. Add it to the project's environment variables

### Option B: Disable Backend Enforcement (Quick Fix)

Remove the `RECAPTCHA_SECRET_KEY` from the backend secrets, which will make the edge function skip reCAPTCHA validation entirely.

**Impact:** Reduces bot protection on the booking endpoint

### Option C: Make Backend Validation Optional

Modify the edge function to gracefully handle missing tokens when in development/preview environments instead of enforcing "fail-closed" behavior.

---

## Recommended Implementation (Option C - Hybrid Approach)

Make the edge function more resilient by checking for placeholder/preview environments and only strictly enforcing reCAPTCHA in production:

### Changes to `supabase/functions/create-booking/index.ts`

Update the reCAPTCHA enforcement logic:

```text
Current behavior (lines 22-28):
- If RECAPTCHA_SECRET_KEY exists AND no token → 403 error

New behavior:
- If RECAPTCHA_SECRET_KEY exists:
  - If token provided → validate it
  - If no token AND in preview/development → log warning, continue
  - If no token AND in production → 403 error
```

### Implementation

```typescript
// Verify reCAPTCHA (fail-closed when secret is configured, with preview grace)
const recaptchaSecretConfigured = !!Deno.env.get('RECAPTCHA_SECRET_KEY');
const recaptchaToken = req.headers.get("x-recaptcha-token");

// Detect if this is a preview/development environment
const host = req.headers.get('origin') || req.headers.get('referer') || '';
const isPreviewEnvironment = host.includes('lovableproject.com') || 
                             host.includes('lovable.app') ||
                             host.includes('localhost');

if (recaptchaSecretConfigured) {
  if (recaptchaToken) {
    // Token provided - validate it
    const recaptchaResult = await verifyRecaptcha(recaptchaToken, "create_booking", 0.5);
    if (!recaptchaResult.success) {
      return createRecaptchaErrorResponse(recaptchaResult, corsHeaders);
    }
    console.log("[Booking] reCAPTCHA verified, score:", recaptchaResult.score);
  } else if (isPreviewEnvironment) {
    // No token in preview - allow with warning
    console.warn('[Booking] reCAPTCHA token missing in preview environment - allowing request');
  } else {
    // No token in production - block
    return new Response(
      JSON.stringify({ error: 'reCAPTCHA token missing' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
} else {
  console.log('[Booking] RECAPTCHA_SECRET_KEY not set; skipping verification');
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/create-booking/index.ts` | Add preview environment detection, graceful fallback for missing tokens |

---

## Expected Outcome

After implementation:
1. Booking works in preview/development without requiring frontend reCAPTCHA configuration
2. Production deployments with proper `VITE_RECAPTCHA_SITE_KEY` still get full reCAPTCHA protection
3. No code changes required to the frontend
4. Edge function remains secure in production while being testable in preview

---

## Alternative: Quick Fix

If you prefer to just make bookings work immediately without code changes:

**Option 1:** Add the site key
- Go to Google reCAPTCHA admin console
- Find the site key paired with your secret key
- Add `VITE_RECAPTCHA_SITE_KEY` to your environment variables

**Option 2:** Remove backend enforcement
- Remove the `RECAPTCHA_SECRET_KEY` secret to disable validation entirely
