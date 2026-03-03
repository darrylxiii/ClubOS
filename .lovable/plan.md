

# Add reCAPTCHA v3 to Partner Funnel

## Overview

The partner funnel currently has no reCAPTCHA protection. The project already has the full reCAPTCHA v3 infrastructure (config, provider component, `verify-recaptcha` edge function) used in the booking form and forgot-password page. This plan replicates that exact pattern.

## Changes

### 1. Wrap the funnel page with GoogleReCaptchaProvider

**File:** `src/pages/PartnerFunnel.tsx`

- Import `GoogleReCaptchaProvider` from `react-google-recaptcha-v3`
- Import `RECAPTCHA_SITE_KEY` from `@/config/recaptcha`
- Wrap the page content conditionally (same pattern as `BookingPage.tsx`):
  - If `RECAPTCHA_SITE_KEY` exists, wrap with provider
  - Otherwise, render without it (graceful degradation for preview/dev environments)

### 2. Use reCAPTCHA token on form submission

**File:** `src/components/partner-funnel/FunnelSteps.tsx`

- Import `useGoogleReCaptcha` and `RECAPTCHA_ENABLED` 
- In `handleSubmit`, before the database insert:
  1. Call `executeRecaptcha('partner_request')` to get a token
  2. Call the existing `verify-recaptcha` edge function with the token
  3. If the score is below `RECAPTCHA_MIN_SCORE` (0.5), block submission with a toast: "We could not verify this request. Please try again."
  4. If reCAPTCHA is not configured or the API is down, fail open (allow submission) to avoid blocking real leads

### 3. No new infrastructure needed

- The `verify-recaptcha` edge function already exists and is deployed
- The `VITE_RECAPTCHA_SITE_KEY` env var is already defined in the config (currently commented out in `.env` -- will need to be re-enabled with a valid key pair)
- The `RECAPTCHA_SECRET_KEY` secret is already referenced in the edge function

## What Does NOT Change

- Form layout, validation flow, email verification, or analytics
- The existing `verify-recaptcha` edge function
- Any other pages using reCAPTCHA

## Note on reCAPTCHA Keys

The `.env` shows the site key is currently commented out due to a previous key mismatch. You will need to either uncomment it with a valid key or create a new reCAPTCHA v3 site at [Google reCAPTCHA admin](https://www.google.com/recaptcha/admin) and update both:
- `VITE_RECAPTCHA_SITE_KEY` in the environment
- `RECAPTCHA_SECRET_KEY` in the backend secrets
