
# Comprehensive Preview Stability Audit -- Root Cause Analysis and Fixes

## Diagnosis Summary

After examining the full boot chain (index.html -> main.tsx -> App.tsx -> AuthContext -> ProtectedProviders -> ProtectedRoute -> AppLayout), I found **five distinct issues** that individually cause instability and together create the persistent crash loop you've been experiencing.

---

## Root Cause 1: Vite Dev Server Externals Breaking Module Resolution

**File:** `vite.config.ts` (lines 218-237)
**Severity:** Critical -- this is the primary crash trigger

In development mode, heavy libraries are marked as `external` in Rollup:
```
external: ['mermaid', 'fabric', 'katex', '@blocknote/core', '@blocknote/react', ...]
```

AND simultaneously excluded from pre-bundling:
```
exclude: ['mermaid', 'katex', '@blocknote/core', '@blocknote/react']
```

This is a contradiction. When a module is `external`, Rollup expects it to be available at runtime via a global. But these aren't loaded as globals -- they're npm packages that need to be bundled or pre-bundled. The result: any lazy-loaded page that imports these libraries crashes with a module resolution error, which propagates up and kills the Vite HMR connection, producing the 412 status you keep seeing.

**Fix:** Remove the `external` list entirely for dev mode. The `optimizeDeps.exclude` alone is sufficient to defer pre-bundling. Lazy loading already handles code splitting.

---

## Root Cause 2: RoleContext Realtime Subscription Infinite Re-subscribe Loop

**File:** `src/contexts/RoleContext.tsx` (lines 99-132)
**Severity:** High -- causes excessive DB connections and potential memory leaks

The realtime subscription `useEffect` includes `currentRole` in its dependency array (line 132):
```tsx
}, [user, availableRoles, currentRole]);
```

When a realtime event fires and sets a new `currentRole`, the effect re-runs, which:
1. Removes the old channel
2. Creates a new channel subscription
3. The new subscription receives the same pending event
4. Potentially triggers another `setCurrentRole`
5. Repeat

This creates a rapid subscribe/unsubscribe cycle that floods the WebSocket connection and can destabilize the entire Supabase realtime layer.

**Fix:** Remove `currentRole` from the dependency array. The `lastKnownRoleRef` pattern already handles tracking the current value without needing it as a dependency.

---

## Root Cause 3: AuthContext useEffect Has Unstable Dependencies

**File:** `src/contexts/AuthContext.tsx` (line 146)
**Severity:** Medium -- causes unnecessary re-initialization

```tsx
}, [recordLoginAttempt, createSession]);
```

`recordLoginAttempt` and `createSession` come from `useSecurityTracking()`, which returns `useCallback` functions with empty `[]` deps -- so they're stable. However, the `useSecurityTracking` hook is called inside `AuthProvider`, and if `AuthProvider` ever re-renders (which it does when `user`/`session`/`loading` state changes), the hook returns new function references from the new render cycle.

Wait -- actually `useCallback` with `[]` deps means they ARE stable across renders. So this is not the issue. The AuthContext dependency array is fine.

**Revised assessment:** AuthContext deps are stable. No fix needed here.

---

## Root Cause 3 (revised): process.env.NODE_ENV Usage in Browser Code

**File:** `src/i18n/config.ts` (line 200), `src/components/T.tsx` (line 41), and 3 other files
**Severity:** Low-Medium -- can cause runtime errors in some environments

`process.env.NODE_ENV` is a Node.js convention. Vite replaces `import.meta.env.MODE` at build time but `process.env.NODE_ENV` is only replaced if configured. If the replacement fails or is inconsistent, this can cause `process is not defined` errors that crash the app.

**Fix:** Replace all `process.env.NODE_ENV` with `import.meta.env.DEV` or `import.meta.env.MODE`.

---

## Root Cause 4: Boot Timeout Recovery Creates Reload Loops

**File:** `index.html` (lines 510-528)
**Severity:** Medium -- amplifies other crashes

The 15-second recovery check auto-reloads the page if `__MAIN_LOADED__` is false and no resource progress in 5 seconds. When Root Cause 1 (external modules) causes a crash, the recovery logic triggers a reload, which hits the same crash, triggering another reload -- up to `MAX_RECOVERY_ATTEMPTS` (2), then showing the error UI on the 3rd attempt.

This means every single module resolution failure cascades into 2 automatic reloads before showing an error. Combined with the 412 stale connection issue (which is a symptom, not a cause), this creates the "crashing over and over" experience.

**Fix:** The boot recovery is already well-designed with limits. Fixing Root Cause 1 eliminates the trigger. No changes needed to boot logic.

---

## Root Cause 5: Stale BUILD_SENTINEL Never Updated

**File:** `index.html` (line 2, line 234)
**Severity:** Low -- causes false cache invalidation

```html
<!-- BUILD_SENTINEL: 2026-01-20T23:55Z -->
window.__BUILD_ID__ = '2026-01-20T23:55Z';
```

This hasn't been updated since January 20. The build-change detection (lines 483-501) compares this against `localStorage.__last_build_id__`. Since the value never changes, it never triggers cache invalidation after real deploys, meaning stale service worker caches can serve old JS bundles that reference modules that no longer exist.

**Fix:** Update the BUILD_SENTINEL to current date on each significant deploy. However, since this is in the Lovable preview environment (not production), this is less critical.

---

## Implementation Plan

### Change 1: Fix Vite Externals (Primary Fix)
**File:** `vite.config.ts`
- Remove the entire `external: [...]` block from the development rollupOptions (lines 218-238)
- Keep the `optimizeDeps.exclude` as-is (line 21) -- this correctly defers pre-bundling without breaking module resolution

### Change 2: Fix RoleContext Subscription Loop
**File:** `src/contexts/RoleContext.tsx`
- Remove `currentRole` from the useEffect dependency array on line 132
- Change to: `[user, availableRoles]`
- The `lastKnownRoleRef` already tracks the current role correctly

### Change 3: Replace process.env.NODE_ENV
**Files:** 5 files
- `src/i18n/config.ts` line 200: `process.env.NODE_ENV === 'development'` to `import.meta.env.DEV`
- `src/components/T.tsx` line 41: same replacement
- `src/components/whatsapp/WhatsAppTabErrorBoundary.tsx` line 48: same
- `src/components/partner/UpcomingInterviewsWidget.tsx` line 347: same
- `src/components/partner-funnel/FunnelErrorBoundary.tsx` line 87: same

### Change 4: Update BUILD_SENTINEL
**File:** `index.html`
- Update line 2 and line 234 to current date `2026-02-18`

---

## Expected Outcome
- The primary crash trigger (external module resolution failure) is eliminated
- The RoleContext no longer floods WebSocket connections
- No more `process is not defined` edge cases
- Cache invalidation works correctly after changes
- The boot recovery system stops triggering because there's nothing to recover from
