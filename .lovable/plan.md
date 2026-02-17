

# Password Reset System -- Full Scorecard

## Overall Score: 62 / 100

The system has solid architecture and security primitives but contains bugs that prevent real-world completion. Zero successful resets have ever occurred (0 password_history records, 0 used tokens out of 8 created, 0 logs for validate-otp or validate-token functions).

---

## Category Breakdown

### 1. Architecture and Design -- 14 / 15

| Aspect | Score | Notes |
|--------|-------|-------|
| Token lifecycle (request, validate, set) | 5/5 | Clean 3-step separation |
| Dual-channel delivery (OTP + magic link) | 5/5 | Good UX choice |
| Email templates (branded, security details) | 4/5 | Professional; OTP in preheader is a minor leak |

**Remaining issue**: The preheader in `send-password-reset-email` includes the OTP code in plaintext (`Your password reset code: ${otpCode}`). Email clients show preheaders in inbox previews, which means the OTP is visible without opening the email -- anyone glancing at the screen can read it.

---

### 2. Security -- 10 / 20

| Aspect | Score | Notes |
|--------|-------|-------|
| RLS on all 3 tables | 3/3 | Enabled, service-role-only for writes |
| Token expiry (10 min) | 3/3 | Appropriate |
| Brute-force protection (5 max attempts) | 3/3 | Correct increment-before-check pattern |
| Rate limiting (3/email, 10/IP per 15 min) | 2/3 | Works but logs `success: true` for non-existent users |
| OTP storage | 0/3 | **OTP stored in plaintext** in `password_reset_tokens.otp_code`; should be hashed |
| Token invalidation design | 0/3 | **Critical flaw**: invalidating old tokens via `is_used = true` + `used_at = now()` creates records that `set-password` cannot distinguish from legitimately validated tokens (both have `is_used = true` and recent `used_at`). An attacker with a previous magic_token from an intercepted email could use it within 15 min after the user requests a new code. |
| Session invalidation | 2/2 | Correctly calls `signOut(userId, 'global')` after password change |

---

### 3. Error Handling (Frontend) -- 12 / 15

| Aspect | Score | Notes |
|--------|-------|-------|
| ForgotPassword.tsx | 4/4 | Parses `FunctionsHttpError`, handles rate limits, timeout, network errors |
| ResetPasswordVerify.tsx | 4/4 | Parses error body, extracts `attempts_remaining`, shows specific messages |
| ResetPasswordNew.tsx | 3/4 | Parses error body for reuse and expiry; missing: no user feedback if the token was invalidated by a resend vs genuinely expired |
| ResetPasswordMagicLink.tsx | 1/3 | `validate-token` returns `{ valid: false }` with HTTP 200, so `error` is null; the code checks `!data?.valid` correctly BUT does not parse `FunctionsHttpError` for actual 4xx/5xx failures -- the error path falls through to a generic "Something went wrong" |

---

### 4. Backend Edge Functions -- 12 / 20

| Aspect | Score | Notes |
|--------|-------|-------|
| password-reset-request | 3/5 | **Broken fallback**: `listUsers({ page: 1, perPage: 1 })` fetches only the first user in the entire auth system, then does `.find(u => u.email === email)`. This only matches if the target happens to be the alphabetically first user. Users without a profile row will silently get no email. |
| password-reset-validate-otp | 5/5 | Correct: increment first, check after, return attempts_remaining |
| password-reset-validate-token | 2/5 | Marks token as `is_used` immediately (good for replay prevention) but creates the invalidation ambiguity described in Security above. Also returns HTTP 200 for invalid tokens (`{ valid: false }`) -- inconsistent with validate-otp which returns HTTP 400 for failures |
| password-reset-set-password | 2/5 | Token lookup query (`is_used = true AND used_at > 15min ago`) cannot distinguish validated tokens from invalidated-by-resend tokens. Password history check and global session invalidation are correct. |

---

### 5. Database and Indexing -- 8 / 10

