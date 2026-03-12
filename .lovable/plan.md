

# Deal Pipeline Plan Audit — Score: 58/100

## What I Verified (Hard Data)

| Fact | Value |
|------|-------|
| Jobs stuck at "New" with partner-approved candidates | **12 jobs** (e.g., "Head of Buying": 20 approved, still "New" at 10%) |
| Total deal_stage_history records | 43 |
| `get_pipeline_velocity_metrics` RPC | **Does not exist** |
| `PipelineVelocityMetrics.tsx` (deals tab) | **Does not exist** |
| `PipelineConversionFunnel.tsx` | **Does not exist** |
| Pipeline stage mappings | 14 mappings, none reference review statuses |
| `is_terminal` on all deal_stages | All set to `false` — even Closed Won/Lost |
| `PipelineInsights.tsx` queries `status = 'open'` | **Bug** — should be `'published'` |
| `RevenueCharts.tsx` "velocity" chart | Only counts jobs created/lost per month — no actual stage transitions |
| Orphaned closed jobs at intermediate stages | 2 (Event Manager at Proposal, Assistant Developer at Negotiation) |

---

## Deductions (Why 58, Not 100)

### 1. Core Logic Gap — `get_deal_stage_for_job` ignores reviews (-20 points)
The function only matches `pipeline_stages[current_stage_index].name` against `pipeline_stage_mappings`. It completely ignores `internal_review_status` and `partner_review_status`. Result: 12 jobs with approved candidates sit at 10% weight. The plan correctly identifies this but the proposed "Layer 2 positional mapping" (index/total = percentage) is **fragile**: a job with 4 stages where a candidate is at index 1 ("Screening") would map to 25% = Qualified. That's correct by accident but will break on 6-stage pipelines where index 1 might be "First Assessment" (already beyond Qualified). The positional fallback should be a last resort, not a primary layer.

**Missing from plan**: The function should also handle `status = 'hired'` on any application to auto-set "Closed Won" — currently only name-pattern "Hired" does this, but the stage might be called "Offer Accepted" or anything custom.

### 2. No Concrete SQL — Plan is Too Abstract (-10 points)
The plan says "rewrite `get_deal_stage_for_job` with 3-layer composite scoring" but doesn't provide the actual SQL. For a function this critical (it's called by a trigger on every application change), the exact logic matters. The priority numbers (20, 25, 28, 30, 40, 50) aren't mapped to specific deal stages with their probability weights.

### 3. `is_terminal` Never Set (-3 points)
All 6 deal stages have `is_terminal = false` — including Closed Won and Closed Lost. This means any code checking `is_terminal` to filter out completed deals won't work. The plan doesn't mention fixing this.

### 4. `PipelineInsights.tsx` Queries Wrong Status (-3 points)
Line 27: `.eq('status', 'open')` — your jobs use `'published'`, not `'open'`. This means the stale deals and at-risk insights always return empty. The plan doesn't mention this bug.

### 5. No Backfill for Orphaned Closed Jobs (-2 points)
The plan mentions "Phase 5: Fix orphaned closed jobs" but doesn't specify the exact SQL or how to determine won vs lost for the 2 stuck jobs. "Event Manager" (closed, Proposal stage) and "Assistant Developer" (closed, Negotiation stage) — are they won or lost? The plan doesn't address how to classify them without a `closed_at` + `is_lost` cross-check.

### 6. Missing `deal_probability` Sync (-2 points)
When `get_deal_stage_for_job` updates `deal_stage`, it doesn't update `deal_probability` to match the stage's `probability_weight`. The trigger only sets `deal_stage` text. So even after the fix, jobs could have mismatched stage/probability values. The plan should include updating `deal_probability` in the trigger.

### 7. Duplicate Assessment Mapping (-1 point)
There are two identical mappings: `Assessment → Proposal` both at priority 30. The plan added one without checking if it existed (the `ON CONFLICT DO NOTHING` silently failed on the first but the original migration already had it).

### 8. `calculate_weighted_pipeline` Only Counts Published (-2 points)
The RPC filters `WHERE j.status = 'published'` — so Closed Won deals (which have `status = 'closed'`) are excluded from the pipeline metrics entirely. The plan doesn't address whether won deals should appear in revenue totals.

### 9. No Frontend for Velocity/Conversion (-5 points)
Plan promises `PipelineVelocityMetrics.tsx` and `PipelineConversionFunnel.tsx` but they don't exist yet. The existing `RevenueCharts.tsx` "velocity" chart is fake — it just counts jobs created per month, not actual stage-to-stage transition speed from `deal_stage_history`.

### 10. `deal_stage_history` Has Only 43 Records (-5 points)
Most transitions were never recorded because `get_deal_stage_for_job` returns "New" for most jobs (so no transition happens). After fixing the function, the backfill will create transitions, but the plan doesn't mention inserting history records during the backfill — just updating `deal_stage`. Without backfilled history, velocity metrics will have insufficient data.

