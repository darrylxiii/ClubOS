
# Performance Audit: Post-Build Loading Speed

## The Problem

After a Lovable build completes, the preview reloads and you have to wait through a long loading sequence before you can interact with the app. This is caused by a **sequential waterfall of database calls and provider initializations** that block rendering.

## Current Initialization Waterfall

When the app loads on a protected route, here is the sequential chain that must complete before you see content:

```text
1. AuthContext: getSession()                        ~200-500ms
   |
2. ProtectedRoute: fetch profiles + user_roles      ~200-400ms  (waits for auth)
   |
3. ProtectedProviders mount (all at once):
   |-- AppearanceProvider: fetch user_preferences   ~150-300ms
   |-- RoleContext: fetch user_roles (DUPLICATE)    ~150-300ms
   |   then: fetch user_preferences (DUPLICATE)    ~150-300ms
   |   then: fetch profiles.company_id             ~100-200ms
   |-- TaskBoardContext: fetch user_accessible_boards ~150-300ms
   |   + subscribes to realtime channels
   |-- SubscriptionContext: invoke check-subscription edge function ~300-800ms
   |-- ActivityTracker: 
   |   calls update_user_online_status RPC          ~100-200ms
   |   calls track_user_event RPC                   ~100-200ms
   |   calls update_user_activity_tracking RPC      ~100-200ms
   |   starts 60s heartbeat interval
   |-- TrackingProvider:
   |   calls supabase.auth.getUser() (DUPLICATE)    ~100-200ms
   |   inserts into user_device_info                ~100-200ms
   |   inserts into user_page_analytics             ~100-200ms
   |-- IdleSessionGuard: registers event listeners
   |
4. MfaEnforcementGuard: fetch user_roles (DUPLICATE) + mfa.listFactors()  ~200-400ms
   |
5. AppLayout mounts + page-specific data loads
```

**Total: 12-18 database calls, 3 edge function invocations, at least 2-4 seconds of waterfall.**

## Root Causes Identified

### Issue 1: DUPLICATE user_roles Fetch (3x)
- `ProtectedRoute` fetches `user_roles` (line 49)
- `RoleContext` fetches `user_roles` again (line 37)
- `MfaEnforcementGuard` fetches `user_roles` a third time (line 34)

**Impact:** ~300-600ms wasted on two redundant round-trips.

### Issue 2: DUPLICATE user_preferences Fetch (2x)
- `AppearanceProvider` fetches `user_preferences` (line 59)
- `RoleContext` fetches `user_preferences` again (line 52)

**Impact:** ~150-300ms wasted.

### Issue 3: DUPLICATE getUser() Call
- `AuthContext` calls `getSession()` which provides the user
- `TrackingService` calls `supabase.auth.getUser()` independently on every event queue flush

### Issue 4: SubscriptionContext Calls an Edge Function on Mount
- `check-subscription` edge function is invoked immediately on mount
- Edge function cold starts add 300-800ms
- Subscription status rarely changes and doesn't need to block rendering

### Issue 5: ActivityTracker Fires 3 RPCs Immediately on Mount
- `update_user_online_status`, `track_user_event`, `update_user_activity_tracking` all fire synchronously on mount
- None of these should block page rendering

### Issue 6: TrackingService is Eagerly Instantiated
- `trackingService` is a module-level singleton (line 379 of trackingService.ts)
- Its constructor runs on import, starts a `setInterval`, and adds a `beforeunload` listener
- Every click, scroll, hover, and form focus generates DB inserts

### Issue 7: MfaEnforcementGuard is Sequential After ProtectedRoute
- Both are in the render tree sequentially: ProtectedRoute renders, then MfaEnforcementGuard renders
- Both show `PageLoader` while checking, creating two sequential loading gates

### Issue 8: TaskBoardContext Subscribes to Realtime Immediately
- Opens a realtime channel on mount, even if the user never visits the tasks page
- Adds connection overhead

## The Fix Plan

### Fix 1: Unified Auth Prefetch (eliminate 4 duplicate queries)

