

# Deal Pipeline Audit — Current State & Remaining Issues

## Score: 78/100

The core overhaul is working. Stage distribution improved from 32 New → 20 New / 7 Qualified / 12 Proposal / 1 Negotiation. Probability sync is correct. Orphaned closed jobs are fixed. `is_terminal` is set properly. The composite scoring function works.

**But 7 issues remain:**

---

### 1. QueryKey Mismatch — Velocity Never Refreshes After Drag (-8 pts)

`usePipelineVelocity()` uses queryKey `['pipeline-velocity-metrics']` but `useUpdateDealStage` invalidates `['pipeline-velocity']`. After dragging a deal on the Kanban board, the velocity/funnel components never refresh.

**Fix:** Change the invalidation in `useUpdateDealStage` from `'pipeline-velocity'` to `'pipeline-velocity-metrics'`. Also add this invalidation to `useCloseJobWon`, `useCloseJobLost`, and `useMarkDealLost`.

---

### 2. Velocity RPC Returns weighted_value = 0 for All Stages (-5 pts)

The `get_pipeline_velocity_metrics` RPC calculates weighted value using only `deal_value_override`, which is NULL for most jobs. The funnel shows "0" for every stage's weighted value.

**Fix:** Update the RPC to fall back to salary-based calculation: `COALESCE(j.deal_value_override, COALESCE(j.salary_max, j.salary_min, 60000) * COALESCE(c.placement_fee_percentage, 0) / 100.0)`.

---

### 3. Dirty History Data — Case Mismatch & Regression Noise (-3 pts)

`deal_stage_history` has 11 records of `"new" → "New"` (case mismatch from old trigger) and impossible transitions like `"Closed Won" → "Closed Lost"`. This pollutes conversion rate calculations.

**Fix:** Data cleanup: DELETE records where `from_stage = 'new'` (lowercase) and UPDATE remaining to normalize casing. Add a check in the trigger to skip logging when the stage hasn't actually changed (case-insensitive).

---

### 4. RevenueCharts Velocity — No Progression vs Regression Detection (-2 pts)

`RevenueCharts.tsx` line 73 counts every non-closure transition as a "progression". Regressions (e.g., Proposal → New) are invisible.

**Fix:** Use the `deal_stages` table order to determine if a transition is forward or backward, then correctly categorize as progression or regression.

---

### 5. Close/Lost Mutations Don't Invalidate Velocity (-2 pts)

`useCloseJobWon`, `useCloseJobLost`, and `useMarkDealLost` don't invalidate `pipeline-velocity-metrics`, so the funnel/velocity cards go stale after closing a deal.

**Fix:** Add `queryClient.invalidateQueries({ queryKey: ['pipeline-velocity-metrics'] })` to all three mutation `onSuccess` handlers.

---

### 6. No Realtime on Kanban (-1 pt)

Two admins dragging deals simultaneously won't see each other's changes. Low priority but noted.

**Fix:** Enable realtime on `jobs` table via `ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs` and subscribe in the Kanban component.

---

### 7. PipelineConversionFunnel Conversion % Can Be Misleading (-1 pt)

The funnel calculates conversion as `transition_count / current_stage_job_count`. But `transition_count` is historical (all-time transitions) while `job_count` is current snapshot. A stage with 5 current jobs but 20 historical transitions shows 400% conversion.

**Fix:** Use `transition_count / (transition_count + jobs_still_in_stage)` or simply display transition counts without the percentage when data is insufficient.

---

## Implementation Plan

### Phase 1: Database Migration
- Fix `get_pipeline_velocity_metrics` to calculate weighted values using salary/fee fallback
- Add case-insensitive guard to the deal stage history trigger (skip if `LOWER(OLD.deal_stage) = LOWER(NEW.deal_stage)`)

### Phase 2: Data Cleanup (insert tool)
- DELETE `deal_stage_history` records where `LOWER(from_stage) = LOWER(to_stage)` (the "new"→"New" noise)
- DELETE impossible transitions ("Closed Won"→"Closed Lost")

### Phase 3: Frontend Fixes
- **`useDealPipeline.ts`**: Fix queryKey mismatch; add velocity invalidation to all close/lost mutations
- **`RevenueCharts.tsx`**: Add stage order lookup to properly categorize progressions vs regressions
- **`PipelineConversionFunnel.tsx`**: Guard against >100% conversion display

### Files Changed

| File | Change |
|------|--------|
| Migration SQL | Fix velocity RPC weighted_value calc + trigger guard |
| `src/hooks/useDealPipeline.ts` | Fix queryKey, add invalidations to 3 mutations |
| `src/components/deals/RevenueCharts.tsx` | Fix progression/regression detection |
| `src/components/deals/PipelineConversionFunnel.tsx` | Cap conversion % display |