| Aspect | Score | Notes |
|--------|-------|-------|
| Schema design | 4/5 | All necessary columns present; `otp_code` should not be plaintext |
| Indexes | 4/5 | Comprehensive: magic_token (unique), otp+email, user_id, expires_at, history user+date, attempts email+date and ip+date. Slight redundancy: both a unique constraint index and a separate btree index on `magic_token`. |

---

### 6. UX Flow -- 6 / 10

| Aspect | Score | Notes |
|--------|-------|-------|
| Request page (ForgotPassword) | 3/3 | Clear CTA, navigates to OTP entry after send |
| OTP entry (ResetPasswordVerify) | 2/3 | Auto-submit on 6 digits, countdown timer, resend cooldown, attempts display. Missing: no way to switch to magic link path from this page. |
| Set new password (ResetPasswordNew) | 1/2 | Password requirements checklist, match validation, strength indicator. Missing: no "show password" toggle. |
| Confirmation flow | 0/2 | **No success page**. After password change, `ResetPasswordNew` shows a toast and does `setTimeout(() => navigate('/auth'), 2000)`. The 2-second auto-redirect is too fast to read the toast, and there is no dedicated success screen. Users may not realize it worked. |

---

### 7. Observability and Ops -- 0 / 10

| Aspect | Score | Notes |
|--------|-------|-------|
| Logging | 0/3 | Edge function logs for validate-otp and validate-token are empty (never invoked or logs expired). No structured logging with correlation IDs. |
| Token cleanup | 0/3 | A `cleanup_expired_password_resets()` function exists in the migration but there is **no scheduled job** calling it. Expired tokens accumulate forever. |
| Monitoring/alerting | 0/2 | No alerts on repeated failures, no dashboard for reset completion rates. |
| Audit trail | 0/2 | `password_reset_attempts` only logs `request` type. No entries for `validate` or `set_password` attempts, making it impossible to debug where users drop off. |

---

## Remaining Bugs to Fix (7 items)

### BUG A: Token invalidation creates exploitable ambiguity (CRITICAL)
When a user clicks "Resend Code", `password-reset-request` sets old tokens to `is_used = true, used_at = now()`. The `set-password` function accepts tokens with `is_used = true AND used_at < 15 min`. This means invalidated tokens are indistinguishable from validated tokens. **Fix**: Add a `validated_by` column (values: `null`, `otp`, `magic_link`, `invalidated`) and have `set-password` require `validated_by IN ('otp', 'magic_link')`.

### BUG B: Auth user lookup fallback is non-functional (HIGH)
`listUsers({ page: 1, perPage: 1 })` returns 1 arbitrary user, not filtered by email. **Fix**: Use `supabaseAdmin.auth.admin.listUsers({ filter: email })` or just remove the fallback entirely (profile table should be the source of truth).

### BUG C: OTP stored in plaintext (MEDIUM)
The `otp_code` column stores the raw 6-digit code. If the database is compromised, all active OTPs are exposed. **Fix**: Store a bcrypt hash of the OTP; compare with `bcrypt.compare()` in validate-otp.

### BUG D: Email preheader leaks OTP (LOW)
`send-password-reset-email` sets `preheader: "Your password reset code: ${otpCode}"`. This is visible in email inbox previews without opening the email. **Fix**: Use a generic preheader like "You requested a password reset".

### BUG E: No token cleanup scheduled (MEDIUM)
`cleanup_expired_password_resets()` exists but is never called. Expired tokens and old attempts accumulate. **Fix**: Create a pg_cron job or a scheduled edge function to call it daily.

### BUG F: No success confirmation page (LOW)
After resetting, users get a 2-second toast then auto-redirect. **Fix**: Navigate to a dedicated `/reset-password/success` page with clear confirmation before manual redirect.

### BUG G: Audit logging incomplete (MEDIUM)
Only `request` attempts are logged. Validate and set-password attempts are not logged, making it impossible to diagnose where users fail. **Fix**: Add `attempt_type: 'validate_otp' | 'validate_token' | 'set_password'` entries in the edge functions.

