

# Fix: Google OAuth Redirect to Custom Domain

## Problem

After clicking "Sign in with Google" on `os.thequantumclub.com`, users are redirected to `thequantumclub.lovable.app` instead of back to the custom domain. This happens because the code calls `supabase.auth.signInWithOAuth()` directly, which uses the backend-configured Site URL (the Lovable URL) for redirects.

## Root Cause

The project uses `supabase.auth.signInWithOAuth()` in multiple files instead of the Lovable Cloud managed OAuth function `lovable.auth.signInWithOAuth()`. The managed solution properly handles redirect URLs for custom domains.

## Solution

### Step 1: Configure Lovable Cloud Social Auth

Use the `configure-social-auth` tool to generate the `src/integrations/lovable/` module and install the `@lovable.dev/cloud-auth-js` package. This sets up the managed OAuth infrastructure.

### Step 2: Update OAuth calls in all files

Replace `supabase.auth.signInWithOAuth(...)` with `lovable.auth.signInWithOAuth(...)` in the following files:

| File | What changes |
|------|-------------|
| `src/pages/Auth.tsx` | Google, Apple, and LinkedIn OAuth calls (~3 calls) |
| `src/pages/Settings.tsx` | OAuth linking call |
| `src/pages/InviteAcceptance.tsx` | OAuth call during invite acceptance |
| `src/components/OAuthDiagnostics.tsx` | Diagnostic OAuth URL check |
| `src/components/AuthDiagnostics.tsx` | Diagnostic OAuth URL check |

Each call changes from:
```typescript
import { supabase } from "@/integrations/supabase/client";

const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: redirectUrl,
    queryParams: { ... }
  }
});
```

To:
```typescript
import { lovable } from "@/integrations/lovable/index";

const { error } = await lovable.auth.signInWithOAuth("google", {
  redirect_uri: window.location.origin,
  extraParams: { ... }
});
```

### Important Notes

- Apple and LinkedIn providers are NOT supported by Lovable Cloud managed OAuth (only Google and Apple are). LinkedIn calls will need to remain as-is or be handled differently.
- The `redirect_uri: window.location.origin` ensures the user returns to whichever domain they started from.
- The diagnostics components can be simplified or kept using the old method since they only test URL generation without actual redirects.

