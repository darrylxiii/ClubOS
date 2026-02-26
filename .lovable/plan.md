

# Enhanced Cost Reduction Plan -- From EUR18/day to under EUR2.50/day (~86% savings)

This plan builds on the previous proposal and adds deeper optimizations across three new areas: aggressive client-side polling reduction, more AI functions downgraded, and smart caching/deduplication.

---

## Part 1: Fix Build Error

Add `@mantine/core` as a dependency (required by `@blocknote/mantine`). Without this, no other changes can ship.

---

## Part 2: Slash Cron Frequencies (saves ~EUR7.50/day)

Same schedule changes as the previous plan, with one addition: all monitoring/cleanup jobs move to 60-minute intervals minimum.

| Job | Current | New |
|---|---|---|
| agentic-heartbeat | 15 min (96/day) | Once daily 6:00 AM |
| notetaker-join-meeting | 1 min (1440/day) | 15 min |
| notetaker-collect-artifacts | 3 min (480/day) | 30 min |
| schedule-notetaker-sessions | 2 min (720/day) | 30 min |
| process-meeting-intelligence | 15 min | Once daily 7:00 AM |
| detect-threats | 5 min (288/day) | 60 min |
| monitor-region-health | 5 min (288/day) | 60 min |
| cleanup-stale-activity | 5 min (288/day) | 60 min |
| avatar-session-timeout | 5 min (288/day) | 60 min |
| sync-instantly-unibox | 15 min | 60 min |
| check-booking-reminders | 5 min | 15 min |
| send-booking-reminder | 5 min | 15 min |
| process-booking-reminders | 5 min | 15 min |

---

## Part 3: Heartbeat Guard Clauses

Add early-exit logic to `agentic-heartbeat/index.ts`:
- Query `agent_events` for unprocessed rows
- Query `sourcing_missions` for pending rows
- If both are zero AND no `job_status_open` events, skip all 7 agent invocations
- Log a lightweight "no-op" heartbeat entry instead
- Result: on quiet days, the daily heartbeat costs virtually nothing

---

## Part 4: Downgrade ALL AI to gemini-2.5-flash-lite (saves ~EUR5/day)

**63 edge functions** currently use `google/gemini-2.5-flash`. Every single one switches to `google/gemini-2.5-flash-lite` (~3x cheaper). This is the single biggest cost lever.

Exceptions (keep current model):
- `club-ai-chat` -- user-facing interactive chat with model picker (already defaults to flash-lite)
- `_shared/context-optimizer.ts` and `_shared/types.ts` -- config/type definitions only, update model options list

---

## Part 5: Kill Aggressive Client-Side Polling (NEW -- saves ~EUR2/day)

**82 hooks** currently use `refetchInterval`. Many poll the database every 30-60 seconds even when the tab is idle. This generates thousands of unnecessary Supabase requests per day.

### 5a. Remove 30-second polling (most aggressive offenders)

These poll every 30 seconds and are pure waste for non-real-time data:

| Hook/Component | Current | New |
|---|---|---|
| `useAttackGeoData` | 30s | 300s (5 min) |
| `useSecurityMetrics` | 30s | 120s |
| `IntelligenceDashboard` | 30s | 120s |
| `UserActivity` page | 30s | 120s |
| `FrustrationSignalsTab` | 30s | 120s |
| `UserSegmentsTab` | 30s | 120s |
| `OutreachActivityFeed` (3 queries) | 30s | 120s |
| `useTimeTracking` | 30s | 60s |
| `MusicPlayerPanel` | 15s | 60s |

### 5b. Reduce 60-second polling

| Hook/Component | Current | New |
|---|---|---|
| `useSLATracking` | 60s | 300s (5 min) |
| `usePredictiveAnalytics` | 60s | 300s |
| `useAgentActivity` | 60s | 300s |
| `UnreadMessagesWidget` | 60s | 120s |
| `SmartAlertsPanel` | 60s | 300s |
| `DossierActivityWidget` | 60s | 300s |
| `WhatsAppMetricsBar` | 60s | 300s |
| `SearchAnalyticsTab` | 60s | 300s |
| `useCommunicationAudit` | 60s | 300s |

