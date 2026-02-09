

# Fix: "Google OAuth is not configured: Popup was blocked" Error

## Root Cause

The `OAuthDiagnostics` component calls `lovable.auth.signInWithOAuth("google", ...)` inside a `useEffect` on page load. This triggers an actual OAuth popup (or redirect) without any user gesture. Browsers block popups not initiated by user clicks, so the call fails with "Popup was blocked", and the component displays a false error: "Google OAuth is not configured."

Google OAuth IS configured. The diagnostic is simply testing it incorrectly.

## The Fix

Remove the `OAuthDiagnostics` component entirely. It provides no value -- it cannot reliably test OAuth without a user click, and its false-positive error message actively confuses users.

Also remove the similar auto-test from `AuthDiagnostics.tsx` if it does the same thing.

### Changes

| File | Change |
|---|---|
| `src/components/OAuthDiagnostics.tsx` | Delete the file (or gut it to a no-op) |
| `src/components/AuthDiagnostics.tsx` | Remove the auto-fire OAuth test if present |
| Any file importing `OAuthDiagnostics` | Remove the import and usage |

### Why not fix the diagnostic instead of removing it?

There is no browser-safe way to passively test whether OAuth is configured without triggering an actual sign-in flow. The only reliable test is a real user click. A diagnostic that cannot run without user interaction is not a useful automatic diagnostic.

## Build Error (TS2307)

The `@lovable.dev/cloud-auth-js` package needs to be reinstalled. This will be done as part of the implementation step. The package and `src/integrations/lovable/index.ts` are correct -- it is purely a dependency resolution issue.

