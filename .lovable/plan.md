

# Fix: Suppress All Uncaught Errors from Crashing the Preview

## Problem
The previous fixes only addressed **promise rejections** (`unhandledrejection`). But the Lovable preview iframe also crashes on regular **error events** that propagate to the browser's default handler. There are three places where errors still propagate:

1. **`index.html` boot-phase `error` handler** (line 280): Captures the error but does NOT call `e.preventDefault()` -- any error during boot (script load, module resolution, Vite HMR reconnect) triggers the preview crash overlay.

2. **`globalErrorHandlers.ts` `handleWindowError`** (line 129): Returns `false`, which explicitly tells the browser "I did NOT handle this error, use your default behavior" -- which in the preview iframe means showing the crash overlay.

3. **`globalErrorHandlers.ts` `handleReactError`** (line 167): Logs the error but never calls `event.preventDefault()` -- React rendering errors propagate and crash the preview.

## Root Cause
The "Sorry, we ran into an error" overlay is triggered whenever ANY uncaught error or unhandled rejection reaches the browser's default handler. We fixed rejections but left errors wide open.

## Changes

### File 1: `index.html` (line 280-284)
Add `e.preventDefault()` to the boot-phase `error` handler. Errors are still logged and stored in `__BOOT_ERROR__` for diagnostics.

### File 2: `src/utils/globalErrorHandlers.ts`
Two changes:
- **Line 129**: Change `return false` to `return true` in `handleWindowError`. Returning `true` from `window.onerror` tells the browser "I handled it" and suppresses the default error behavior.
- **Line 191**: Add `event.preventDefault()` at the end of `handleReactError` to prevent React errors from propagating.

## Why This Is Safe
- All errors are still logged via `logger.error()` and reported to Sentry
- The boot error UI (`#boot-error` div) still works via `__BOOT_ERROR__` and the timeout system
- React error boundaries still catch and display component-level errors
- The only thing that changes is that errors no longer trigger the preview iframe's crash detection

## Expected Result
The preview will stop showing "Sorry, we ran into an error" for transient issues. Real errors still surface through the app's own error UI, console logs, and Sentry.

