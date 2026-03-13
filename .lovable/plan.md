

# Finance Hub Full Audit

## Architecture Overview

The Finance Hub has **10 tabs** with nested sub-tabs in several of them. After deep inspection, here are the findings organized by severity.

---

## CRITICAL ISSUES

### 1. Deal Pipeline: No company-level view or filtering
The Kanban board shows all deals flat — no way to group by company, filter by company, or see "top companies by pipeline value." This is the feature you specifically requested. Currently `useDealPipeline` fetches all published/closed jobs with company data joined, but there's zero filtering UI.

**Fix**: Add a company filter dropdown + a "Company Summary" view card above the Kanban showing top companies ranked by total pipeline value, deal count, and weighted value.

### 2. `useDealPipeline` N+1 query problem (PERFORMANCE)
Lines 109-151: For EVERY deal, a separate RPC call `get_pipeline_candidate_stats` fires. With 50 deals, that's 50 sequential network round-trips. This is extremely slow.

**Fix**: Create a single RPC `get_pipeline_candidate_stats_batch` that accepts an array of job IDs and returns all salary stats in one call.

### 3. `ProjectedEarnings` queries phantom table
Line 16: `(supabase as any).from("projected_earnings")` — the `as any` cast confirms this table may not exist or isn't in the typed schema. The "Recalculate" button calls `calculate_projected_earnings` RPC which may also be phantom.

**Fix**: Verify if `projected_earnings` table and `calculate_projected_earnings` RPC exist. If not, remove this component from the Forecasting tab.

### 4. `RevenueCharts` queries phantom table
Line 20-21: `(supabase as any).from('projected_earnings')` — same phantom table issue in the Revenue Trend chart's "projected" line.

**Fix**: Replace with data from `placement_fees` (realized) and weighted pipeline (projected) from the existing `calculate_weighted_pipeline` RPC.

---

## MODERATE ISSUES

### 5. Deal Pipeline tab has 8 sub-tabs — too many
Pipeline, Revenue, Forecasting, Probation, Team, Clients, Analytics, Insights. Several of these don't belong under "Deal Pipeline":
- **Probation Tracker**: Is about hired candidate probation periods — belongs in HR/People, not pipeline
- **Strategist Leaderboard**: Is about team performance — belongs in a People/Team tab
- **Client Health**: Is about account health — could be its own Finance Hub tab

This creates confusion: a user looking for "client health" wouldn't think to look inside "Deal Pipeline."

**Fix**: Move Probation, Leaderboard, and Client Health out of the Deal Pipeline sub-tabs. Client Health becomes a top-level Finance Hub tab. Probation and Leaderboard move to a People/Team section or become their own top-level tabs.

### 6. Revenue Intelligence Dashboard duplicates Pipeline Metrics Cards
`RevenueIntelligenceDashboard` (Forecasting tab) shows Total Pipeline Value, Weighted Pipeline, Quarter Forecast, Avg Deal Size — the first two are identical to what `PipelineMetricsCards` already shows at the top of the page. The user sees the same numbers twice.

**Fix**: Remove the duplicate cards from `RevenueIntelligenceDashboard`. Keep only the unique "Revenue by Stage" breakdown and "Quarter Forecast."

### 7. `RevenuePreCalculation` duplicates Pipeline Metrics Cards again
The Revenue tab shows Total Pipeline, Weighted Pipeline, Confidence Score, Deal Count — again overlapping with the top-level metrics cards.

**Fix**: Remove the duplicate 4-card grid. Keep only the unique Confidence Breakdown and Fee Type Distribution.

### 8. Financial Dashboard is a monolith (345 lines) with inline P&L query
Lines 60-118: A massive inline `useQuery` calculates P&L by querying 5 tables sequentially. This should be a dedicated hook (`useFinancialPLSummary`).

**Fix**: Extract to `src/hooks/useFinancialPLSummary.ts`.

### 9. `PipelineVelocityMetrics` hardcodes stage order
Lines 34-40: Stage names and order are hardcoded (`New: 1, Qualified: 2, Proposal: 3, Negotiation: 4, Closed Won: 5`). If stages are renamed or reordered in Pipeline Settings, this breaks silently.

**Fix**: Use the `deal_stages` table's `stage_order` field instead of hardcoded values.

---

## MISSING FEATURES

