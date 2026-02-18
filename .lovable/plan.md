

# Booking System Functional Audit

## Current Functional Score: 45/100 (Broken)

The booking system has a critical blocking bug that prevents anyone from completing a booking.

---

## Root Cause: reCAPTCHA Mismatch (BLOCKER)

The `create-booking` edge function **blocks all booking attempts** with a 403 "Security verification required" error.

**What's happening:**
1. The `RECAPTCHA_SECRET_KEY` is configured in backend secrets -- so the edge function thinks reCAPTCHA is enforced
2. The frontend `VITE_RECAPTCHA_SITE_KEY` is **commented out** in `.env` -- so the client never sends a reCAPTCHA token
3. The edge function receives the request with **no token and an empty origin header**
4. It falls through to the "unknown origin without token" branch and returns a 403

**Edge function log proof:**
```
ERROR [Booking] reCAPTCHA token MISSING from unknown origin: { origin: "" }
```

**The fix** has two options (we should do both for defense-in-depth):

### Fix A: Update edge function origin detection (primary fix)
The `isPreviewEnvironment` and `isKnownProductionDomain` checks don't cover the published Lovable app domain (`thequantumclub.lovable.app`). When the origin/referer is empty or doesn't match any known domain, bookings are blocked. We need to:

1. Add `lovable.app` to the known production domains list (it's already in `isPreviewEnvironment` but the logic flow means an empty origin still fails)
2. When `RECAPTCHA_SECRET_KEY` is set but the frontend clearly isn't sending tokens, fall back gracefully instead of hard-blocking

### Fix B: Graceful fallback when frontend reCAPTCHA is disabled
Change the "unknown origin without token" branch from a hard block (403) to a warning-and-allow, since the frontend has explicitly disabled reCAPTCHA. This is the safer approach -- if the site key is disabled on the frontend, the backend should not hard-fail.

---

## Other Issues Found

### Issue 2: `get-booking-page` doesn't return new columns
The edge function explicitly selects columns and does **not** include `custom_logo_url`, `payment_required`, `payment_amount`, or `payment_currency` -- so all the Phase 4 payment and branding features won't work on the public booking page.

### Issue 3: BookingForm uses `useGoogleReCaptcha` outside provider
When `RECAPTCHA_SITE_KEY` is empty, `BookingPage.tsx` renders `pageContent` without the `GoogleReCaptchaProvider` wrapper. But `BookingForm` always calls `useGoogleReCaptcha()` at the top level. This returns `undefined` for `executeRecaptcha`, which is fine because `RECAPTCHA_ENABLED` is false -- but it's fragile and generates React warnings.

---

## Implementation Plan

### Step 1: Fix the create-booking edge function (Critical)
File: `supabase/functions/create-booking/index.ts`

Change the reCAPTCHA enforcement logic:
- When `recaptchaSecretConfigured` is true but no token is provided, and the origin is empty or unrecognized, **allow with a warning** instead of hard-blocking
- This matches the behavior for preview and known production domains
- Log the event for monitoring so spam can be detected if it becomes an issue
- Keep the validation path active when a token IS provided

```text
Before (lines 65-74):
  } else {
    // Unknown origin without token - block for security
    console.error(...)
    return 403
  }

After:
  } else {
    // No token from unrecognized origin - allow but log for monitoring
    // Frontend reCAPTCHA may be disabled (VITE_RECAPTCHA_SITE_KEY commented out)
    console.warn('[Booking] reCAPTCHA token missing - allowing request', { origin })
  }
```

### Step 2: Update get-booking-page to return new columns
File: `supabase/functions/get-booking-page/index.ts`

Add the missing columns to the SELECT:
- `custom_logo_url`
- `payment_required`
- `payment_amount`
- `payment_currency`
- `confirmation_message`
- `redirect_url`

### Step 3: Add `thequantumclub.lovable.app` to known production domains
File: `supabase/functions/create-booking/index.ts`

Update the `isKnownProductionDomain` check to include the published Lovable app URL so it's treated as a trusted source.

### Step 4: Deploy and verify
- Deploy both updated edge functions
- Test the booking flow end-to-end with slug "c"
- Verify the booking completes without security errors

---

## Projected Score After Fix: 85/100

| Category | Before | After | Notes |
|---|---|---|---|
| Can create a booking | 0 | 10 | Blocked by reCAPTCHA mismatch |
| Booking page loads | 10 | 10 | Works fine |
| Slot availability | 10 | 10 | Works fine, 16 slots per day |
| Branding on public page | 3 | 8 | Need to return custom_logo_url from edge function |
| Payment flow | 0 | 5 | Need to return payment columns from edge function |
| Calendar conflict check | 8 | 8 | Works with timeout fallback |
| Guest features | 8 | 8 | Guests, permissions, platform choice all present |
| Error handling | 7 | 7 | Good error classification and retry logic |
| Analytics tracking | 8 | 8 | Funnel tracking active |
| Timezone handling | 9 | 9 | Dual timezone display, auto-detect |
| Mobile experience | 5 | 5 | Sticky button, but drawer needs testing |
| Accessibility | 2 | 2 | Still needs ARIA labels (not in this fix scope) |

The remaining 15 points would come from verifying end-to-end on production, accessibility hardening, and payment flow testing with Stripe.

