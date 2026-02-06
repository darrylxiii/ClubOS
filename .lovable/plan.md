

# Fix: Google OAuth Redirect on Custom Domain (os.thequantumclub.com)

## Problem

When users on `os.thequantumclub.com` click "Sign in with Google," they complete authentication but get redirected back to `thequantumclub.lovable.app` instead of `os.thequantumclub.com`.

**Root cause**: The authentication system's Site URL and redirect allow list are configured with Lovable URLs only. The custom domain `os.thequantumclub.com` is not registered as an allowed redirect destination.

## Fix Required

### Step 1: Update Authentication Redirect Allow List

Add `https://os.thequantumclub.com` to the authentication redirect URI allow list. This needs to be done in the Lovable Cloud authentication settings.

Specific URLs to add:
- `https://os.thequantumclub.com`
- `https://os.thequantumclub.com/auth`
- `https://os.thequantumclub.com/**` (wildcard for all paths)

### Step 2: Update Site URL (optional but recommended)

If `os.thequantumclub.com` is the primary production domain, the Site URL in the authentication config should be changed from the current value (`https://bytqc.com` or the Lovable URL) to `https://os.thequantumclub.com`.

### Step 3: Update Edge Function Fallback URL

In `supabase/functions/_shared/app-config.ts`, the fallback `APP_URL` is `https://bytqc.com`. This should be updated to `https://os.thequantumclub.com` if that is now the primary domain, so all backend-generated links (emails, notifications) point to the correct domain.

## Code Changes

| File | Change |
|------|--------|
| `supabase/functions/_shared/app-config.ts` | Update fallback from `bytqc.com` to `os.thequantumclub.com` |

## No Client-Side Code Changes Needed

The client code already uses `window.location.origin` for redirects, which correctly resolves to `https://os.thequantumclub.com` when accessed from that domain. The issue is purely a backend/auth configuration problem.

## Important Note

The redirect allow list update must be done through the Lovable Cloud authentication settings. I will configure this as part of the implementation.

