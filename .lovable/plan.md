
# Full Authentication System Audit

## Current Score: 58 / 100

This is a thorough audit of every authentication flow: login, signup, OAuth, email verification, SMS verification, onboarding, request access, password reset, and post-auth routing.

---

## Scoring Breakdown

### 1. Google OAuth: CRITICAL (8/20)

**Issue A: Not using Lovable Cloud managed OAuth**
The `Auth.tsx` page calls `supabase.auth.signInWithOAuth({ provider: 'google' })` directly (line 395). This is the ROOT CAUSE of redirect issues. The project should use `lovable.auth.signInWithOAuth("google")` from `@lovable.dev/cloud-auth-js`, which correctly uses `window.location.origin` as redirect and works with custom domains.

**Issue B: Manual OAuth callback polling loop**
Lines 100-177 implement a manual `while` loop that polls `getSession()` up to 20 times (10 seconds) waiting for the OAuth session. This is fragile and causes the "wrong URL redirect" reports. The managed auth handles this automatically.

**Issue C: Apple and LinkedIn also use direct Supabase calls**
- Apple OAuth (line 422): should use `lovable.auth.signInWithOAuth("apple")`
- LinkedIn OAuth (line 445): uses `linkedin_oidc` provider via direct Supabase -- LinkedIn is NOT supported by Lovable Cloud, so this should be clearly disabled/locked (per branding memory, it already shows "Coming Soon" visually but the button still calls `handleLinkedInAuth`)

**Issue D: OAuthDiagnostics only shown in dark mode**
Line 694: `{resolvedTheme === 'dark' && <OAuthDiagnostics />}` -- diagnostics should not be theme-dependent.

**Fixes:**
1. Run `configure-social-auth` tool to set up Lovable Cloud managed Google/Apple OAuth
2. Replace `supabase.auth.signInWithOAuth` calls with `lovable.auth.signInWithOAuth`
3. Remove the manual OAuth callback polling loop (lines 78-181) -- managed auth handles it
4. Actually disable LinkedIn button `onClick` (set to no-op or show toast)
5. Remove theme gate on OAuthDiagnostics

### 2. Post-Login Redirect Logic: BROKEN (6/15)

**Issue A: Competing redirect logic in 3 places**
1. `Auth.tsx` (line 192-233): Checks `profile.onboarding_completed_at` and routes to `/oauth-onboarding` or `/home`
2. `ProtectedRoute.tsx` (line 37-98): Checks `onboarding_completed_at`, `account_status`, `user_roles` and routes to `/oauth-onboarding` or `/pending-approval`
3. `OAuthOnboarding.tsx` (line 55-90): Checks `onboarding_completed_at` and `account_status` and routes to `/club-home` or `/pending-approval`

These 3 systems can conflict. For example:
- Auth.tsx routes to `/home` if onboarding is done, but ProtectedRoute then checks `account_status` and may redirect to `/pending-approval`
- OAuthOnboarding routes to `/club-home` on completion, but Auth.tsx routes to `/home`. Different destinations.

**Issue B: No `postLoginRedirect` support**
`JoinWorkspacePage.tsx` stores `sessionStorage.postLoginRedirect` but Auth.tsx never reads it. Users who were redirected to `/auth` from a workspace invite link lose their redirect.

**Fixes:**
1. Centralize redirect logic: Auth.tsx should ONLY redirect to `/home` (let ProtectedRoute handle the rest)
2. OAuthOnboarding completion should redirect to `/home` (not `/club-home`)
3. Auth.tsx should check `sessionStorage.postLoginRedirect` and honor it
4. Remove duplicate onboarding check from Auth.tsx -- ProtectedRoute already handles it

### 3. SMS Verification: FRAGILE (10/15)

**Issue A: Twilio is configured but dev mode bypass is active**
The `.env` file has `DENO_ENV=development` which enables the fixed code `123456` bypass in the `send-sms-verification` edge function. In production, this env var should NOT be set to "development". Users may not receive real SMS codes because of this.

