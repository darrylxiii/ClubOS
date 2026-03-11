

# MFA Setup — Full Audit & Account Fix

## The Problem

Darryl's account (darryl@thequantumclub.nl) has a verified TOTP factor (`3586b533-db17-45cc-b1be-aa72b9834cce`) that was never actually set up with an authenticator app. The current code detects this orphaned factor and shows an "Enter your 6-digit code" screen — but there is no code to enter because no QR was ever scanned. The user is permanently locked out.

Additionally, there is no admin capability to reset MFA for any user, meaning this situation has no resolution path today.

---

## Root Cause

A TOTP factor was enrolled and verified during a previous session (likely a test or accidental flow completion), but the QR code was never saved to an authenticator app. The factor is now "verified" in the auth system but unusable in practice.

---

## Fixes

### 1. Create `admin-reset-mfa` edge function (New file)
An admin-only backend function that uses the service role key to call the Supabase Admin API to delete a user's MFA factors. This is the only way to clear a verified factor when the user has lost access — client-side `unenroll` requires AAL2 which the user can't reach.

Pattern follows `admin-force-password-reset`. Accepts `target_user_id` and `reason`, verifies calling user is admin, then calls the Admin API to list and delete all factors for the target user. Logs action to `comprehensive_audit_logs`.

### 2. Add "Reset MFA" button to admin user management
In `UnifiedUserManagement.tsx`, add a "Reset MFA" action button in the user edit dialog that calls the new edge function.

### 3. Add "Lost access" escape hatch to MFA setup page
On the `elevate` step in `MfaSetup.tsx`, add a "Lost access to your authenticator?" link that signs the user out and shows a toast explaining they need to contact an admin to reset their MFA.

### 4. Fix remaining code quality issues in `MfaSetup.tsx`
- Replace 5 `console.error` calls with `logger.error`
- Change `/dashboard` redirects to `/home`

---

## Files

| File | Action |
|------|--------|
| `supabase/functions/admin-reset-mfa/index.ts` | **New** — Admin endpoint to unenroll all MFA factors for a user via Admin API |
| `src/pages/MfaSetup.tsx` | Add lost-access escape hatch, replace `console.error` with `logger.error`, fix `/dashboard` → `/home` |
| `src/components/admin/UnifiedUserManagement.tsx` | Add "Reset MFA" button in user edit dialog |

### Immediate Account Fix
Once the `admin-reset-mfa` function is deployed, you (as admin) can use it from the user management page to clear Darryl's orphaned factor. After that, the MFA setup page will show the normal intro → QR code → verify flow.