Create a single `useAuthPrefetch` hook that fetches `user_roles`, `user_preferences`, and `profiles` in ONE parallel query on auth load. Store results in React Query cache so all consumers read from cache instead of re-fetching.

**Files:**
- Create `src/hooks/useAuthPrefetch.ts` — single `Promise.all` for roles + preferences + profile
- Update `ProtectedRoute.tsx` — read roles from React Query cache instead of direct fetch
- Update `RoleContext.tsx` — read from cache, skip own fetch
- Update `MfaEnforcementGuard.tsx` — read from cache, skip own fetch
- Update `AppearanceContext.tsx` — read from cache, skip own fetch

### Fix 2: Merge MfaEnforcementGuard into ProtectedRoute

Since both check `user_roles` and both show `PageLoader`, merge MFA checking into `ProtectedRoute` to eliminate the second sequential loading gate.

**Files:**
- Update `ProtectedRoute.tsx` — add MFA factor check in the same `Promise.all`
- Remove `MfaEnforcementGuard.tsx` from `ProtectedLayout.tsx`

### Fix 3: Defer Non-Critical Providers

Move `ActivityTracker`, `TrackingProvider`, and `TaskBoardContext` to lazy/deferred initialization so they don't block first paint.

**Files:**
- Update `ProtectedProviders.tsx` — wrap ActivityTracker and TrackingProvider in a `useEffect` with `requestIdleCallback` or a 2-second delay
- Update `TaskBoardContext.tsx` — only fetch boards when the user navigates to a tasks-related page (lazy init)

### Fix 4: Defer SubscriptionContext Edge Function Call

The subscription check edge function is the slowest single call. Defer it with `staleTime` and don't block rendering.

**Files:**
- Update `SubscriptionContext.tsx` — set `placeholderData` to `{ subscriptions: [] }` so it renders immediately without waiting

### Fix 5: Batch TrackingService Initialization

Delay `TrackingService` constructor side effects (setInterval, event listeners) until after first paint using `requestIdleCallback`.

**Files:**
- Update `src/services/trackingService.ts` — defer `startBatchFlushing()` and `beforeunload` listener to idle callback
- Update `useComprehensiveTracking.ts` — add a 3-second mount delay before attaching event listeners

### Fix 6: Cache getUser() Result

The `TrackingService.getUserId()` method calls `supabase.auth.getUser()` on every event. Cache the user ID from the auth context instead.

**Files:**
- Update `src/services/trackingService.ts` — add `setUserId(id)` method, call it from AuthContext on login
- Remove the redundant `getUser()` call from `queueEvent`, `trackPageEntry`, etc.

## Expected Impact

| Before | After |
|---|---|
| 12-18 DB calls on load | 4-5 DB calls on load |
| 3 sequential loading gates | 1 loading gate |
| ~2-4s to interactive | ~0.5-1s to interactive |
| 3 duplicate user_roles fetches | 1 fetch, cached |
| Edge function cold start blocks render | Deferred, non-blocking |
| Activity tracking blocks first paint | Deferred to idle |

## Implementation Order

1. Create `useAuthPrefetch` and wire into ProtectedRoute (biggest win)
2. Merge MfaEnforcementGuard into ProtectedRoute
3. Defer ActivityTracker + TrackingProvider
4. Add placeholderData to SubscriptionContext
5. Defer TrackingService initialization
6. Cache userId in TrackingService

## Technical Details

### useAuthPrefetch Shape
```typescript
// Single parallel fetch, cached via React Query
const prefetchAuthData = async (userId: string) => {
  const [roles, prefs, profile] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', userId),
    supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('account_status, onboarding_completed_at, company_id').eq('id', userId).single(),
  ]);
  return { roles, prefs, profile };
};
```

### Deferred Provider Pattern
```typescript
// Instead of running on mount:
useEffect(() => {
  const id = requestIdleCallback(() => {
    // start tracking, open realtime channels, etc.
  }, { timeout: 3000 });
  return () => cancelIdleCallback(id);
}, []);
```

This plan focuses purely on eliminating redundant work and deferring non-critical operations. No features are removed — everything still runs, just not all at once blocking the first paint.