**Issue B: No resend button visible until after first send**
In `OAuthOnboarding.tsx`, the resend button only shows after `otpSent` is true. If the initial send fails silently (network error), the user has no way to retry without refreshing.

**Issue C: No "change phone number" option after OTP sent**
Once OTP is sent, the phone input is disabled but there is no way to change it if the user entered the wrong number.

**Fixes:**
1. Remove `DENO_ENV=development` from `.env` (or set to "production")
2. Add a "Change number" button that calls `resetVerification()` and re-enables the phone input
3. Show a retry/resend option even on initial send failure

### 4. Email Verification Flow: ADEQUATE (11/15)

**Issue A: CORS headers inconsistency**
`verify-email-code` has `x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version` missing from CORS headers compared to `send-sms-verification`. This was flagged in memory as causing "Failed to fetch" errors.

**Issue B: No "resend email code" button**
Auth.tsx email verification view (line 560-592) has no resend button. User can only go "back to login" if code doesn't arrive.

**Fixes:**
1. Add missing CORS headers to `verify-email-code` and `send-email-verification`
2. Add a "Resend Code" button to the email verification view in Auth.tsx

### 5. Onboarding Flows: CONFUSING (8/15)

**Issue A: TWO separate onboarding pages**
- `/onboarding` renders `CandidateOnboarding` (the enterprise-grade multi-step flow)
- `/oauth-onboarding` renders `OAuthOnboarding` (a simpler 4-step flow)

Both exist but serve different purposes without clear separation:
- `/onboarding` is linked as "Request Access" from Auth.tsx but it's actually a full onboarding form, not a waitlist
- `/oauth-onboarding` is the post-OAuth onboarding flow

**Issue B: "Request Access" link goes to wrong place**
Auth.tsx line 680: `<Link to="/onboarding">Request Access</Link>` sends users to the full `CandidateOnboarding` flow. Per project memory, "Request Access" should be a waitlist submission only (using `EnhancedInviteGate`). The `/onboarding` page requires authentication (it uses `useAuth` and `useProfile`), so unauthenticated users hitting it will have a broken experience.

**Fixes:**
1. Change "Request Access" link to open the `EnhancedInviteGate` waitlist modal instead of navigating to `/onboarding`
2. Clarify routing: `/onboarding` should redirect to `/oauth-onboarding` if accessed directly (they serve overlapping purposes)
3. Or: make "Request Access" use `join-waitlist` edge function directly

### 6. Password Reset: SOLID (13/15)

**Issue A: No i18n**
`ForgotPassword.tsx` has hardcoded English strings (lines 85-147). All other auth pages use `useTranslation('auth')`.

**Issue B: No link from signup mode**
"Forgot Password" link only shows in login mode (line 685: `{isLogin && ...}`). This is correct UX but could be more discoverable.

**Fixes:**
1. Add i18n to `ForgotPassword.tsx`

### 7. Auth Page CRO: NEEDS WORK (6/15)

**Issue A: No toggle between login/signup visible**
The Auth page has `isLogin` state but no visible tab or toggle button to switch between modes. Users can only switch via URL parameters or invite codes. The "Request Access" link is the only way to get to signup-like flow.

**Issue B: "or" divider not internationalized**
Line 648: hardcoded "or" text between form and OAuth buttons.

**Issue C: Signup requires invite code but validation UX is poor**
If `inviteValid !== true`, the signup button is disabled (line 639) but there is no clear explanation of WHY it's disabled or HOW to get an invite code.

**Issue D: No social proof or trust signals on auth page**
Enterprise CRO best practice: show member count, logos, testimonials, or security badges.

**Issue E: Form inputs lack aria-labels**
Inputs use placeholder text but no proper `<Label>` elements or `aria-label` for accessibility (WCAG AA requirement from project standards).

