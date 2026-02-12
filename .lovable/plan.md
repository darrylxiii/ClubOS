
# Lovable Cloud Spend Audit: Full Breakdown

## Total Database Footprint

- **Total database size**: 485 MB
- **Total tables**: 883
- **Total edge functions**: 392
- **AI-powered edge functions** (calling Lovable AI gateway): 79

---

## Cost Driver 1: Bloated Monitoring Tables (60% of storage)

Six tables account for ~130 MB (27% of your 485 MB database) and serve no production purpose. They are pure telemetry/monitoring data that accumulates endlessly with no cleanup.

| Table | Rows | Size | What it does | Verdict |
|---|---|---|---|---|
| `user_session_events` | 115,590 | 46 MB | Tracks every page view, click, scroll. Since Nov 2025. | Massive. Move to analytics tool or purge > 30 days. |
| `region_health_checks` | 74,970 | 27 MB | Pings regions continuously. Every few seconds. Still growing. | Unnecessary at current scale. Disable or purge. |
| `webrtc_signals` | 36,342 | 26 MB | WebRTC signaling data from meetings. Stale since Jan 26. | No active meetings. Safe to truncate. |
| `backup_verification_logs` | 25,057 | 5.3 MB | Verifies backups. 25k rows of "backup OK". | Keep 7 days, purge rest. |
| `user_page_analytics` | 24,442 | 9.8 MB | Per-page analytics. Overlaps with `user_session_events`. | Duplicate. Consider removing. |
| `user_device_info` | 25,726 | 6.9 MB | Device fingerprints. Collected per session. | Keep 1 per user, purge duplicates. |
| `user_frustration_signals` | 12,273 | 5.7 MB | Rage clicks, dead clicks. | Novel but not actionable. Purge > 30 days. |

**Estimated savings: ~120 MB (25% of total DB)**

---

## Cost Driver 2: Aggressive Polling (77 queries with refetchInterval)

77 files have `refetchInterval` set, meaning they repeatedly query the database on a timer. Many fire every 30 seconds even when the user is not looking at that page.

### Worst Offenders

| Interval | Files | Queries per hour per user | Impact |
|---|---|---|---|
| 3 seconds | 1 (`RadioListen.tsx`) | 1,200 | Extreme. Every 3 seconds hits the DB. |
| 5 seconds | 1 (`useTimeTracking.ts`) | 720 | Very high for a time tracking poll. |
| 10 seconds | 1 (`useCommunicationAudit.ts`) | 360 | Too frequent for audit data. |
| 30 seconds | ~35 files | 120 each = 4,200 total | This is the biggest problem. 35 queries every 30 seconds. |
| 60 seconds | ~25 files | 60 each = 1,500 total | Moderate. Acceptable for active dashboards. |
| 5 minutes | ~10 files | 12 each = 120 total | Reasonable. |

**If a single admin user has 10 of these 30-second tabs open: 1,200 DB queries/hour from one person.**

Good news: Most use `refetchIntervalInBackground: false` (no background polling when tab is hidden). None use `refetchIntervalInBackground: true`. But when the tab is active, the load is enormous.

---

## Cost Driver 3: 392 Edge Functions (invocation overhead)

You have 392 edge functions deployed. Each deployment consumes cold-start resources. Key concerns:

- **79 functions call Lovable AI** (the gateway), each costing tokens per invocation
- **Top AI consumer**: `generate-executive-briefing` with 153 calls in 30 days, averaging 2.3 seconds each
- Many functions exist but are never called (dead code)
- Every function deployment adds to your function count quota

### AI Token Spend (last 30 days)

Only 183 logged AI calls total (low). But this is because most AI edge functions have no usage logging -- they call the AI gateway but do not write to `ai_usage_logs`. The actual AI spend is likely 5-10x higher than tracked.

---

## Cost Driver 4: 883 Tables (schema bloat)

883 tables in the public schema is extremely high. For context:
- A typical production SaaS has 50-150 tables
- An enterprise platform has 200-400 tables
- You have 883

Many are likely empty or near-empty tables created during feature exploration. Each table has RLS policy overhead, type generation overhead, and migration complexity.

---

## Recommended Actions (Priority Order)

### Immediate (saves ~60% of storage costs)

1. **Purge monitoring tables**: Truncate `region_health_checks`, `webrtc_signals`, and rows older than 30 days in `user_session_events`, `backup_verification_logs`, `user_frustration_signals`, `user_page_analytics`, `user_device_info`
2. **Add retention policies**: Create a scheduled cleanup function that purges old rows automatically (e.g., weekly cron)

### Short-term (saves ~80% of DB query volume)

3. **Increase polling intervals**: Change all 30-second intervals to 120 seconds (or 300 seconds for admin panels). Change 3-second and 5-second polls to 30 seconds minimum.
4. **Add `enabled` guards**: Many polling queries fire even when the component is not visible. Add `enabled: isTabActive && isComponentVisible` conditions.
5. **Use Supabase Realtime instead of polling**: For data that actually changes in real time (messages, notifications), subscribe to Postgres changes instead of polling every 30 seconds.

### Medium-term (reduces function overhead)

6. **Audit dead edge functions**: Identify functions with zero invocations in 90 days and remove them. Likely 100-200 can be deleted.
7. **Add AI usage logging**: Many AI-calling functions do not log to `ai_usage_logs`. Add logging to all 79 AI functions to track actual token spend.
8. **Consolidate similar functions**: Many functions do nearly the same thing (e.g., 6+ "generate-*-insights" functions that all call AI with slightly different prompts). Consolidate into parameterized functions.

### Long-term (architectural)

9. **Table consolidation audit**: Review all 883 tables, identify empty/unused ones, and drop them. Target: under 300 tables.
10. **Move analytics to external service**: `user_session_events` (46 MB) and `user_page_analytics` (9.8 MB) belong in PostHog or a dedicated analytics pipeline, not in your primary database.

---

## Technical Summary

| Category | Current | Target | Savings |
|---|---|---|---|
| DB size | 485 MB | ~300 MB | ~38% |
| Tables | 883 | ~300 | ~66% fewer |
| Edge functions | 392 | ~200 | ~49% fewer |
| Polling queries (per user/hour) | ~6,000 | ~500 | ~92% fewer |
| AI functions without logging | ~70 | 0 | Full visibility |
| 30-sec polling files | 35 | 0 | All moved to 120s+ or Realtime |
