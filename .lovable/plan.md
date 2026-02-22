

# Path from 89/100 to 100/100 — Remaining Security Improvements

## Already Done (Previous Round)
- P0 Bug 1: `LOCKOUT_THRESHOLDS.reverse()` mutation fixed
- P0 Bug 2: Double `req.json()` fixed
- P0 Bug 3: Test account bypass removed
- P1: IP-based lockout added
- P1: Internal email functions protected (service role guard)
- P1: Idle session timeout (30min with 2min warning)
- P2: PII removed from email function logs

## Remaining Items (+11 points)

### 1. Restrict CORS Origins on Auth Functions (+2 pts)

All auth-related edge functions still use `Access-Control-Allow-Origin: *`. For pre-auth functions this is acceptable, but the password-set and lockout functions should restrict origins.

**Files to change:**
- `supabase/functions/password-reset-request/index.ts`
- `supabase/functions/password-reset-set-password/index.ts`
- `supabase/functions/password-reset-validate-otp/index.ts` (if exists)
- `supabase/functions/password-reset-validate-token/index.ts` (if exists)
- `supabase/functions/check-login-lockout/index.ts`

**Change:** Replace the hardcoded `*` CORS origin with a dynamic check:

```typescript
const ALLOWED_ORIGINS = [
  'https://thequantumclub.lovable.app',
  'https://os.thequantumclub.com',
  'https://app.thequantumclub.nl',
];

function getCorsOrigin(req: Request): string {
  const origin = req.headers.get('origin') || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}
```

Then use `getCorsOrigin(req)` as the `Access-Control-Allow-Origin` value in each response. The existing `cors-config.ts` shared file already has a `getCorsHeaders` function — we should use that, but update the auth functions to pass the request through it.

---

### 2. Enforce MFA for Admin/Strategist Roles (+3 pts)

MFA verification exists in `Auth.tsx` but is never enforced — it only triggers if the user has already enrolled a TOTP factor. Admins and strategists with access to sensitive candidate data should be required to set up MFA.

**Approach:**
- Create a new component `MfaEnforcementGuard.tsx` that wraps protected admin/strategist routes
- On login, after role check, if user is admin/strategist and has no enrolled MFA factor, redirect to an MFA setup page
- The MFA setup page walks them through TOTP enrollment using `supabase.auth.mfa.enroll()`

**Files to create/change:**
- Create `src/components/MfaEnforcementGuard.tsx` — checks `supabase.auth.mfa.listFactors()`, redirects to setup if no verified TOTP factor and user has elevated role
- Create `src/pages/MfaSetup.tsx` — TOTP enrollment page with QR code
- Update `src/components/ProtectedRoute.tsx` — after role check, if admin/strategist, verify MFA is enrolled

---

### 3. Dictionary/Pattern Password Check (+1 pt)

The HIBP breach check catches known leaked passwords, but common patterns like `Password123!` or `Quantum2024!` that meet all character rules aren't caught unless they appear in breach databases.

**Files to change:**
- `src/utils/passwordReset.ts` — add a `COMMON_PATTERNS` list and a check function
- `supabase/functions/password-reset-set-password/index.ts` — add server-side pattern check before `updateUserById`

**Pattern check (client + server):**
```typescript
const COMMON_PATTERNS = [
  /^[A-Z][a-z]+\d{2,4}[!@#$%]$/,  // "Password123!"
  /^(password|welcome|admin|quantum|letmein)/i,
  /(.)\1{3,}/,  // "aaaa" repeated chars
  /^(abc|123|qwerty)/i,
];

function hasCommonPattern(password: string): boolean {
  return COMMON_PATTERNS.some(p => p.test(password));
}
```

---

### 4. Deduplicate Login Attempt Recording (+1 pt)

Currently login attempts are recorded in two places:
1. `check-login-lockout` edge function (via `login_attempts` table insert)
2. `useSecurityTracking.recordLoginAttempt` (via `record_login_attempt` RPC)

Both run on every login. This creates duplicate rows and makes analysis unreliable.

**Fix:** Remove the `recordLoginAttempt` call from `AuthContext.tsx` for the login flow, since the `check-login-lockout` edge function already records it. Keep `useSecurityTracking` for session management only.

