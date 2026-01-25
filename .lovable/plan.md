
# Fix Booking Errors on bytqc.com

## Executive Summary

After thorough investigation, I've identified **two root causes** for the booking issues on the production custom domain:

1. **"Verification failed" error**: The `create-booking` edge function's production domain detection doesn't include `bytqc.com` or `thequantumclub.app`, so when reCAPTCHA validation fails (low score, action mismatch), it returns 403 with "verification failed"

2. **Page refresh when adding guests**: The guest email input buttons may be triggering form submission due to event bubbling, causing the page to refresh unexpectedly

---

## Issue 1: reCAPTCHA Verification Failures

### Root Cause

The `create-booking` edge function (line 22-26) only recognizes these as preview/dev environments:
- `lovableproject.com`
- `lovable.app`
- `localhost`

Your production domains (`bytqc.com`, `thequantumclub.app`) are treated as "production" which requires valid reCAPTCHA tokens. If the token validation fails for any reason:
- Low score (below 0.5)
- Action mismatch (`create_booking` expected)
- Domain not registered in Google reCAPTCHA console

The user gets "verification failed" error.

### Solution

**Approach A (Recommended)**: Make the reCAPTCHA more resilient for production
- Add detailed logging to understand WHY verification fails
- Lower the minimum score threshold or make it configurable
- Provide better fallback for edge cases

**Approach B**: Ensure domains are registered in Google reCAPTCHA
- Verify `bytqc.com` and `thequantumclub.app` are both added to the reCAPTCHA site key in Google Console

### Technical Changes

**File**: `supabase/functions/create-booking/index.ts`

1. Add production domain recognition for better logging
2. Add detailed error information when reCAPTCHA fails
3. Consider a "soft fail" mode for known production domains with logging

```typescript
// Enhanced production domain detection
const origin = req.headers.get('origin') || req.headers.get('referer') || '';
const isPreviewEnvironment = origin.includes('lovableproject.com') || 
                             origin.includes('lovable.app') ||
                             origin.includes('localhost');

const isKnownProductionDomain = origin.includes('bytqc.com') || 
                                 origin.includes('thequantumclub.app') ||
                                 origin.includes('thequantumclub.nl');

if (recaptchaSecretConfigured) {
  if (recaptchaToken) {
    const recaptchaResult = await verifyRecaptcha(recaptchaToken, "create_booking", 0.5);
    if (!recaptchaResult.success) {
      // Log detailed failure info for debugging
      console.error("[Booking] reCAPTCHA FAILED:", {
        origin,
        isKnownProductionDomain,
        score: recaptchaResult.score,
        error: recaptchaResult.error,
        action: recaptchaResult.action,
      });
      return createRecaptchaErrorResponse(recaptchaResult, corsHeaders);
    }
    console.log("[Booking] reCAPTCHA verified, score:", recaptchaResult.score);
  } else if (isPreviewEnvironment) {
    console.warn('[Booking] reCAPTCHA token missing in preview - allowing');
  } else {
    console.error("[Booking] reCAPTCHA token MISSING from:", origin);
    return new Response(
      JSON.stringify({ error: 'reCAPTCHA token missing' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}
```

**File**: `supabase/functions/_shared/recaptcha-verifier.ts`

Add better error diagnostics:

```typescript
// Return more actionable error messages
if (expectedAction && verifyData.action !== expectedAction) {
  console.error(`reCAPTCHA action mismatch: expected '${expectedAction}', got '${verifyData.action}'`);
  return {
    success: false,
    score: verifyData.score,
    action: verifyData.action,
    error: `Action mismatch: expected ${expectedAction}`
  };
}

if (verifyData.success && verifyData.score < minScore) {
  console.warn(`reCAPTCHA score too low: ${verifyData.score} < ${minScore} (hostname: ${verifyData.hostname})`);
  return {
    success: false,
    score: verifyData.score,
    error: `Low score: ${verifyData.score}`
  };
}
```

---

## Issue 2: Guest Email Input Causes Page Refresh

### Root Cause

When clicking buttons inside the form (add guest, remove guest), there may be event propagation causing form submission. While the buttons have `type="button"`, nested button clicks inside a form can still sometimes trigger unexpected behavior.

### Solution

Add explicit `stopPropagation()` to prevent any bubbling issues, and ensure the button wrapper in badges is properly isolated.

### Technical Changes

**File**: `src/components/booking/GuestEmailInput.tsx`

```typescript
const handleAddGuest = (e?: React.MouseEvent) => {
  e?.preventDefault();
  e?.stopPropagation();
  setError("");
  // ... rest of logic
};

const handleRemoveGuest = (e: React.MouseEvent, index: number) => {
  e.preventDefault();
  e.stopPropagation();
  onChange(guests.filter((_, i) => i !== index));
};

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === "Enter") {
    e.preventDefault();
    e.stopPropagation();
    handleAddGuest();
  }
};

// In the JSX:
<Button
  type="button"
  onClick={(e) => handleAddGuest(e)}
  // ...
>

<Button
  type="button"
  onClick={(e) => handleRemoveGuest(e, index)}
  // ...
>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/create-booking/index.ts` | Add detailed logging for reCAPTCHA failures, recognize production domains |
| `supabase/functions/_shared/recaptcha-verifier.ts` | Improve error diagnostics and logging |
| `src/components/booking/GuestEmailInput.tsx` | Add stopPropagation to prevent form submission on guest actions |

---

## Additional Recommendations

### Verify Google reCAPTCHA Console Settings

Make sure these domains are added to your reCAPTCHA v3 site key:
- `bytqc.com`
- `thequantumclub.app`
- `thequantumclub.nl`
- `lovable.app`
- `lovableproject.com`
- `localhost`

### Testing Plan

1. Deploy fixes
2. Test booking on `bytqc.com`:
   - Fill form and submit → Should complete successfully
   - Add multiple guests → No page refresh
   - Remove guests → No page refresh
3. Monitor edge function logs for reCAPTCHA diagnostics

---

## Expected Outcomes

1. **Clear error diagnostics** when reCAPTCHA fails (visible in logs)
2. **No more page refreshes** when adding/removing guests
3. **Successful bookings** on all production domains
