

# Fix: Google OAuth Still Redirecting to lovable.app on Custom Domain

## Problem
The `skipBrowserRedirect` approach sends the user to Google correctly, but after Google sends the authorization code back to Supabase's callback endpoint, Supabase redirects the user to its configured Site URL (`thequantumclub.lovable.app`) rather than `os.thequantumclub.com`. The `redirectTo` parameter is being ignored or overridden.

## Root Cause
Supabase's OAuth callback always redirects to the Site URL unless the redirect URL is explicitly allowlisted. On Lovable Cloud, the correct approach is to use managed authentication via `@lovable.dev/cloud-auth-js`, which properly handles custom domain redirects by using `window.location.origin` as the `redirect_uri`.

## Fix

### Step 1: Configure Social Login (Google)
Use the Lovable Cloud social login configuration tool to generate the managed auth module at `src/integrations/lovable/`. This creates the `lovable.auth` client that handles OAuth correctly on custom domains.

### Step 2: Update `src/lib/oauth-helpers.ts`
Replace the direct `supabase.auth.signInWithOAuth()` calls with `lovable.auth.signInWithOAuth()` for Google and Apple (the two providers supported by managed auth). LinkedIn stays on the direct Supabase call since it is not supported by managed auth.

```
// For Google/Apple: use managed auth
import { lovable } from "@/integrations/lovable/index";

lovable.auth.signInWithOAuth("google", {
  redirect_uri: window.location.origin,
});
```

### Step 3: Update `src/pages/Auth.tsx`
Modify `handleGoogleAuth` and `handleAppleAuth` to use the managed auth client directly instead of `signInWithOAuthCustomDomain`. LinkedIn keeps the existing `signInWithOAuthCustomDomain` helper.

### Step 4: Update `src/pages/Settings.tsx` and `src/pages/InviteAcceptance.tsx`
Apply the same managed auth pattern for Google/Apple OAuth flows in these files.

### Files to Modify
| File | Change |
|------|--------|
| `src/lib/oauth-helpers.ts` | Keep for LinkedIn only; Google/Apple use managed auth |
| `src/pages/Auth.tsx` | Use `lovable.auth.signInWithOAuth("google", ...)` for Google/Apple |
| `src/pages/Settings.tsx` | Same pattern for account linking |
| `src/pages/InviteAcceptance.tsx` | Same pattern for invite acceptance |

### PWA Requirement
The project uses `vite-plugin-pwa`. The `/~oauth` route must be added to the service worker's `navigateFallbackDenylist` so managed auth callbacks are never cached.

### No Database Changes Required

