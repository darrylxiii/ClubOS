
# Fix Translation Manager Constant Loading + Full System Resource Audit

## Problem Summary

The Translation Manager page at `/admin/translations` shows constant loading because:

1. **10 Zombie Jobs**: There are 10 translation jobs stuck in "running" status from December 15-21, 2025 that were never cleaned up. These trigger the "No updates for 51904m 55s" warning.

2. **Aggressive 30s Polling**: The `useTranslationCoverage` hook polls every 30 seconds even when there are no active jobs or changes.

3. **Translation System Not Working**: As noted in the audit, the translation system has fundamental configuration issues (DB-only source, no local fallback), so constant polling is wasteful.

---

## Phase 1: Clean Up Zombie Translation Jobs

**Database Migration**: Mark all stuck "running" jobs as "failed"

```sql
UPDATE translation_generation_jobs 
SET 
  status = 'failed',
  error_message = 'Job timed out - cleaned up by system maintenance',
  updated_at = NOW(),
  completed_at = NOW()
WHERE status = 'running' 
  AND updated_at < NOW() - INTERVAL '30 minutes';
```

This will immediately stop the stale job warnings in the UI.

---

## Phase 2: Disable Wasteful Polling in Translation Manager

**File**: `src/hooks/use-translation-coverage.ts`

Change from aggressive 30-second polling to **manual refresh only**:

```typescript
// Current (wasteful):
refetchInterval: 30000, // Refresh every 30 seconds

// Fixed (on-demand only):
refetchInterval: false, // Disable auto-polling - refresh manually when needed
staleTime: 5 * 60 * 1000, // Cache for 5 minutes
```

**File**: `src/pages/admin/TranslationManager.tsx`

Disable auto-refetch on the four status queries since translations are rarely updated:

```typescript
const namespacesQuery = useQuery({
  queryKey: ['db-namespaces'],
  queryFn: async () => { ... },
  staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  refetchOnWindowFocus: false,
});
```

---

## Phase 3: Fix Stale Job Auto-Cleanup

The current cleanup only triggers on page load and only cleans jobs older than 30 minutes. Improve to clean jobs older than 10 minutes and add a periodic check.

**File**: `src/pages/admin/TranslationManager.tsx`

```typescript
// Reduce cleanup threshold from 30 to 10 minutes
.lt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())

// Run cleanup every 5 minutes while on the page
useEffect(() => {
  cleanupStaleJobs();
  const interval = setInterval(cleanupStaleJobs, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

---

## Full System Resource Audit

Here is where your application currently spends **memory and bandwidth**:

### Critical High-Frequency Consumers (2-5 seconds)

| Component | Interval | Purpose | Recommendation |
|-----------|----------|---------|----------------|
| `useMeetingWebRTC.ts` | 2s | WebRTC fallback polling | OK - only when Realtime fails |
| `RadioListen.tsx` | 3s | Live DJ session | OK - only on radio page |
| `DJMixer.tsx` | 5s | DJ queue polling | OK - only when DJing |
| `BulkOperationHistory.tsx` | 5s | Task progress | OK - only during bulk ops |

### Moderate Consumers (30 seconds)

| Component | Interval | Purpose | Recommendation |
|-----------|----------|---------|----------------|
| `useTranslationCoverage.ts` | 30s | Translation stats | **DISABLE** - not working anyway |
| `useSystemHealthMetrics.ts` | 30s | Admin health dashboard | OK - admin only |
| `useAnomalyAlerts.ts` | 30s | Security alerts | OK - critical for security |
| `AdminIntelligenceTab.tsx` | 30s | Admin activity | OK - admin only |
| `UserActivity.tsx` | 30s | User analytics | OK - admin only |

### Background Memory Consumers

| Component | Interval | Purpose | Recommendation |
|-----------|----------|---------|----------------|
| `usePerformanceMonitor.ts` | 5s | Performance sampling | Consider disabling in production |
| `useResourceOptimizer.ts` | 5s | Auto-optimization | Consider disabling in production |
| `useOfflineSync.ts` | 5min | Cache sync | OK - reasonable interval |

### Real-time WebSocket Subscriptions

These are always-on connections that consume memory:

| Table | Subscriber | Purpose |
|-------|------------|---------|
| `translation_generation_jobs` | TranslationJobProgress | Job updates |
| `anomaly_alerts` | useAnomalyAlerts | Security events |
| `meeting_participants` | MeetingRoom | Video calls |
| `messages` | Chat components | Messaging |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/use-translation-coverage.ts` | Disable 30s auto-polling |
| `src/pages/admin/TranslationManager.tsx` | Add staleTime, disable refetchOnWindowFocus, improve cleanup |
| Database migration | Clean up 10 zombie translation jobs |

---

## Expected Results

After implementation:
- No more "constant loading" on Translation Manager
- No more "51904m 55s" stale job warnings
- Reduced memory usage from eliminated 30s polling
- Translation page loads once and caches until manual refresh
- Stale jobs automatically cleaned every 5 minutes