### 5c. Add `refetchIntervalInBackground: false` everywhere

Any hook that still polls MUST include `refetchIntervalInBackground: false` so hidden tabs stop polling entirely. Several hooks are missing this flag.

---

## Part 6: Convert Auto-Triggering AI Hooks to On-Demand (saves ~EUR1.50/day)

### 6a. `useKPIInsights`
- Currently: `useQuery` auto-fires when KPIs load
- Change to: `useMutation` triggered by a "Generate Insights" button
- The KPI dashboard gets a button instead of auto-loading insights

### 6b. `useAggregatedHiringIntelligence`
- Currently: `useQuery` with 5-min staleTime auto-fires
- Change to: disabled by default, only triggered by "Generate Intelligence" button
- The existing `useRefreshAggregatedIntelligence` mutation already exists for this

### 6c. `usePartnerAnalytics` -- `refetchInterval` reduction
- Currently: `refetchInterval: 300000` (5 min)
- Change to: `refetchInterval: false` (manual refresh only, data is not time-critical)
- The `useGenerateInsights` mutation is already button-triggered (good)

---

## Part 7: Add Server-Side TTL Cache Guards to Expensive Functions (NEW)

Several edge functions re-generate AI content on every call even when recent results exist. Add 1-hour cache checks to these functions (same pattern already used in `generate-kpi-insights`):

| Function | Cache TTL |
|---|---|
| `predict-hiring-outcomes` | 2 hours |
| `predict-aggregated-hiring-outcomes` | 2 hours |
| `generate-company-intelligence-report` | 4 hours |
| `generate-outreach-strategy` | 2 hours |
| `generate-candidate-brief` | 1 hour |
| `calculate-match-score` | 1 hour |

Pattern: query `ai_generated_content` for recent cached result before calling the AI gateway. Store results after generation.

---

## Part 8: Batch Deduplication for Heartbeat Sub-Agents (NEW)

The heartbeat currently calls 7 child edge functions sequentially, each making their own Supabase client. Add a check at the top: if the last heartbeat ran less than 23 hours ago and processed zero events, skip entirely (emergency override available via request body `{ force: true }`).

---

## Estimated Savings Summary

| Category | Before (EUR/day) | After (EUR/day) | Saving |
|---|---|---|---|
| Cron executions | ~8.00 | ~0.80 | 90% |
| AI model costs (flash to flash-lite) | ~7.50 | ~2.50 | 67% |  
| Client-side polling overhead | ~1.50 | ~0.30 | 80% |
| Auto-trigger AI calls | ~1.00 | ~0.10 | 90% |
| **Total** | **~18.00** | **~2.40** | **~87%** |

From ~EUR540/month down to ~EUR72/month. That is a reduction from EUR20/day top-ups to around EUR2.40/day.

---

## Files Modified

### SQL Migration (1 file)
- Unschedule + reschedule 13 cron jobs

### Edge Functions (~65 files)
- 63 functions: `gemini-2.5-flash` to `gemini-2.5-flash-lite`
- `agentic-heartbeat/index.ts`: guard clauses + 23h dedup check
- 6 functions: add TTL cache guards

### Frontend Hooks (12+ files)
- `useKPIInsights.ts`: convert to `useMutation`
- `useAggregatedHiringIntelligence.ts`: disable auto-fetch
- `usePartnerAnalytics.ts`: remove `refetchInterval`
- ~9 hooks/components: reduce polling intervals from 30s/60s to 120s/300s
- Add `refetchIntervalInBackground: false` where missing

### Frontend Components (3 files)
- KPI dashboard: add "Generate Insights" button
- Hiring intelligence panel: add "Generate Intelligence" button
- Partner analytics: remove auto-refresh indicator

### Build Fix (1 file)
- Add `@mantine/core` dependency

