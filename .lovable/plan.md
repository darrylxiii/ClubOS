

# MFA Setup Crash Fix

## Root Cause

Three interconnected bugs:

1. **MfaSetup forces re-enrollment on every visit** even when user already has a verified TOTP factor. It elevates to AAL2, then **unenrolls the existing factor** and enrolls a new one. Per your requirement: if MFA is already set up, just go to `/home`.

2. **After MFA verify/complete, the `auth-prefetch` React Query cache is stale.** The cache (5-min staleTime) still has `hasVerifiedTotp: false` from before enrollment. When navigating to `/home`, `ProtectedRoute` reads the stale cache, sees no verified TOTP, and redirects back to `/mfa-setup` — creating a crash loop.

3. **No cache invalidation after MFA state changes.** Neither `MfaSetup.tsx` nor `TwoFactorSettings.tsx` invalidate the `auth-prefetch` query after enrolling/unenrolling factors.

## Fixes

### Fix 1: MfaSetup — skip enrollment if already verified (MfaSetup.tsx)

Change the `checkExisting` logic:
- If AAL1 with verified factor exists → elevate to AAL2 (verify identity) → then **redirect to `/home`** instead of unenrolling and re-enrolling
- If AAL2 with verified factor → redirect to `/home` (already correct)
- Only proceed to enrollment if NO verified factors exist

Remove the elevate-then-unenroll-then-enroll flow entirely. The `handleElevate` function should verify the code and then navigate to `/home`, not proceed to enrollment.

### Fix 2: Invalidate auth-prefetch cache after MFA changes (MfaSetup.tsx)

After successful MFA verification (step → 'complete'), call `queryClient.invalidateQueries({ queryKey: ['auth-prefetch'] })` before navigating to `/home`. This ensures `ProtectedRoute` sees the updated `hasVerifiedTotp: true`.

### Fix 3: Invalidate auth-prefetch cache in TwoFactorSettings (TwoFactorSettings.tsx)

After enable/disable MFA operations, also invalidate the cache so Settings and ProtectedRoute stay in sync.

### Fix 4: MfaSetup 'complete' step — auto-redirect with delay (MfaSetup.tsx)

Instead of requiring a button click on the complete step, auto-redirect to `/home` after 1.5s. This prevents the user from sitting on a page where stale state could cause issues.

---

## Files to modify

| File | Change |
|------|--------|
| `src/pages/MfaSetup.tsx` | Skip enrollment if verified factor exists; invalidate cache; fix elevate flow to just verify+redirect |
| `src/components/TwoFactorSettings.tsx` | Invalidate `auth-prefetch` cache after enable/disable |

## Technical Details

**MfaSetup.tsx changes:**
- `checkExisting`: If AAL2 + verified → redirect `/home` (keep). If AAL1 + verified → elevate step (keep). If no verified → proceed to intro (keep).
- `handleElevate`: After successful verify, instead of unenrolling + going to 'intro', invalidate cache and navigate to `/home`.
- `handleVerify` (new factor): After success, invalidate `auth-prefetch` cache, then set step to 'complete'.
- 'complete' step: Auto-navigate to `/home` after 1.5s with cache invalidation.

**TwoFactorSettings.tsx changes:**
- After `handleVerifyAndEnable` success, `handleDisableMFA` success, and `handleRemoveFactor` success: call `queryClient.invalidateQueries({ queryKey: ['auth-prefetch'] })`.