### 11. No Real-Time Pipeline Updates (-2 points)
The plan doesn't mention enabling realtime on the `jobs` table for the Kanban board. Currently, if two admins drag deals simultaneously, they won't see each other's changes.

### 12. Missing Error Handling in Plan (-3 points)
The plan references creating new RPCs and components but doesn't mention: error states, loading states, empty states for the new velocity/funnel components, or what happens when `deal_stage_history` has zero records (division by zero on averages).

---

## Revised 100/100 Plan

### Phase 1: Database Fixes (Migration)

**1a. Fix `get_deal_stage_for_job` — complete rewrite:**
```text
Priority cascade:
1. Any application with status = 'hired' → "Closed Won" (P:100)
2. Job is_lost = true → "Closed Lost" (P:0)  
3. Any candidate at pipeline stage matching "Offer/Final/Face to Face" → "Negotiation" (P:75)
4. Any candidate at pipeline stage matching "Interview/Assessment/Round/Technical" → "Proposal" (P:50)
5. Any application with partner_review_status = 'approved' AND count >= 5 → "Proposal" (P:50)
6. Any application with partner_review_status = 'approved' → "Qualified" (P:25)
7. Any application with internal_review_status = 'approved' → "Qualified" (P:25)
8. Any candidate at pipeline stage matching "Screen" → "Qualified" (P:25)
9. Has any applications → "New" (P:10)
10. Fallback → "New" (P:10)
```
The function must ALSO update `deal_probability` to match the stage's `probability_weight`.

**1b. Fix the trigger** to also set `deal_probability` when it sets `deal_stage`.

**1c. Fix `is_terminal`** on Closed Won and Closed Lost stages.

**1d. Fix duplicate Assessment mapping** — delete the duplicate.

### Phase 2: Backfill (Data operation via insert tool)

- Re-evaluate ALL jobs (published + closed) through new function
- For each job where `deal_stage` changes: insert a `deal_stage_history` record with `from_stage`, `to_stage`, `duration_days` calculated from `created_at` to now
- Fix 2 orphaned closed jobs: check `is_lost` flag to classify as Won or Lost
- Sync `deal_probability` to match each job's deal stage `probability_weight`

### Phase 3: Velocity RPC

Create `get_pipeline_velocity_metrics` returning:
- Stage distribution: count of jobs per deal_stage with weighted values
- Conversion rates: from `deal_stage_history` — % of jobs that moved from each stage to next
- Avg days per transition: from `duration_days` grouped by `from_stage → to_stage`
- Win rate: Closed Won / (Won + Lost)
- Avg days to close: job `created_at` → closed job `updated_at` for won deals

### Phase 4: Fix Existing Bugs

- `PipelineInsights.tsx` line 27, 43: change `'open'` → `'published'`
- `RevenueCharts.tsx` velocity chart: replace fake "jobs created per month" with actual transitions from `deal_stage_history`

### Phase 5: Frontend — Velocity & Funnel

**`PipelineConversionFunnel.tsx`**: Horizontal funnel bars (New → Qualified → Proposal → Negotiation → Won) with conversion % between each. Use data from the velocity RPC. Include empty state when < 5 history records.

**`PipelineVelocityMetrics.tsx`**: Cards showing avg days per stage, win rate, time-to-close. Color-coded bars (green < 7d, yellow 7-14d, red > 14d).

**Integration**: Replace the empty placeholder `div` in DealsPipeline.tsx Insights tab with these two components.

**`usePipelineVelocity` hook**: Wraps the new RPC with `useQuery`, 60s staleTime.

### Phase 6: Edge Cases & Polish

- Handle division-by-zero in velocity metrics when history is empty
- Add `ErrorState` with retry to new components
- Ensure `useUpdateDealStage` (manual Kanban drag) also syncs `deal_probability`

---

## Files Summary

| File | Action | Phase |
|------|--------|-------|
| Migration SQL | Rewrite `get_deal_stage_for_job` + fix trigger + fix `is_terminal` | 1 |
| Data operation | Backfill jobs + insert history records | 2 |
| Migration SQL | Create `get_pipeline_velocity_metrics` RPC | 3 |
| `src/components/deals/PipelineInsights.tsx` | Fix `'open'` → `'published'` | 4 |
| `src/components/deals/RevenueCharts.tsx` | Fix fake velocity data | 4 |
| `src/components/deals/PipelineConversionFunnel.tsx` | New | 5 |
| `src/components/deals/PipelineVelocityMetrics.tsx` | New | 5 |
| `src/hooks/useDealPipeline.ts` | Add `usePipelineVelocity` + fix `useUpdateDealStage` to sync probability | 5-6 |
| `src/pages/admin/DealsPipeline.tsx` | Wire funnel + velocity into Insights tab | 5 |

