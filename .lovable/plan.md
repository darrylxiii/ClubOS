

# Additional Edge Function Optimization Opportunities

## 1. **Client-Side Request Deduplication & Caching**

**Issue**: When users have multiple tabs open, each tab makes redundant calls to the same edge functions. Currently, we rely on React Query's cache, but this is per-tab. Cross-tab deduplication could save 10-15% more volume.

**Solution**:
- Implement a local IndexedDB store that tracks in-flight edge function calls (keyed by `functionName + JSON.stringify(body)`)
- If a request is already in-flight, subscribe to the same promise instead of making a new call
- Add a small TTL (5-60s depending on function criticality) to prevent stale responses

**Estimated Savings**: 5-10M requests/month

---

## 2. **Automatic Retry & Circuit Breaker Pattern**

**Issue**: Failing edge functions are being retried blindly, creating duplicate calls. No circuit breaker to stop hammering a failing service.

**Solution**:
- Enhance `invokeEdgeFunction.ts` to track:
  - **Error counts** per function (in-memory or IndexedDB)
  - **Last error time** and error type
  - **Circuit breaker state**: CLOSED (normal) → OPEN (too many errors, reject calls) → HALF_OPEN (allow 1 test call)
- Rules:
  - After 5 errors in 5 minutes → OPEN
  - Stay OPEN for 60s, then try 1 call (HALF_OPEN)
  - If HALF_OPEN call succeeds → CLOSED
  - If HALF_OPEN call fails → OPEN again
- Automatically disable high-error functions in the registry (notify admin)

**Estimated Savings**: 3-8M requests/month (prevents error amplification)

---

## 3. **Batch Edge Function Calls**

**Issue**: Some functions are called 200+ times/day independently (e.g., `calculate-lead-conversion-score` per lead), when they could be batched.

**Solution**:
- Create a new edge function `batch-execute` that accepts an array of function calls and executes them server-side in parallel
- Implement a client-side batch queue in a custom hook (e.g., `useBatchEdgeFunctions`)
- Settings:
  - Max 25 functions per batch
  - Max wait time 500ms before flushing
  - Automatic flush on memory pressure
- Registry new field: `batchable: true` for eligible functions

**Example Usage**:
```typescript
const { queueBatch } = useBatchEdgeFunctions();
queueBatch('calculate-lead-conversion-score', { leadId: '123' });
queueBatch('calculate-lead-conversion-score', { leadId: '456' });
// Both sent in 1 request after 500ms or when batch is full
```

**Estimated Savings**: 8-12M requests/month (for high-volume, parallelizable functions)

---

## 4. **Smart Sampling for Non-Critical Metrics**

**Issue**: Every single user action triggers metrics calculations (e.g., `calculate-all-kpis`, `track-event`, `log-metric`). We don't need 100% fidelity.

**Solution**:
- Add to registry a new field: `sampling_rate: 1.0` (default 100%, can be reduced)
- Enhance `invokeEdgeFunction.ts` to:
  - Check the sampling rate
  - Generate a random number [0, 1]
  - Skip invocation if random > sampling_rate
  - Log the skip for auditing

**Rules by Category**:
- **Critical** (Security, Infrastructure): 100% (sampling_rate = 1.0)
- **High** (CRM, Communication): 80-90%
- **Medium** (Analytics, Metrics): 20-50%
- **Low** (UI telemetry, debug logs): 5-10%

**UI**: Add a "Sampling Rate" column to the Registry tab with a slider (0-100%)

**Estimated Savings**: 10-20M requests/month

---

## 5. **Selective JWT Verification**

**Issue**: All functions with `verify_jwt = true` perform full JWT verification on every call, even for non-sensitive operations.

**Solution**:
- Add registry field: `require_auth: true | false` (separate from verify_jwt)
- For `require_auth: false`, skip JWT validation in the edge function code
- Registry UI shows which functions require auth vs. which are public

**Note**: Already partially implemented (139 functions have `verify_jwt = false`), but verify all ~40 "Candidate" functions like `enrich-github-profile` don't need JWT and could be made public.

**Estimated Savings**: 1-3M requests/month

---

## 6. **Time-Window Throttling for Polling-Driven Functions**