**Fixes:**
1. Add a clear login/signup toggle (tabs or link)
2. Internationalize "or" divider
3. Add clear messaging when signup is disabled: "You need an invite code to join"
4. Add trust badges/social proof beneath the form
5. Add proper `<Label>` elements to all form inputs

### 8. Security: STRONG (12/15)

The security infrastructure is solid:
- Account lockout via `check-login-lockout` edge function
- Rate limiting on verification endpoints
- Cryptographic OTP generation
- CSRF protection (per memory)
- Input validation with Zod
- Password strength enforcement (12+ chars, mixed case, numbers, special)

**Issue A: Test account bypass in ProtectedRoute**
Line 66: `const isTestAccount = user.email?.includes('test')` -- ANY email containing "test" bypasses onboarding. This is a security hole. Someone could register `test@attacker.com`.

**Issue B: `OAuthDiagnostics` component exposed in production**
Even though it's behind dark mode gate, diagnostic info shouldn't be in production builds.

**Fixes:**
1. Change test account check to an exact email match or remove it entirely
2. Remove or conditionally compile `OAuthDiagnostics` for dev only

---

## Summary Table

| Category | Score | Max | Key Issue |
|---|---|---|---|
| Google OAuth | 8 | 20 | Not using managed auth; manual polling loop |
| Post-Login Redirects | 6 | 15 | 3 competing redirect systems; no postLoginRedirect |
| SMS Verification | 10 | 15 | Dev mode bypass active; no change-number option |
| Email Verification | 11 | 15 | Missing CORS headers; no resend button |
| Onboarding Flows | 8 | 15 | Two overlapping pages; Request Access goes wrong place |
| Password Reset | 13 | 15 | No i18n |
| Auth Page CRO | 6 | 15 | No login/signup toggle; no trust signals |
| Security | 12 | 15 | Test email bypass; diagnostics in prod |
| **Total** | **58** | **100** | |

---

## Implementation Plan (Priority Order)

### Phase 1: Critical Fixes (58 to 78)
1. Configure Lovable Cloud managed Google/Apple OAuth via tool
2. Replace direct `supabase.auth.signInWithOAuth` with `lovable.auth.signInWithOAuth` in Auth.tsx
3. Remove manual OAuth callback polling loop
4. Disable LinkedIn button onClick handler (show "Coming Soon" toast)
5. Centralize post-login redirect: remove duplicate onboarding check from Auth.tsx, honor `postLoginRedirect`
6. Fix OAuthOnboarding completion redirect to `/home` instead of `/club-home`
7. Remove `DENO_ENV=development` from .env
8. Fix test account bypass to exact email match

### Phase 2: Reliability Fixes (78 to 90)
9. Add CORS headers to `verify-email-code` to match `send-sms-verification`
10. Add "Resend Code" button to email verification in Auth.tsx
11. Add "Change Number" button to SMS verification in OAuthOnboarding
12. Change "Request Access" link to open EnhancedInviteGate waitlist dialog
13. Remove OAuthDiagnostics from production or gate behind `import.meta.env.DEV`

### Phase 3: CRO and Polish (90 to 100)
14. Add login/signup toggle (tabs) to Auth page
15. i18n for ForgotPassword.tsx and "or" divider
16. Add proper `<Label>` elements to all auth form inputs
17. Add trust badges/social proof to auth page
18. Add clear "invite required" explanation when signup is disabled

---

## Technical Details

### Files to modify:
- `src/pages/Auth.tsx` -- OAuth switch, redirect cleanup, CRO improvements
- `src/pages/OAuthOnboarding.tsx` -- redirect fix, change-number button
- `src/pages/ForgotPassword.tsx` -- i18n
- `src/components/ProtectedRoute.tsx` -- remove test email bypass
- `supabase/functions/verify-email-code/index.ts` -- CORS headers
- `.env` -- remove DENO_ENV=development

### New files:
- `src/integrations/lovable/index.ts` -- auto-generated by configure-social-auth tool

### Dependencies:
- `@lovable.dev/cloud-auth-js` -- installed by configure-social-auth tool
