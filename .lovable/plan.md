

# Login + Password System Security Audit

## Overall Score: 72/100

The system is well above average for a startup platform. The custom password reset flow, login lockout, OTP hashing, password history, and breached password detection are genuinely impressive. But several bugs and gaps prevent a higher score.

---

## Scoring Breakdown

| Category | Score | Max | Notes |
|---|---|---|---|
| Password Policy & Strength | 14 | 15 | Strong: 12-char min, upper/lower/number/special, HIBP breach check, history (last 5). Minor: no dictionary check. |
| Password Reset Flow | 13 | 15 | Custom token + OTP dual path, PBKDF2 hashed OTP, 10-min expiry, 5-attempt OTP limit, correlation IDs, email retries. Solid. |
| Login Lockout / Brute Force | 8 | 15 | Progressive lockout exists BUT has a critical bug (see below). Also lockout is per-email only, not per-IP. |
| Session Management | 8 | 10 | Auth state listener + getSession() ordering is correct. Session tracking exists. No explicit idle timeout or forced re-auth for sensitive actions. |
| Rate Limiting | 9 | 10 | Password reset has DB-level rate limiting with device fingerprint. Login lockout provides another layer. reCAPTCHA v3 optional. |
| CORS & Transport | 5 | 5 | HTTPS enforced, CORS headers present on all edge functions. |
| Input Validation | 8 | 10 | Zod schemas on all edge functions. Email + password validated client-side. Minor: login form doesn't validate email format before calling lockout check. |
| OAuth Implementation | 5 | 5 | Google, Apple, LinkedIn OIDC. Custom domain redirect handling. Invite code persistence through OAuth flow. |
| MFA / 2FA | 3 | 5 | TOTP MFA challenge flow exists in Auth.tsx. No enforced MFA for admin/strategist roles. |
| Security Alerts & Audit | 7 | 5 | Above expectations: security_alerts table, password_reset_attempts logging, login_attempts tracking, session tracking, PostHog identification. Bonus points. |
| Error Handling & UX | 5 | 5 | Structured error codes (weak_password, reused, rate_limited). Clear user-facing messages. Generic "if account exists" for anti-enumeration. |

---

## Critical Bugs Found

### BUG 1: `LOCKOUT_THRESHOLDS.reverse()` Mutates Array In-Place (Severity: HIGH)

**File:** `supabase/functions/check-login-lockout/index.ts`, line 67

```typescript
for (const threshold of LOCKOUT_THRESHOLDS.reverse()) {
```

`Array.reverse()` mutates the original array. On the first request, `LOCKOUT_THRESHOLDS` gets reversed. On the second request to the same Deno isolate, it gets reversed AGAIN (back to ascending). This means:

- Odd requests: checks highest threshold first (correct)
- Even requests: checks lowest threshold first (wrong, always picks 30s lockout for 3+ attempts even if they have 20 failures)

The lockout protection oscillates between working correctly and being nearly useless depending on which request hits the same isolate.

**Fix:** Use `[...LOCKOUT_THRESHOLDS].reverse()` or `.toReversed()`.

### BUG 2: Double `req.json()` Call in `check-login-lockout` (Severity: MEDIUM)

**File:** `supabase/functions/check-login-lockout/index.ts`, lines 25 and 102

The request body is parsed once at line 25 to extract `email` and `action`. Then at line 102, `req.json()` is called AGAIN inside the `record` branch. But a `Request` body can only be consumed once. The second call will throw or return undefined, meaning `success` is always `undefined`, which falls through to `success || false` = always `false`.

This means successful login recordings never actually record `success: true` via this path. The lockout table never clears failed attempts through this function. The successful recording only works through the separate `record_login_attempt` RPC called from `useSecurityTracking`.

### BUG 3: Test Account Bypass Hardcoded (Severity: MEDIUM)

**File:** `src/components/ProtectedRoute.tsx`, line 74

