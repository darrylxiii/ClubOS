

# Fix: Google OAuth 403 — Unauthorized Redirect URI

## Root Cause

The switch from `lovable.auth.signInWithOAuth()` to `supabase.auth.signInWithOAuth()` broke Google sign-in because the Supabase callback URL (`https://dpjucecmoyfzrduhlctt.supabase.co/auth/v1/callback`) is not registered as an authorized redirect URI in Google's OAuth configuration. The managed auth module (`@lovable.dev/cloud-auth-js`) routes through a different callback URL that IS authorized.

## The Fix

Revert Google and Apple OAuth back to the managed `lovable.auth.signInWithOAuth()` calls, but ensure redirect mode is used (not popup). The `redirect_uri` parameter should be set to `window.location.origin` so the user returns to the correct domain after authentication.

## Changes

| File | Change |
|---|---|
| `src/pages/Auth.tsx` | Revert Google + Apple handlers back to `lovable.auth.signInWithOAuth()` with `redirect_uri: window.location.origin` |
| `src/pages/InviteAcceptance.tsx` | Same revert |
| `src/pages/Settings.tsx` | Same revert |

## Code Pattern

```typescript
import { lovable } from "@/integrations/lovable/index";

// Google sign-in — uses managed auth with redirect
const { error } = await lovable.auth.signInWithOAuth("google", {
  redirect_uri: window.location.origin,
});
```

This routes through the managed auth callback (which Google trusts), then redirects the user back to your custom domain. The managed module handles the redirect flow — the earlier "popup blocked" error was a preview-environment issue, not a production one.

## Why This Works

- The managed auth module has its callback URL pre-registered with Google
- Setting `redirect_uri` to `window.location.origin` ensures the user lands back on `os.thequantumclub.com` (or the preview URL)
- The 403 goes away because the correct, authorized callback URL is used

