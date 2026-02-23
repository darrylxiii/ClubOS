
# Email and SMS Verification System Audit

## Current State Summary

The system uses four backend functions:
- `send-email-verification` -- sends OTP via Resend API from `verify@thequantumclub.nl`
- `verify-email-code` -- validates the 6-digit code
- `send-sms-verification` -- sends OTP via Twilio SMS
- `verify-sms-code` -- validates the 6-digit code

## Key Findings

### 1. SMS Delivery Failures (Critical -- 42% never verified)

**Data from the last 2 months:**
- 50 SMS codes sent, only 29 verified (58% success)
- UK numbers (+44): 6 attempts, 0 verified -- users retried 3x each, never received
- Iran (+98): 2 attempts, 0 verified
- UAE (+971): 1 attempt, 0 verified
- India (+91): 1 attempt, 0 verified
- Brazil (+55): 2 attempts, 1 verified after 20+ minutes delay

**Root causes:**
- The Twilio phone number (stored as `TWILIO_PHONE_NUMBER`) is likely a Dutch (+31) number. Twilio requires either an Alphanumeric Sender ID or a local/toll-free number to reliably deliver to UK, Middle East, and Asian countries. A Dutch number sending SMS to UK carriers often gets silently dropped.
- No delivery status tracking -- the function fires and forgets. Twilio returns an SID and status but the code never stores it or checks delivery callbacks.
- No fallback mechanism when SMS fails silently.

**Fixes:**
- Add Twilio delivery status logging (store `twilioData.sid` and `twilioData.status` in `phone_verifications`)
- Register an Alphanumeric Sender ID ("TheQuantumClub" or "TQC") in Twilio for supported countries
- Add a Twilio status callback webhook to track `delivered` vs `undelivered` vs `failed`
- Consider adding WhatsApp OTP as a fallback channel (you already have WhatsApp Business integrated)
- Show users a "Didn't receive the code?" option with email fallback

### 2. Email Deliverability Issues (Moderate -- 30% never verified)

**Data:**
- 73 email codes sent, 51 verified (70% success)
- `jurre@closedin.io` -- 4 attempts, 0 verified (likely spam-filtered)
- `psk@binnenbouwers.nl` -- 4 attempts, 3 unverified (intermittent delivery)
- `joep.mook@outlook.com` -- 1 attempt, 0 verified (Microsoft filtering)
- `nino.silic@outlook.com` -- 1 attempt, 0 verified (Microsoft filtering)

**Root causes:**
- Sender domain `thequantumclub.nl` must have SPF, DKIM, and DMARC records correctly configured in Resend. Microsoft (Outlook/Hotmail) and corporate mail servers aggressively filter emails without proper authentication.
- The email subject uses an emoji ("Verify Your Email - The Quantum Club") which can trigger spam filters on some corporate mail servers.
- No bounce/complaint tracking from Resend -- failed deliveries are invisible.

**Fixes:**
- Verify Resend domain configuration (SPF, DKIM, DMARC) for `thequantumclub.nl` -- check Resend dashboard
- Remove emoji from subject line, use plain text: "Verify Your Email - The Quantum Club"
- Add Resend webhook for bounce/complaint tracking
- Add "Check your spam folder" guidance in the UI after sending

### 3. OTP Codes Stored in Plaintext (Security Issue)

Both `email_verifications` and `phone_verifications` tables store the 6-digit OTP code in plaintext. Anyone with database read access can see all active codes.

**Fix:**
- Hash OTP codes before storage (using SHA-256, same pattern as `generate-recovery-codes`)
- Compare hashed input against stored hash during verification
- This is a known security best practice per the project's own memory docs

### 4. No Rate Limiting for Unauthenticated Users (Security Issue)

Rate limiting (`check_verification_rate_limit`) only runs for authenticated users (`if (user)`). During onboarding, users are typically unauthenticated, meaning:
- Anyone can spam the SMS endpoint with unlimited requests (expensive Twilio charges)
- Anyone can spam the email endpoint (Resend rate limits / reputation damage)

**Fix:**
- Add IP-based rate limiting for unauthenticated requests
- Track attempts by IP + phone/email combination in the database
- Limit to 3 send attempts per phone/email per 30-minute window regardless of auth status

### 5. Silent Error Handling

The SMS function returns a generic error to users ("SMS service temporarily unavailable") but does not surface Twilio-specific errors like "unreachable number" or "invalid number format." Users have no idea why their code did not arrive.

**Fix:**
- Map common Twilio error codes to user-friendly messages (e.g., 21614 = "This number cannot receive SMS", 21211 = "Invalid phone number")
- Log the Twilio error code alongside the SID in the database for diagnostics
- Show actionable guidance in the UI ("Try a different number" or "Use email verification instead")

### 6. Missing Supabase Auth Confirmation Email Config

The project sends custom verification codes via edge functions, but Supabase Auth itself may also be configured to send confirmation emails on signup. This could cause confusion (two emails) or conflict.

**Fix:**
- Verify that Supabase Auth's built-in email confirmation is disabled since you use custom verification
- Or align the two systems so they don't conflict

---

## Implementation Plan (Priority Order)

1. **IP-based rate limiting** for unauthenticated verification requests (security-critical)
2. **Hash OTP codes** before database storage (security)
3. **Add Twilio delivery status tracking** -- store SID/status, add status callback webhook
4. **Improve UI feedback** -- "Check spam folder" for email, "Didn't receive?" fallback, Twilio error mapping
5. **Email subject cleanup** -- remove emoji from verification email subject
6. **Resend domain health check** -- verify SPF/DKIM/DMARC (manual check needed in Resend dashboard)
7. **WhatsApp OTP fallback** -- leverage existing WhatsApp Business integration as SMS fallback

## Technical Details

### Files to modify:
- `supabase/functions/send-sms-verification/index.ts` -- add IP rate limiting, store Twilio SID, improve error mapping
- `supabase/functions/send-email-verification/index.ts` -- add IP rate limiting, fix subject line
- `supabase/functions/verify-email-code/index.ts` -- hash comparison instead of plaintext
- `supabase/functions/verify-sms-code/index.ts` -- hash comparison instead of plaintext
- `src/components/EmailVerification.tsx` -- add "check spam" guidance
- `src/components/PhoneVerification.tsx` -- add "didn't receive" fallback UI
- New DB migration: add `twilio_sid`, `twilio_status` columns to `phone_verifications`; create IP rate limit tracking table

### New edge function:
- `twilio-status-callback` -- webhook endpoint for Twilio delivery receipts
