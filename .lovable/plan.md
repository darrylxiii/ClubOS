

# Password Reset System: 62 -> 100/100

## Remaining 12 Points to Earn

| Category | Points | What's Missing |
|----------|--------|----------------|
| Observability | +6 | Structured logging with correlation IDs (3) + completion rate monitoring (3) |
| Security | +4 | reCAPTCHA on request form (2) + device fingerprint rate limiting (2) |
| Alerting | +2 | Auto-detect repeated failures and flag for admin review |

---

## About the "Waiting Box" Delay

The delay you experience after I finish responding (where the chat input shows a loading/waiting state before you can type) is caused by the Lovable platform deploying edge functions and running database migrations in the background. This is not something in your project code -- it is the build pipeline finishing up. Unfortunately, this is not fixable from the codebase side. It is a platform behavior.

---

## Implementation Plan

### Step 1: Correlation IDs for Structured Logging (+3 points)

**What**: Every password reset flow generates a unique `correlationId` at the request step. That ID is passed through validate and set-password so all log entries for one user journey can be traced end-to-end.

**Files changed**:
- `supabase/functions/password-reset-request/index.ts` -- Generate `correlationId` (UUID), store it in the `password_reset_tokens` table, and include it in all `console.log` statements
- `supabase/functions/password-reset-validate-otp/index.ts` -- Read `correlationId` from the token record, include in all logs
- `supabase/functions/password-reset-validate-token/index.ts` -- Same pattern
- `supabase/functions/password-reset-set-password/index.ts` -- Same pattern
- `supabase/functions/send-password-reset-email/index.ts` -- Accept and log correlationId
- **Database migration**: Add `correlation_id UUID DEFAULT gen_random_uuid()` column to `password_reset_tokens` and `correlation_id UUID` column to `password_reset_attempts`

**Log format**: `[PasswordReset][{correlationId}][{stage}] message`

### Step 2: Completion Rate Monitoring View (+3 points)

**What**: A database view that calculates reset funnel metrics (requested, validated, completed, abandoned, failed) so admins can query completion rates without complex joins.

**Database migration**: Create a view `password_reset_funnel_stats` that aggregates `password_reset_attempts` by `attempt_type` and `success`, grouped by day. Also create a function `get_password_reset_health(p_days INTEGER DEFAULT 7)` that returns:
- Total requests
- Total validations (OTP + magic link)
- Total completions
- Completion rate (%)
- Average time from request to completion
- Most common failure point

This data is queryable from the admin side and could power a future dashboard widget.

### Step 3: Repeated Failure Alerting (+2 points)

**What**: When a single email accumulates 3+ failed attempts across validate/set-password within 1 hour, log a `[SECURITY_ALERT]` entry and insert a record into a new `security_alerts` table that admins can monitor.

**Files changed**:
- **Database migration**: Create `security_alerts` table (`id`, `alert_type`, `email`, `ip_address`, `details JSONB`, `created_at`, `resolved BOOLEAN DEFAULT false`) with RLS (service role only)
- `supabase/functions/password-reset-validate-otp/index.ts` -- After a failed attempt, check count of recent failures; if >= 3, insert a security alert
- `supabase/functions/password-reset-set-password/index.ts` -- Same check after failure

### Step 4: reCAPTCHA v3 on Request Form (+2 points)

**What**: The project already has `react-google-recaptcha-v3` installed and configured for the booking form. We reuse the same pattern on the Forgot Password page.

**Files changed**:
- `src/pages/ForgotPassword.tsx` -- Wrap with `GoogleReCaptchaProvider`, call `executeRecaptcha('password_reset')` before submitting, pass token in the request body
- `supabase/functions/password-reset-request/index.ts` -- Accept optional `recaptchaToken` field, verify it against Google's API (using the existing `RECAPTCHA_SECRET_KEY` secret), reject if score < 0.5. If reCAPTCHA is not configured (no secret), skip verification gracefully (so preview/dev environments still work)

### Step 5: Device Fingerprint Rate Limiting (+2 points)

**What**: Add a lightweight client-side fingerprint (hash of screen resolution + timezone + language + platform) to rate limit by device in addition to IP and email. This prevents attackers from rotating IPs.

**Files changed**:
- `src/utils/deviceFingerprint.ts` (new) -- Generate a stable SHA-256 hash from `navigator.language + screen.width + screen.height + Intl.DateTimeFormat().resolvedOptions().timeZone + navigator.platform`
- `src/pages/ForgotPassword.tsx` -- Import and send fingerprint with request
- `supabase/functions/password-reset-request/index.ts` -- Accept `deviceFingerprint`, store in `password_reset_attempts`, add a fingerprint-based rate limit check (max 5 requests per fingerprint per 15 minutes)
- **Database migration**: Add `device_fingerprint TEXT` column to `password_reset_attempts`, add index on `(device_fingerprint, attempted_at DESC)`
- Update `check_password_reset_rate_limit` function to accept and check `p_device_fingerprint`

---

## Files Summary

| File | Action |
|------|--------|
| Database migration | Add `correlation_id` to tokens + attempts; create `security_alerts` table; create `password_reset_funnel_stats` view + health function; add `device_fingerprint` to attempts; update rate limit function |
| `src/utils/deviceFingerprint.ts` | **Create** -- lightweight browser fingerprint generator |
| `src/pages/ForgotPassword.tsx` | Add reCAPTCHA provider + execution; send device fingerprint |
| `supabase/functions/password-reset-request/index.ts` | Add correlation ID generation + logging; reCAPTCHA verification; device fingerprint rate limiting |
| `supabase/functions/password-reset-validate-otp/index.ts` | Read + log correlation ID; security alert on 3+ failures |
| `supabase/functions/password-reset-validate-token/index.ts` | Read + log correlation ID |
| `supabase/functions/password-reset-set-password/index.ts` | Read + log correlation ID; security alert on 3+ failures |
| `supabase/functions/send-password-reset-email/index.ts` | Accept + log correlation ID |

## Projected Final Score: 100 / 100

| Category | Current | After |
|----------|---------|-------|
| Architecture | 15 | 15 |
| Security | 18 | 22 (+CAPTCHA +fingerprint) |
| Error Handling | 14 | 14 |
| Backend Functions | 19 | 19 |
| Database | 9 | 10 (+view +alerts table) |
| UX Flow | 9 | 9 |
| Observability | 4 | 11 (+correlation IDs +funnel view +alerting) |
| **Total** | **88** | **100** |

## Risk

Low. reCAPTCHA reuses existing infrastructure (same library, same config pattern). Correlation IDs are additive logging with no behavioral change. Device fingerprint is a supplementary rate limit layer that degrades gracefully if the client doesn't send it. The monitoring view is read-only SQL.

