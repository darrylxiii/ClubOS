

# Edge Function Command Center + Polling Optimization

## Part 1: Silent Polling Optimizations (No User Impact)

Reduce request volume by ~60-70% through three changes applied across the codebase:

### 1A. Increase Polling Intervals for Non-Critical Data

| Current Interval | New Interval | Files Affected | Est. Reduction |
|---|---|---|---|
| 3s (RadioListen, MusicPlayerPanel) | 15s | 2 files | ~80% per file |
| 5s (ClubDJ, DJMixer, LiveDJs, MusicPlayer, RealTimeActivityTab, IntelligenceDashboard, BulkOperationHistory) | 30s | 7 files | ~83% per file |
| 10s (ModelHealthMonitor, CommunicationAudit delivery stats) | 30s | 2 files | ~67% per file |
| 15s (ThreatDetection events, SessionSecurity) | 30s | 2 files | ~50% per file |
| 30s (28+ files: security panels, activity tabs, CRM feeds, etc.) | 60s | ~28 files | ~50% per file |

None of these are user-facing interactions -- they are background dashboard refreshes. A user will never notice the difference between a 5s and 30s refresh on a DJ status card.

### 1B. Add `enabled` Guards

For every `useQuery` with a `refetchInterval`, add visibility/mount guards so queries only poll when the component is actually visible on screen. This prevents background tabs from generating requests.

Pattern applied:
```typescript
// Before
refetchInterval: 30000

// After  
refetchInterval: 30000,
refetchIntervalInBackground: false,
```

React Query's `refetchIntervalInBackground: false` (the default, but we'll be explicit) stops polling when the browser tab is not focused. This alone cuts ~30-40% of background noise.

### 1C. Add `staleTime` Where Missing

Many queries re-fetch on every window focus because they have no `staleTime`. Adding `staleTime` equal to half the `refetchInterval` prevents redundant fetches when users switch tabs.

---

## Part 2: Edge Function Command Center (New Admin Page)

### New Route: `/admin/edge-functions`

A dedicated admin page with full visibility and control over all edge functions.

### Database Changes

**Populate `edge_function_registry`**: The table already exists with the right schema (`function_name`, `display_name`, `description`, `category`, `is_active`, `invocation_count`, `avg_execution_time_ms`, `error_rate`). We will seed it with all 389 functions organized by category and write a migration to add two new columns:

- `polling_interval_ms` (integer, nullable) -- for functions triggered by polling, the configurable interval
- `admin_disabled_at` (timestamptz, nullable) -- when an admin toggled it off

**New table: `edge_function_daily_stats`** -- stores aggregated daily usage per function for historical trending:
- `id` (uuid, PK)
- `function_name` (text)
- `date` (date)
- `invocation_count` (integer)
- `success_count` (integer)
- `error_count` (integer)
- `avg_response_time_ms` (numeric)
- `total_tokens_used` (integer)
- `created_at` (timestamptz)
- Unique constraint on (function_name, date)

### UI Layout (4 Tabs)

**Tab 1: Overview**
- Total functions count, active vs disabled, total invocations today/this week/this month
- Donut chart: invocations by category (AI/ML, Communication, CRM, Security, Infrastructure, etc.)
- Top 10 most-called functions table with sparkline trends
- Health status bar: healthy / degraded / critical count

**Tab 2: Function Registry**
- Searchable, filterable table of all 389 functions
- Columns: Name, Category, Status (active/disabled toggle), Last Invoked, Invocations (24h), Avg Response Time, Error Rate, Polling Interval (editable)
- Bulk actions: Enable All, Disable All (by category), Reset Intervals
- Toggle switch per row to enable/disable a function (writes `is_active` + `admin_disabled_at`)
- Inline editable polling interval field (for functions that are poll-driven)

**Tab 3: Usage Analytics**
- Date range picker (today, 7d, 30d, custom)
- Stacked area chart: invocations over time by category
- Table: per-function daily breakdown with sortable columns
- Cost estimation column (using the logic from `useCostMetrics`)
- Export to CSV button

**Tab 4: Polling Configuration**
- Lists only poll-driven hooks (the 76 files with `refetchInterval`)
- Shows current interval, suggested interval, and a slider to adjust
- "Apply Optimized Defaults" button that sets all intervals to recommended values
- Estimated monthly request savings calculator

### New Files

| File | Purpose |
|---|---|
| `src/pages/admin/EdgeFunctionCommandCenter.tsx` | Main page with 4 tabs |
| `src/hooks/useEdgeFunctionRegistry.ts` | CRUD hook for `edge_function_registry` |
| `src/hooks/useEdgeFunctionDailyStats.ts` | Aggregated stats queries with date filters |
| `src/components/admin/edge-functions/EdgeFunctionOverviewTab.tsx` | Overview dashboard tab |
| `src/components/admin/edge-functions/EdgeFunctionRegistryTab.tsx` | Searchable registry with toggles |
| `src/components/admin/edge-functions/EdgeFunctionUsageTab.tsx` | Analytics charts and tables |
| `src/components/admin/edge-functions/PollingConfigTab.tsx` | Polling interval management |

### Modified Files

| File | Change |
|---|---|
| `src/routes/admin.routes.tsx` | Add route for `/admin/edge-functions` |
| ~40 files with `refetchInterval` | Increase intervals + add `refetchIntervalInBackground: false` + add `staleTime` |

### Seeding the Registry

A database migration will insert all 389 functions into `edge_function_registry` with categorization:
- **AI/ML** (generate-*, analyze-*, predict-*, ai-*, etc.)
- **Communication** (send-*, email-*, whatsapp-*, sms-*)
- **CRM** (crm-*, outreach-*, campaign-*)
- **Security** (detect-*, check-*, auto-respond-*, verify-*)
- **Infrastructure** (cleanup-*, sync-*, calculate-*, monitor-*)
- **Candidate** (enrich-*, parse-*, match-*, normalize-*)
- **Meeting** (meeting-*, livekit-*, bridge-*, compile-*)
- **Finance** (moneybird-*, reconcile-*, calculate-payment-*, invoice-*)

### How Toggle On/Off Works

When an admin disables a function via the UI:
1. `is_active = false` and `admin_disabled_at = now()` is set in `edge_function_registry`
2. Client-side: before any `supabase.functions.invoke()` call, a lightweight check against the registry determines if the function is disabled. If disabled, the call is skipped and a "Function disabled by admin" message is returned.
3. This is implemented as a thin wrapper around `supabase.functions.invoke` that all components use.

### Aggregation

A new edge function `aggregate-edge-function-stats` runs daily (via cron) to:
1. Query `ai_usage_logs` for the previous day
2. Group by `function_name`
3. Insert/upsert into `edge_function_daily_stats`
4. Update `edge_function_registry` counters (`invocation_count`, `avg_execution_time_ms`, `error_rate`)