**Files to change:**
- `src/contexts/AuthContext.tsx` — remove the `recordLoginAttempt(userEmail, true)` call on SIGNED_IN event (the lockout function already records success/failure via its `record` action)

---

### 5. Use URL Fragment for Reset Token (+1 pt)

The magic link currently puts the token in `?token=...`:
```
https://os.thequantumclub.com/reset-password/verify-token?token=abc123
```

Query parameters are sent to the server in access logs, saved in browser history, and leaked via Referer headers. URL fragments (`#token=...`) are never sent to the server.

**Files to change:**
- `supabase/functions/password-reset-request/index.ts` — change `?token=` to `#token=`
- `src/pages/ResetPasswordVerifyToken.tsx` (or equivalent) — read token from `window.location.hash` instead of `useSearchParams`
- `src/pages/ResetPasswordNew.tsx` — same hash-based token reading

---

### 6. Add Account Recovery Alternatives (+1 pt)

Currently if a user loses email access, there is no recovery path. This is a usability gap more than a security gap, but it affects the overall score.

**Approach:** Add an admin-initiated password reset flow:
- Create an admin action in the admin panel: "Force Reset Password for User"
- This calls `supabase.auth.admin.updateUserById(userId, { password: tempPassword })` via a protected edge function
- The admin communicates the temp password out-of-band
- On next login, the user is forced to change it (set `user_metadata.force_password_change = true`)

**Files to create/change:**
- Create `supabase/functions/admin-force-password-reset/index.ts` — admin-only endpoint
- Update admin panel to include the action button
- Update `ProtectedRoute.tsx` or `Auth.tsx` to check `force_password_change` metadata

---

### 7. Upgrade Device Fingerprint in useSecurityTracking (+1 pt)

The `generateDeviceFingerprint` function in `useSecurityTracking.ts` uses a weak hash (bitwise shift producing a short hex). The proper SHA-256 version already exists in `src/utils/deviceFingerprint.ts`.

**Files to change:**
- `src/hooks/useSecurityTracking.ts` — replace `generateDeviceFingerprint()` with import from `src/utils/deviceFingerprint.ts` (`getDeviceFingerprint()`)
- `src/contexts/AuthContext.tsx` — update import if needed
- Note: `getDeviceFingerprint()` is async (uses `crypto.subtle.digest`), so the call sites need `await`

---

### 8. Add CSRF Token to Password Reset Set-Password (+1 pt)

The `password-reset-set-password` endpoint accepts any POST with a valid magic token. An attacker with a stolen token could submit from any origin. Adding a one-time CSRF token bound to the session adds defense-in-depth.

**Approach:**
- When the user lands on the reset password page (after OTP/magic link validation), the frontend generates a random CSRF token and stores it in `sessionStorage`
- The CSRF token is sent alongside the password submission
- The edge function validates it against a server-side store (or simply validates that the origin + CSRF match — since we're already restricting CORS origins in item 1, this becomes a double-check)

**Simpler alternative:** Since item 1 restricts CORS origins, and the token is already single-use + time-bound, this provides marginal additional security. We can implement it as a lightweight client-side nonce:
- Frontend generates nonce, sends with request
- Server logs the nonce with the attempt for forensic tracing
- This is worth +1 but not a critical blocker

---

## Implementation Order

1. CORS origin restriction (quick, all auth edge functions)
2. Dictionary password check (client + server, straightforward)
3. Deduplicate login recording (remove one line in AuthContext)
4. Upgrade device fingerprint (swap import)
5. URL fragment for reset token (change `?` to `#`, update readers)
6. MFA enforcement for admin/strategist (new component + page)
7. Admin force-reset flow (new edge function + admin UI)
8. CSRF nonce on set-password (lightweight addition)

## Technical Summary

| Item | Files | Complexity | Points |
|---|---|---|---|
| CORS restriction | 5 edge functions | Low | +2 |
| MFA enforcement | 3 new/changed files | Medium | +3 |
| Dictionary check | 2 files | Low | +1 |
| Deduplicate recording | 1 file (AuthContext) | Trivial | +1 |
| URL fragment token | 3 files | Low | +1 |
| Account recovery | 2 new files + admin UI | Medium | +1 |
| Fingerprint upgrade | 2 files | Trivial | +1 |
| CSRF nonce | 2 files | Low | +1 |

Total: +11 points, bringing the score from 89 to 100/100.