**Issue**: Functions like `calculate-all-kpis`, `sync-revenue-metrics` are triggered by polling hooks that run every 30-60s, even if nothing has changed.

**Solution**:
- Add registry field: `min_call_interval_ms: 0` (default: no throttling)
- For poll-driven functions, set `min_call_interval_ms = 300000` (5 minutes)
- Track **last invocation timestamp** in IndexedDB per function
- Skip calls that violate the interval window
- Show in Polling Config tab: "Next eligible call in 4m 23s"

**Estimated Savings**: 2-5M requests/month

---

## 7. **Function Health Dashboard Enhancements**

**Issue**: The Overview tab shows stats, but doesn't surface which functions are "unhealthy" (high error rates, slow response times, disabled by admin).

**Solution**:
- Add a new "Health Status" section in Overview tab with:
  - **Red functions** (error rate > 15%)
  - **Yellow functions** (error rate 5-15% OR avg response time > 5s)
  - **Disabled functions** (by admin)
- Add a "Quick Fix" button per unhealthy function:
  - For high error rate → Suggest reducing `sampling_rate` or disabling
  - For slow → Suggest enabling circuit breaker or batch mode
  - For disabled → Show "Re-enable" with timestamp of when it was disabled

**No new requests generated** — just better visibility and 1-click fixes.

---

## 8. **Edge Function Cost Estimation (Revenue Optimization)**

**Issue**: Admin can disable functions, but has no idea which ones are "most expensive" in terms of external API costs or compute time.

**Solution**:
- Add registry fields:
  - `external_api_cost_per_call: 0.001` (in USD)
  - `compute_cost_estimate_per_call: 0.00001` (Supabase compute + bandwidth)
  - `tags: ["stripe", "elevenlabs", "openai"]` (external services)
- Override fields in `edge_function_daily_stats` table:
  - `external_api_cost_daily` (calculated: invocation_count × external_api_cost_per_call)
  - `compute_cost_daily` (avg_response_time_ms × compute_cost_estimate_per_call)
- Add a new tab: **Cost Breakdown**
  - Pie chart: % cost by function
  - Table: daily cost trend with filtering by service tags
  - "Disable expensive functions" quick action
  - ROI analysis: "This function costs $50/day but generates 0 revenue" → Disable?

**No requests reduced** — but enables smarter disable decisions (e.g., disable low-ROI marketing functions on weekends).

**Estimated Further Savings**: 2-5M requests/month (when used to disable low-ROI functions)

---

## Summary of All Optimizations

| Optimization | Effort | Savings | Implementation |
|---|---|---|---|
| 1. Client dedup + IndexedDB | Medium | 5-10M/mo | New hook + IndexedDB |
| 2. Circuit breaker | Medium | 3-8M/mo | Enhance `invokeEdgeFunction.ts` |
| 3. Batch execution | High | 8-12M/mo | New edge function + hook |
| 4. Smart sampling | Low | 10-20M/mo | Registry field + math in wrapper |
| 5. Selective JWT | Low | 1-3M/mo | Registry field + function audits |
| 6. Time-window throttling | Medium | 2-5M/mo | IndexedDB + registry field |
| 7. Health dashboard | Low | 0 (visibility only) | UI enhancement |
| 8. Cost breakdown | Medium | 2-5M/mo (via manual disables) | New tab + cost fields |

**Total potential savings (all implemented): 31-68M requests/month** — enough to cut the 48M baseline by 65-142% (overlap accounted for, realistic floor is ~60-70% total reduction when all stacked).

---

## Recommended Next Steps (in priority order)

1. **Quick wins** (implement this week):
   - Smart sampling (4) — lowest effort, highest impact
   - Selective JWT audits (5) — quick audit
   - Time-window throttling (6) — medium effort, decent savings

2. **Medium-term** (next 2 weeks):
   - Circuit breaker (2) — improves reliability + saves requests
   - Client dedup (1) — reduces redundant calls
   - Cost breakdown (8) — visibility for manual optimization

3. **Future** (nice-to-have):
   - Batch execution (3) — highest complexity, high reward
   - Health dashboard (7) — pure UX improvement

