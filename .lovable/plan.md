

# Fix: Build Error + Google OAuth on Production Domain

## Two Issues to Resolve

### Issue 1: Build Error — Missing `@mantine/core` styles

The `@blocknote/mantine` package imports `@mantine/core/styles/ScrollArea.css`, but `@mantine/core` is not installed. The previous attempt to add it did not take effect.

**Fix:** Add `@mantine/core@^7.0.0` as a dependency. If the package manager still fails to resolve it, add a Vite alias to suppress the missing CSS import as a fallback.

### Issue 2: Google OAuth — `ERR_BLOCKED_BY_RESPONSE` on production domain too

You confirmed this error also occurs on `os.thequantumclub.com`, not just in the preview. This means the managed auth library (`@lovable.dev/cloud-auth-js`) is trying to open a **popup** for Google sign-in, and the popup is being blocked — either by the browser's popup blocker or by Google's response headers on the popup window.

**Fix:** Switch from popup mode to **redirect mode**. Instead of opening a popup (which browsers aggressively block), redirect the full page to Google's consent screen. The user authenticates there and gets redirected back to your app. This is more reliable and the standard approach for production apps.

The `lovable.auth.signInWithOAuth` function should handle this automatically when called from a top-level page context, but the popup may be the library's default behavior. We need to check if the library supports a `mode: "redirect"` option, or fall back to using `supabase.auth.signInWithOAuth()` with `redirectTo` pointing to the custom domain — which does a full-page redirect and avoids popup issues entirely.

**Approach:** Revert Google and Apple OAuth to use `supabase.auth.signInWithOAuth()` with explicit `redirectTo: window.location.origin + "/auth"`. This performs a full-page redirect (no popup) and works reliably on custom domains. The managed auth module is not needed if the Supabase project's redirect allow list includes the custom domain.

## Changes

| File | Change |
|---|---|
| `package.json` | Add `@mantine/core@^7.0.0` dependency |
| `src/pages/Auth.tsx` | Revert Google + Apple handlers to `supabase.auth.signInWithOAuth()` with full-page redirect using `window.location.origin` |
| `src/pages/InviteAcceptance.tsx` | Same — revert Google + Apple to direct Supabase calls |
| `src/pages/Settings.tsx` | Same — revert Google + Apple to direct Supabase calls |

## Technical Details

### OAuth handler pattern (Auth.tsx)

```typescript
// Google — full-page redirect, no popup
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth`,
    queryParams: { access_type: 'offline', prompt: 'consent' }
  }
});
```

This uses a standard full-page redirect flow. Google renders on its own tab/page (not in a popup), the user consents, and Google redirects back to `os.thequantumclub.com/auth`. No popup to block.

### Why revert from managed auth?

The managed auth library uses a popup-based flow that is being blocked both in the Lovable preview and on the production domain. The standard Supabase redirect flow is more reliable and achieves the same custom-domain redirect as long as `redirectTo` uses `window.location.origin`.

### Build fix

Install `@mantine/core@^7.0.0` to provide the CSS files that `@blocknote/mantine` requires at build time.

