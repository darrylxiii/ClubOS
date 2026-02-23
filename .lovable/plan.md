

# Email/SMS Verification System Audit - Current Score and Path to 100/100

## Current Score: 62/100

Here is the breakdown of every dimension, what is working, what is broken, and what needs to happen to reach 100.

---

## Scorecard

| Category | Weight | Current | Target | Status |
|---|---|---|---|---|
| SMS Delivery Rate | 15 | 4/15 | 15/15 | Critical |
| Email Delivery Rate | 10 | 7/10 | 10/10 | Moderate |
| OTP Hashing (Security) | 15 | 3/15 | 15/15 | Broken |
| Rate Limiting (IP) | 10 | 6/10 | 10/10 | Partial |
| Delivery Tracking | 10 | 0/10 | 10/10 | Not Working |
| Error Feedback to User | 10 | 5/10 | 10/10 | Partial |
| Expired Code Cleanup | 5 | 0/5 | 5/5 | Missing |
| Plaintext Code Removal | 10 | 0/10 | 10/10 | Dangerous |
| Resend Bounce Tracking | 5 | 0/5 | 5/5 | Missing |
| Edge Function Deployment | 5 | 3/5 | 5/5 | Partially Deployed |
| Legacy Function Cleanup | 5 | 2/5 | 5/5 | Orphaned Code |

---

## Critical Findings

### 1. OTP Hashing is NOT Working in Production (0/15 SMS, 1/15 Email)

The code was written to hash OTPs, but the data proves the deployed SMS function is still running old code:
- **Phone verifications**: 0 out of 14 recent records have `code_hash` populated
- **Email verifications**: Only 1 out of 15 has `code_hash` (the very latest deploy)
- **All 49 records still have plaintext `code` column populated**

The `code` column is still `NOT NULL` in both tables, meaning even after the hash code runs, the plaintext is always stored alongside the hash. This completely defeats the purpose of hashing.

**Fix**: 
- Redeploy all four edge functions to ensure the latest code is running
- Stop writing plaintext to the `code` column -- write a dummy value or null
- Make `code` column nullable via migration
- Schedule a cleanup to null-out all existing plaintext codes after confirming hash-based verification works

### 2. SMS Delivery: 28.6% Success Rate (Last 7 Days) -- Getting Worse

Country-level data (30 days):
- NL: 69% success (22/32) -- acceptable
- UK: 0% success (0/6) -- completely broken
- Iran: 0% (0/2)
- UAE: 0% (0/1)
- Brazil: 50% (1/2) -- slow delivery

No `twilio_sid` or `twilio_status` is being recorded on ANY recent record, confirming the new tracking code has not deployed.

**Fix**:
- Redeploy `send-sms-verification` so Twilio SID/status tracking actually works
- Add Twilio Verify API as an alternative to raw SMS (better deliverability internationally)
- Add a "Switch to email verification" button directly in the SMS flow when delivery is likely to fail (detect by country prefix)
- Register a Twilio Alphanumeric Sender ID for supported countries

### 3. Twilio Status Callback Not Receiving Data

The `twilio-status-callback` function exists and is configured with `verify_jwt = false`, but since the SMS function never stores the SID, the callback has nothing to match against. Additionally, the callback URL may need to be whitelisted in the Twilio console.

**Fix**: Covered by redeployment of `send-sms-verification`. After that, verify the callback URL is accessible from Twilio.

### 4. Legacy `send-verification-code` Function Still Exists

There is a separate `send-verification-code/index.ts` that:
- Receives the plaintext code from the client and sends it via email
- Has no rate limiting, no IP tracking, no hashing
- Uses different subject line and template
- It is unclear if anything still calls this function

**Fix**: Audit all callsites. If nothing uses it, remove it. If something does, redirect to `send-email-verification`.

### 5. Email Failures by Domain

- `closedin.io`: 0/4 verified -- likely SPF/DKIM rejection
- `binnenbouwers.nl`: 1/4 verified -- corporate server filtering
- `thequantumclub.nl` (own domain): 5/10 -- 50% failure on your own domain is a red flag for DNS config
- `example.com`: 4/5 unverified -- test data, ignore