### 10. No company-level pipeline breakdown (YOUR REQUEST)
Need a "Company Pipeline Summary" component that shows:
- Company name, logo
- Number of active deals
- Total pipeline value (gross + weighted)
- Furthest stage reached
- Average time-in-pipeline
- Sortable/filterable table

### 11. No pipeline filters at all
The Kanban has zero filtering: no date range, no company, no strategist/owner, no deal value range. For a CFO-grade tool this is a significant gap.

**Fix**: Add a filter bar above the Kanban with: Company, Date Range, Min/Max Value, Stage, Status (draft/published/closed).

### 12. No "Closed Won" history view
Once a deal moves to Closed Won, it disappears from the active pipeline. There's `useLostDeals` but no `useWonDeals`. A CFO needs to see realized wins.

**Fix**: Add a "Won Deals" tab or section showing historical closed-won deals with actual fee amounts.

### 13. Financial Dashboard missing year filter on several components
`UninvoicedFeesAlert`, `MissingFeesAlert`, `PlacementFeeHealth` — none accept a `year` prop. They show all-time data regardless of the year selector at the top.

---

## CLEANUP ITEMS

### 14. `as any` casts throughout
- `useDealStages` line 57: `(supabase as any)`
- `usePipelineMetrics` line 165: `(supabase as any)`
- `DealCard` line 48: `deal.companies as Record<string, any>`
- `PipelineMetricsCards` line 59: `deal.companies as any`

These bypass type safety. The tables should be in the schema types or proper interfaces used.

### 15. `RevenueIntelligenceDashboard` imports `formatCurrency` from wrong module
Line 4: imports from `@/lib/revenueCalculations` which re-exports from `@/lib/currency`. Should import directly from `@/lib/format` like other components.

---

## IMPLEMENTATION PLAN

### Step 1: Add Company Pipeline Summary (new component + filter)
- Create `CompanyPipelineSummary.tsx` — table of companies with deal count, gross pipeline, weighted pipeline, avg stage
- Add company filter `Select` to `DealsPipeline.tsx` that filters the Kanban
- Pass `companyId` filter through to `useDealPipeline` (optional param)

### Step 2: Fix N+1 query in `useDealPipeline`
- Create `get_pipeline_candidate_stats_batch` RPC via migration
- Update `useDealPipeline` to call it once with all job IDs

### Step 3: Clean up Deal Pipeline tabs
- Remove Probation, Leaderboard from Deal Pipeline sub-tabs
- Keep: Pipeline, Revenue, Forecasting, Clients, Analytics, Insights (6 tabs)
- Add "Won Deals" section to Pipeline tab (toggle between active/won)

### Step 4: Remove duplicate metrics
- Strip duplicate Total/Weighted Pipeline cards from `RevenueIntelligenceDashboard`
- Strip duplicate 4-card grid from `RevenuePreCalculation`

### Step 5: Fix phantom table references
- Verify `projected_earnings` existence; if phantom, replace with real data sources in `ProjectedEarnings` and `RevenueCharts`

### Step 6: Add pipeline filter bar
- Company, Date Range, Value Range, Stage filters above Kanban
- Pass filters to `useDealPipeline` query

### Step 7: Extract P&L query to hook
- Move inline query from `FinancialDashboard` to `useFinancialPLSummary`

### Step 8: Fix hardcoded stage order in `PipelineVelocityMetrics`
- Query `deal_stages` table for dynamic ordering

---

## Files to Change

| File | Change |
|------|--------|
| `src/components/deals/CompanyPipelineSummary.tsx` | **CREATE** — company breakdown table |
| `src/pages/admin/DealsPipeline.tsx` | Add company filter, remove Probation/Leaderboard tabs, add Won Deals toggle |
| `src/hooks/useDealPipeline.ts` | Add optional `companyId` param, batch salary stats RPC |
| `src/components/deals/DealPipelineKanban.tsx` | Accept `companyId` filter prop |
| `src/components/deals/RevenueIntelligenceDashboard.tsx` | Remove duplicate metric cards |
| `src/components/deals/RevenuePreCalculation.tsx` | Remove duplicate 4-card grid |
| `src/components/deals/PipelineVelocityMetrics.tsx` | Dynamic stage order from DB |
| `src/components/financial/ProjectedEarnings.tsx` | Fix phantom table or replace data source |
| `src/components/deals/RevenueCharts.tsx` | Fix phantom table reference |
| `src/pages/admin/FinancialDashboard.tsx` | Extract P&L to hook |
| DB Migration | `get_pipeline_candidate_stats_batch` RPC |

