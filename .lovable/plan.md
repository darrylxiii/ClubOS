

# MFA Setup — "AAL2 Required" Fix

## The Problem

The MFA setup page crashes with **"AAL2 required to enroll a new factor"** every time the user clicks "Continue Setup". The auth logs show repeated `403 insufficient_aal` errors on `POST /factors`.

**Root cause**: The authentication system requires AAL2 (a session verified via MFA) to call the enrollment endpoint. But the user's current session is AAL1 (password-only). This creates a catch-22: you need MFA to set up MFA.

This happens when:
1. The user already has an existing verified TOTP factor (from a previous setup), OR
2. The project-level MFA enforcement is set to require AAL2 for all auth endpoints

The current code does not check the session's assurance level or handle this error gracefully.

## The Fix

Update `MfaSetup.tsx` to:

1. **Check assurance level on mount** using `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`. If the session is AAL1 but `nextLevel` is AAL2 (meaning a verified factor exists), show a **verification challenge step** first instead of the enrollment screen.

2. **Add an `'elevate'` step** to the flow: `'intro' | 'elevate' | 'verify' | 'complete'`. In the elevate step, the user enters their existing TOTP code to prove they have their authenticator. This elevates the session from AAL1 to AAL2.

3. **After elevation**, proceed to enrollment (unenroll old factor if resetting, then enroll new one).

4. **Handle `insufficient_aal` error gracefully** in `handleEnroll` — if it occurs, transition to the `'elevate'` step instead of showing a generic error toast.

```text
Current flow:
  intro → [enroll fails with 403] → error toast → stuck

Fixed flow:
  mount → check AAL level
    if AAL1 + existing factor → elevate step (verify existing TOTP)
    if AAL1 + no factors → intro → enroll (works at AAL1)
    if AAL2 → intro → enroll (works)
  
  elevate → user enters existing TOTP code → session elevated to AAL2
         → intro → enroll succeeds → verify → complete
```

### File to Edit

| File | Changes |
|------|---------|
| `src/pages/MfaSetup.tsx` | Add `'elevate'` step, check AAL on mount, handle `insufficient_aal` error in `handleEnroll`, add elevation UI with challenge/verify flow |

No database changes needed. No new files.

