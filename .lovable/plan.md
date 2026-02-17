

# KPI Scorecard: Time Range Toggle + Missing KPIs

## What Changes

### 1. Time Range Toggle on the KPI Scorecard

Add a compact toggle strip to the top-right of the existing `KPIScorecard` card. Options:

- **30d** (Last Month) -- default
- **3m** (Last 3 Months)
- **6m** (Last 6 Months)
- **1y** (Last Year)
- **All** (All Time)

The toggle is a row of small pill buttons (like Linear/Notion uses), sitting inline with the card header. Selecting a range re-fetches all 8 KPIs filtered to that window. The selected range is passed into `useAdminKPIScorecard(range)` which applies date filters to every query.

### 2. Missing KPIs to Add

After auditing every table, here are the high-value metrics currently not surfaced:

**Efficiency Pillar -- add 1 metric:**
- **Avg Time-to-Hire** (days from `applications.created_at` to `status = 'hired'`) -- the end-to-end companion to Time-to-Shortlist

**Profitability Pillar -- add 1 metric:**
- **Total Revenue** (sum of `placement_fees.fee_amount` where `status != 'cancelled'`) -- absolute number, not just per-placement average

**Operations Pillar -- add 1 metric:**
- **Interview-to-Hire Ratio** (interviews conducted vs hires made from `interviews` + `applications`) -- measures interview efficiency

This brings the scorecard from 8 to 11 metrics (still 2-3 per pillar, fits the horizontal layout with a slight density increase).

## Technical Approach

### Hook Changes (`useAdminKPIScorecard.ts`)

- Accept a `dateRange` parameter: `'30d' | '3m' | '6m' | '1y' | 'all'`
- Calculate a `sinceDate` from the range
- Add `.gte('created_at', sinceDate.toISOString())` to all 4 queries (skip for `'all'`)
- Add new parallel fetches for `interviews` and `placement_fees`
- Include `queryKey` with the range so each range is cached independently
- Add calculations for the 3 new metrics

### UI Changes (`KPIScorecard.tsx`)

- Add state: `const [range, setRange] = useState<KPIRange>('30d')`
- Pass range to hook: `useAdminKPIScorecard(range)`
- Render a toggle strip above the pillar grid:
  - Left: pillar title area stays
  - Right: row of `Button variant="ghost"` pills with active state styling
- Update `pillarConfig` to include the 3 new metrics
- Each pillar now shows 2-3 metrics; layout adjusts with `flex-wrap`

### Interface Changes (`KPIScorecardData`)

Expand the interface:
```
efficiency: { timeToShortlist, slaCompliance, timeToHire }
profitability: { revenuePerPlacement, pipelineConversion, totalRevenue }
operations: { fillRate, offerAcceptance, interviewToHire }
nps: { candidateNPS, partnerNPS }  // unchanged
```

### New Metric Calculations

**Avg Time-to-Hire:**
Filter applications where `status = 'hired'` and `stage_updated_at` exists, calculate avg days from `created_at` to `stage_updated_at`.

**Total Revenue:**
Sum `placement_fees.fee_amount` where `status` is not cancelled, within the date range.

**Interview-to-Hire Ratio:**
Count interviews from `interviews` table within range, divide by hired count from applications. Display as ratio like "8:1" (8 interviews per hire).

### Files Modified
- `src/hooks/useAdminKPIScorecard.ts` -- add range parameter, new queries, new metric calculations
- `src/components/clubhome/KPIScorecard.tsx` -- add toggle UI, expand pillar config, new format type for ratio

### Design Details
- Toggle buttons: `h-6 px-2 text-[10px] rounded-full` with `bg-primary/10 text-primary` for active state
- Matches the refined luxury aesthetic: no borders on buttons, subtle background change only
- Loading state: show skeleton in place of metrics while refetching (React Query handles this with `keepPreviousData`)
- The toggle sits right-aligned in a thin header row above the 4-pillar grid, adding ~24px of height

### No database changes required
All new metrics come from existing `interviews` and `placement_fees` tables.

