

# Fix: Google OAuth Redirecting to lovable.app Instead of Custom Domain

## Problem
When signing in with Google on `os.thequantumclub.com`, the Lovable auth-bridge intercepts the OAuth callback and redirects to `thequantumclub.lovable.app` instead of back to the custom domain. This causes a broken redirect with an error about being unable to exchange the external code.

## Root Cause
The auth-bridge (built into Lovable's preview infrastructure) handles OAuth flows automatically on `*.lovable.app` domains, but on custom domains like `os.thequantumclub.com` it misdirects the callback. The current code uses `supabase.auth.signInWithOAuth()` without `skipBrowserRedirect`, so the auth-bridge takes over.

## Fix
Modify `handleGoogleAuth`, `handleAppleAuth`, and `handleLinkedInAuth` in `src/pages/Auth.tsx` to detect when running on a custom domain. When on a custom domain, use `skipBrowserRedirect: true` to get the OAuth URL directly, then manually redirect -- bypassing the auth-bridge entirely.

### File: `src/pages/Auth.tsx`

For each OAuth handler (`handleGoogleAuth`, `handleAppleAuth`, `handleLinkedInAuth`):

1. **Detect custom domain**:
```
const isCustomDomain =
  !window.location.hostname.includes('lovable.app') &&
  !window.location.hostname.includes('lovableproject.com') &&
  !window.location.hostname.includes('localhost');
```

2. **If custom domain**: pass `skipBrowserRedirect: true`, get the OAuth URL from the response, validate it, then do `window.location.href = data.url`

3. **If Lovable domain**: keep the existing flow unchanged (the auth-bridge handles it correctly there)

This same pattern will also be applied in `src/pages/Settings.tsx` and `src/pages/InviteAcceptance.tsx` where OAuth is also initiated.

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Add custom-domain detection + `skipBrowserRedirect` to all three OAuth handlers |
| `src/pages/Settings.tsx` | Same pattern for the account-linking OAuth flow |
| `src/pages/InviteAcceptance.tsx` | Same pattern for the invite acceptance OAuth flow |

### No Database or Edge Function Changes Required