**Fix**: The own-domain 50% failure rate strongly suggests a Resend DNS verification issue. Check SPF/DKIM/DMARC records.

### 6. No Resend Delivery Tracking

The email function sends via Resend and gets a response, but never stores the Resend message ID. There is no webhook to track bounces, complaints, or delivery failures. Emails that silently fail are invisible.

**Fix**: Store Resend message ID in `email_verifications` table. Add a Resend webhook endpoint for bounce/complaint tracking.

### 7. No Automatic Cleanup of Expired Codes

Expired verification records (both email and phone) accumulate indefinitely. The plaintext codes sit in the database forever.

**Fix**: Add a scheduled database function (pg_cron or a periodic edge function) to:
- Null-out plaintext `code` column on all records older than 1 hour
- Delete records older than 30 days

### 8. Rate Limiter Table Has No Auto-Cleanup

The `verification_ip_rate_limits` table will grow indefinitely. Old window records are never pruned.

**Fix**: Add a periodic cleanup to delete records where `window_start` is older than 24 hours.

---

## Implementation Plan (Priority Order)

### Phase 1: Deploy and Fix What Exists (Critical)

1. **Redeploy all verification edge functions** so the hashing, Twilio SID tracking, and IP rate limiting code actually runs in production
2. **Make `code` column nullable** on both `email_verifications` and `phone_verifications` via migration
3. **Stop storing plaintext codes** -- write `'REDACTED'` instead of the actual code after hashing
4. **Null-out all existing plaintext codes** in a one-time migration for records that already have `code_hash`

### Phase 2: Improve SMS Deliverability

5. **Add country-prefix detection in the UI** -- for +44, +98, +971, +91 prefixes, show a warning: "SMS delivery to your region may be delayed. We recommend using email verification." with a one-tap switch
6. **Surface Twilio error details in the UI** -- the backend returns `error_code: 'SMS_DELIVERY_FAILED'` with `suggestion`, but the frontend hook does not parse or display these fields. Update `usePhoneVerification` to extract and show `suggestion` from the response

### Phase 3: Email Deliverability

7. **Store Resend message ID** in `email_verifications` for tracking
8. **Add `resend_id` column** to `email_verifications`
9. **Create a `resend-webhook` edge function** to receive bounce/complaint notifications and update the verification record

### Phase 4: Cleanup and Hygiene

10. **Create a scheduled cleanup function** (or pg_cron job) to:
    - Null-out `code` on records older than 1 hour
    - Delete `verification_ip_rate_limits` records older than 24 hours
    - Delete verification records older than 90 days
11. **Remove or redirect `send-verification-code`** if unused
12. **Add monitoring query** -- a simple daily log of success rates by channel and country

---

## Technical Details

### Files to modify:
- `supabase/functions/send-sms-verification/index.ts` -- replace `code` with `'REDACTED'` in DB insert
- `supabase/functions/send-email-verification/index.ts` -- replace `code` with `'REDACTED'` in DB insert, store Resend message ID
- `supabase/functions/verify-email-code/index.ts` -- remove plaintext fallback after migration period
- `supabase/functions/verify-sms-code/index.ts` -- remove plaintext fallback after migration period
- `src/hooks/usePhoneVerification.ts` -- parse `suggestion` field from error response, add country-prefix warning logic
- `src/components/PhoneVerification.tsx` -- add country-based warning banner, "Switch to email" button
- `src/components/EmailVerification.tsx` -- minor: parse Resend bounce status if available

### New files:
- `supabase/functions/resend-webhook/index.ts` -- Resend bounce/complaint webhook handler

### Database migration:
- ALTER `code` column to nullable on both tables
- UPDATE existing records: SET `code = 'REDACTED'` WHERE `code_hash IS NOT NULL`
- ADD `resend_id` column to `email_verifications`
- CREATE scheduled cleanup function for expired records and rate limit entries

### Edge function deployments needed:
- `send-sms-verification`
- `send-email-verification`
- `verify-email-code`
- `verify-sms-code`
- `twilio-status-callback`
- `resend-webhook` (new)