```typescript
const isTestAccount = user.email?.includes('test') || user.email === 'darryl@thequantumclub.io';
```

Any user whose email contains "test" (e.g., `contest@gmail.com`, `test_hacker@evil.com`) bypasses onboarding and approval checks. This is a privilege escalation vector.

---

## Issues by Priority (to reach 100/100)

### P0 - Must Fix (blocking correct security behavior)

1. **Fix `LOCKOUT_THRESHOLDS.reverse()` mutation** - Use spread copy
2. **Fix double `req.json()` in `check-login-lockout`** - Parse body once, destructure both `email`, `action`, and `success` from the same parsed object
3. **Remove hardcoded test account bypass** - Use a feature flag or `user_metadata` field instead of email string matching

### P1 - Should Fix (meaningful security improvements)

4. **Add IP-based lockout** alongside email-based lockout. Currently an attacker can try unlimited passwords from different IPs against the same email without triggering per-IP lockout.

5. **Enforce MFA for admin/strategist roles** - These roles have access to sensitive candidate data. MFA should be mandatory, not optional.

6. **Add idle session timeout** - No automatic session expiry after inactivity. A stolen session token works indefinitely until the JWT expires. Implement a 30-minute idle timeout that forces re-authentication.

7. **Add CSRF protection to password reset** - The `password-reset-set-password` endpoint accepts any POST with a valid token. Add a one-time CSRF token bound to the browser session.

8. **CORS origin should not be wildcard** - All edge functions use `Access-Control-Allow-Origin: *`. For auth-related functions, restrict to `thequantumclub.lovable.app` and `os.thequantumclub.com`.

9. **`send-password-reset-email` and `send-password-changed-email` have `verify_jwt = false`** - These are internal functions called from other edge functions, not from the client. They should require JWT or be called via service role only. Currently anyone can invoke them directly with arbitrary payloads to send emails from your domain.

### P2 - Nice to Have (polish)

10. **Password dictionary check** - Beyond HIBP breach check, reject common patterns like "Password123!" which technically meets all rules but is trivially guessable.

11. **Login attempt recording is duplicated** - Both `check-login-lockout` edge function AND `useSecurityTracking.recordLoginAttempt` RPC record login attempts separately. This creates duplicate entries and confusion about which system is the source of truth.

12. **Password reset token in URL query parameter** - The magic link puts the token in `?token=...` which gets logged in server access logs, browser history, and referrer headers. Consider using a URL fragment (`#token=...`) instead, which is never sent to the server.

13. **`send-password-reset-email` logs the recipient email** - Line 41: `console.log(...Sending to: ${email}...)`. PII in logs.

14. **No account recovery without email access** - If a user loses access to their email, there is no recovery path (no recovery codes, no admin manual reset flow, no phone-based verification).

15. **Device fingerprint in `useSecurityTracking` is weak** - Uses a simple hash that only produces a short hex string. The `deviceFingerprint.ts` utility uses SHA-256 properly but is only used for password reset, not for general login tracking.

---

## Summary: Path from 72 to 100

| Action | Points Gained |
|---|---|
| Fix `LOCKOUT_THRESHOLDS.reverse()` mutation | +5 |
| Fix double `req.json()` in check-login-lockout | +3 |
| Remove test account bypass | +3 |
| Add IP-based lockout | +4 |
| Enforce MFA for elevated roles | +3 |
| Add idle session timeout | +2 |
| Restrict CORS origins on auth functions | +2 |
| Protect internal email functions from direct invocation | +2 |
| Use URL fragment for reset token | +1 |
| Deduplicate login attempt recording | +1 |
| Add dictionary/pattern password check | +1 |
| Add account recovery alternatives | +1 |

Total potential: +28 points, bringing the score to 100/100.

The foundation is strong. The biggest wins come from fixing the three bugs (which are straightforward one-line fixes) and adding IP-based lockout + MFA enforcement for privileged roles.