---

## Implementation Plan

### Step 1: Add `validated_by` column to `password_reset_tokens`
- Database migration: `ALTER TABLE password_reset_tokens ADD COLUMN validated_by TEXT DEFAULT NULL`
- Update `password-reset-request` to set `validated_by = 'invalidated'` when cancelling old tokens
- Update `password-reset-validate-otp` to set `validated_by = 'otp'`
- Update `password-reset-validate-token` to set `validated_by = 'magic_link'`
- Update `password-reset-set-password` to require `validated_by IN ('otp', 'magic_link')`

### Step 2: Fix auth user lookup fallback
- In `password-reset-request`, remove the `listUsers` fallback entirely
- Profile table is the source of truth; users without profiles silently get no email (anti-enumeration)

### Step 3: Hash OTP codes
- In `password-reset-request`, store `bcrypt.hash(otpCode)` instead of plaintext
- In `password-reset-validate-otp`, use `bcrypt.compare(otp_code, token.otp_code)` instead of `===`
- Remove the `idx_password_reset_otp` index on `(otp_code, email)` since hashed values cannot be indexed for lookup; query by email + is_used + expires_at only (already the current pattern)

### Step 4: Fix email preheader
- In `send-password-reset-email`, change preheader to `"You requested a password reset for The Quantum Club"`

### Step 5: Add audit logging to validate and set-password functions
- In `password-reset-validate-otp`: insert attempt with `attempt_type: 'validate_otp'` and `success: true/false`
- In `password-reset-validate-token`: insert attempt with `attempt_type: 'validate_token'`
- In `password-reset-set-password`: insert attempt with `attempt_type: 'set_password'`

### Step 6: Add success confirmation page
- Create `src/pages/ResetPasswordSuccess.tsx` with clear confirmation, session invalidation notice, and login button
- Update `ResetPasswordNew.tsx` to navigate to `/reset-password/success` instead of auto-redirecting

### Step 7: Schedule token cleanup
- Add a pg_cron job: `SELECT cron.schedule('cleanup-password-resets', '0 3 * * *', 'SELECT cleanup_expired_password_resets()')`
- Or create a lightweight edge function called by an external scheduler

---

## Files Changed

| File | Action |
|------|--------|
| Database migration | Add `validated_by` column; schedule cleanup job |
| `supabase/functions/password-reset-request/index.ts` | Remove auth fallback; set `validated_by = 'invalidated'` on old tokens; hash OTP |
| `supabase/functions/password-reset-validate-otp/index.ts` | Use bcrypt compare for OTP; set `validated_by = 'otp'`; add audit log |
| `supabase/functions/password-reset-validate-token/index.ts` | Set `validated_by = 'magic_link'`; add audit log |
| `supabase/functions/password-reset-set-password/index.ts` | Require `validated_by IN ('otp', 'magic_link')`; add audit log |
| `supabase/functions/send-password-reset-email/index.ts` | Fix preheader |
| `src/pages/ResetPasswordSuccess.tsx` | Create success confirmation page |
| `src/pages/ResetPasswordNew.tsx` | Navigate to success page instead of auto-redirect |
| `src/App.tsx` | Add route for `/reset-password/success` |

## Projected Score After Fixes: 88 / 100

| Category | Before | After |
|----------|--------|-------|
| Architecture | 14 | 15 |
| Security | 10 | 18 |
| Error Handling | 12 | 14 |
| Backend Functions | 12 | 19 |
| Database | 8 | 9 |
| UX Flow | 6 | 9 |
| Observability | 0 | 4 |
| **Total** | **62** | **88** |

The remaining 12 points would require: structured logging with correlation IDs (3), monitoring dashboard for reset completion rates (3), full alerting on repeated failures (2), CAPTCHA on request form (2), and rate limit per-device fingerprint (2).

