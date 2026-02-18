
# Fix: Prevent Boot-Phase Promise Rejections from Crashing Preview

## Problem
The `globalErrorHandlers.ts` fix from the previous round correctly calls `event.preventDefault()` on unhandled rejections — but it only activates **after** `main.tsx` finishes loading. During the boot phase (before React initializes), the `index.html` inline `unhandledrejection` handler at line 286 captures rejections but does **not** call `preventDefault()`.

This means any rejection during boot (Sentry dynamic import failure, PostHog init, Vite HMR client reconnection after a code edit) propagates to the browser's default fatal error behavior. The Lovable preview iframe detects this as a crash and shows "Sorry, we ran into an error."

The `error` event handler at line 280 has the same issue — it does not prevent propagation.

## Root Cause
The 412 on `@vite/client` is normal and transient — it happens every time code changes are applied because the Vite dev server restarts and invalidates the old module graph. Normally, the Vite client auto-reconnects. But if the reconnection throws an unhandled rejection during boot, the missing `preventDefault()` lets it cascade into a crash.

## Fix

### File: `index.html` (lines 280-291)
Add `e.preventDefault()` to both the `error` and `unhandledrejection` boot-phase handlers so rejections during initialization don't propagate to the browser's default fatal behavior.

**Before:**
```javascript
window.addEventListener('error', function(e) {
  if (!window.__BOOT_ERROR__ && e.error) {
    window.__BOOT_ERROR__ = e.error.message || String(e.error);
    console.error('[Boot] Captured error:', window.__BOOT_ERROR__);
  }
});
window.addEventListener('unhandledrejection', function(e) {
  if (!window.__BOOT_ERROR__) {
    window.__BOOT_ERROR__ = e.reason?.message || String(e.reason);
    console.error('[Boot] Captured rejection:', window.__BOOT_ERROR__);
  }
});
```

**After:**
```javascript
window.addEventListener('error', function(e) {
  if (!window.__BOOT_ERROR__ && e.error) {
    window.__BOOT_ERROR__ = e.error.message || String(e.error);
    console.error('[Boot] Captured error:', window.__BOOT_ERROR__);
  }
  // Do NOT preventDefault here - let error handlers chain
});
window.addEventListener('unhandledrejection', function(e) {
  if (!window.__BOOT_ERROR__) {
    window.__BOOT_ERROR__ = e.reason?.message || String(e.reason);
    console.error('[Boot] Captured rejection:', window.__BOOT_ERROR__);
  }
  // Prevent rejection from propagating to browser's default fatal error
  // behavior which triggers the preview iframe error overlay
  e.preventDefault();
});
```

Only `unhandledrejection` gets `preventDefault()` — the `error` handler should not suppress errors since those may be genuine syntax/reference errors that need to surface.

## Risk
- None. This is identical to what `globalErrorHandlers.ts` already does, just applied earlier in the boot timeline.
- The rejection is still logged via `console.error` and stored in `__BOOT_ERROR__` for diagnostics.

## Why This Fixes the Crash Loop
1. Code edit applied -> Vite dev server restarts
2. Browser's old `@vite/client` connection gets 412 (stale)
3. Vite client throws a rejection during reconnection attempt
4. Previously: rejection propagated to browser -> Lovable iframe detects crash -> shows error
5. Now: `preventDefault()` stops propagation -> Vite client reconnects silently -> preview loads
