

# Fix: Google OAuth Popup Blocked in Preview

## Root Cause (confirmed from library source code)

The `@lovable.dev/cloud-auth-js` library has two authentication flows:

- **When NOT in an iframe**: Performs a full-page redirect to `/~oauth/initiate` — this works perfectly and is the production behavior.
- **When IN an iframe** (Lovable preview): Opens a popup window — Google blocks this with `ERR_BLOCKED_BY_RESPONSE` due to its `Cross-Origin-Opener-Policy` headers.

You are testing inside the Lovable preview, which is an iframe. The library detects this and uses the popup flow, which Google refuses to render in.

## Why it "worked before"

Previously you were likely using `supabase.auth.signInWithOAuth()` which always does a full-page redirect (no popup). That worked in the preview but caused a 403 on production because the Supabase callback URL is not registered with Google. We then switched to the managed auth library, which uses the correct callback URL but uses popups when in an iframe.

## The Fix

**No code changes are needed.** The current implementation is correct and will work on your production domain. The popup issue is a Lovable preview limitation that cannot be fixed from application code — it is caused by Google's security headers blocking rendering in popup windows opened from within iframes.

### To verify it works:

1. Click **Publish** to deploy the current code
2. Open `https://os.thequantumclub.com/auth` directly in a new browser tab (not the preview)
3. Click "Login with Google" — the page will redirect (not popup) to Google, then back to your domain

### Why production works differently:

On `os.thequantumclub.com`, the library detects the page is NOT in an iframe and performs a standard full-page redirect:
```
window.location.href = "/~oauth/initiate?provider=google&redirect_uri=https://os.thequantumclub.com&state=..."
```

No popup is involved — Google renders normally and redirects back to your domain.

## Summary

| Environment | Library mode | Behavior | Status |
|---|---|---|---|
| Lovable preview (iframe) | Popup | Google blocks popup | Cannot fix (browser/Google restriction) |
| Production domain (top-level) | Full redirect | Google renders normally | Works correctly |

## No file changes required

The current `Auth.tsx`, `InviteAcceptance.tsx`, and `Settings.tsx` all correctly use `lovable.auth.signInWithOAuth()` with `redirect_uri: window.location.origin`. This is the correct, production-ready implementation. Just publish and test on your live domain.

