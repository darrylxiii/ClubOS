
# Full Polling Audit + Enable/Disable Toggle for Edge Functions

## Part 1: Polling Audit — Remaining Unoptimized Hooks

After the first optimization pass (12 files), **64+ files still have polling without `refetchIntervalInBackground: false` and/or `staleTime`**. Here is the full breakdown organized by severity.

### Tier 1: Critical (1-5s intervals) — Highest waste per user

| File | Current | New Interval | Notes |
|---|---|---|---|
| `useTimeTracking.ts` | 1s | 5s | Live timer display; 5s still feels real-time |
| `ClubDJ.tsx` | 5s | 30s | Playlist data; already has Realtime channel |
| `radio/LiveDJs.tsx` | 5s | 30s | Already has Realtime subscription; polling redundant |

**Est. savings: ~5M req/month per active user tab**

### Tier 2: Aggressive (10s intervals)

| File | Current | New |
|---|---|---|
| `useCommunicationAudit.ts` (delivery stats) | 10s | 30s |
| `ModelHealthMonitor.tsx` | 10s | 30s |

### Tier 3: Moderate (15-30s intervals, missing guards)

These have `refetchInterval` set at 15-30s but are **missing `refetchIntervalInBackground: false`** and **`staleTime`**, causing unnecessary background tab noise.

| File | Current | Add Guards |
|---|---|---|
| `useSessionSecurity.ts` (3 queries) | 15s, 30s, 30s | + background:false + staleTime |
| `SecurityAlertsPanel.tsx` | 30s | + background:false + staleTime |
| `RateLimitDashboard.tsx` (2 queries) | 30s, 30s | + background:false + staleTime |
| `DisasterRecoveryDashboard.tsx` (4 queries) | 30s-60s | + background:false + staleTime |
| `SLAStatusPanel.tsx` | 30s | + background:false |
| `FrustrationSignalsTab.tsx` | 30s | + background:false + staleTime |
| `CandidateIntelligenceTab.tsx` | 30s | + background:false + staleTime |
| `StrategistIntelligenceTab.tsx` | 30s | + background:false + staleTime |
| `AdminIntelligenceTab.tsx` | 30s | + background:false + staleTime |
| `FeatureAnalyticsTab.tsx` | 30s | + background:false + staleTime |
| `SecurityIncidentsPanel.tsx` | 30s | + background:false + staleTime |
| `OutreachActivityFeed.tsx` (3 queries) | 30s | + background:false + staleTime |
| `WebhookReliabilityDashboard.tsx` (2 queries) | 30s, 60s | + background:false + staleTime |
| `WhatsAppHub.tsx` (2 queries) | 30s, 60s | + background:false + staleTime |
| `UnreadMessagesWidget.tsx` (2 queries) | 30s, 30s | + background:false + staleTime |
| `useSecurityMetrics.ts` (4 queries) | 30s-300s | + background:false + staleTime |
| `useSystemHealthMetrics.ts` | 30s | + background:false + staleTime |
| `DossierActivityWidget.tsx` | 60s | + background:false + staleTime |
| `WhatsAppMetricsBar.tsx` | 60s | + background:false + staleTime |
| `usePredictiveAnalytics.ts` | 60s | + background:false + staleTime |
| `SmartAlertsPanel.tsx` | 60s | + background:false + staleTime |
| `useSmartReplyIntelligence.ts` | 60s | + background:false + staleTime |
| `useApplicationMetrics.ts` | 60s | + background:false + staleTime |
| `PerformanceDashboard.tsx` (3 queries) | 60s | + background:false + staleTime |
| `SearchAnalyticsTab.tsx` | 60s | + background:false + staleTime |
| `AuditLogSummaryWidget.tsx` | 60s | + background:false + staleTime |
| `ApplicationFunnelWidget.tsx` | 60s | + background:false + staleTime |
| `UpcomingDeadlinesWidget.tsx` | 60s | + background:false + staleTime |
| `usePlatformHealth.ts` | 60s | already has staleTime, add background:false |
| `useRecentActivity.ts` | 60s | already has staleTime, add background:false |
| `useAgentContext.ts` | 60s | already has staleTime, add background:false |

**Total: ~50 files, ~65 individual useQuery calls**

### Applied Pattern (uniform across all)

```typescript
// Before
refetchInterval: 30000,

// After
refetchInterval: 30000, // (or increased value for Tier 1-2)
refetchIntervalInBackground: false,
staleTime: 15000, // 50% of refetchInterval
```

---

## Part 2: Enable/Disable Toggle Enhancement

The Registry tab already has working per-function toggles and bulk enable/disable buttons. However, the toggle only writes to the database -- **it does not actually prevent function invocation on the client side**. The plan adds:

### Client-Side Invocation Guard

Create a wrapper utility `src/utils/invokeEdgeFunction.ts` that:
1. Checks a cached copy of the registry's `is_active` status before calling `supabase.functions.invoke()`
2. If the function is disabled, returns early with a standardized "Function disabled by admin" response
3. Uses React Query's cache so there is zero extra network cost per invocation check

```typescript
// src/utils/invokeEdgeFunction.ts
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';

export async function invokeEdgeFunction(
  functionName: string,
  options?: { body?: unknown; headers?: Record<string, string> }
) {
  // Check cached registry (no network call)
  const registry = queryClient.getQueryData(['edge-function-registry']) as any[] | undefined;
  const entry = registry?.find(e => e.function_name === functionName);

  if (entry && entry.is_active === false) {
    console.warn(`[EdgeFunction] ${functionName} is disabled by admin`);
    return { data: null, error: { message: 'Function disabled by admin' } };
  }

  return supabase.functions.invoke(functionName, options);
}
```

### Registry Tab Improvements

- Add a description tooltip per function explaining what it does
- Add a confirmation dialog when disabling critical functions (category = "Infrastructure" or "Security")
- Show the `admin_disabled_at` timestamp when a function is disabled
- Add a "Disabled Functions" quick filter badge

---

## Summary of Changes

| Category | Files Modified | Impact |
|---|---|---|
| Tier 1 polling fixes (1-5s) | 3 files | ~5M req/month saved |
| Tier 2 polling fixes (10s) | 2 files | ~2M req/month saved |
| Tier 3 guard additions (15-60s) | ~45 files | ~10-15M req/month saved (background tabs) |
| Invocation guard utility | 1 new file | Enables admin disable to actually stop calls |
| Registry tab improvements | 1 file | Better UX for admin control |

**Estimated total reduction: 17-22M requests/month (35-45% of 48M baseline)**
