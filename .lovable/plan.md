

# Merge into One Power Widget: Enhanced KPI Scorecard

## What We're Consolidating

Three widgets currently show overlapping pipeline data:

1. **Pipeline Funnel** (Zone 2) -- candidate counts per stage, volume bottleneck, overdue count
2. **KPI Scorecard** (Zone 2.5) -- 11 metrics across 4 pillars with time-range toggle
3. **Operational Efficiency** (Zone 4) -- avg days per stage bars, dwell bottleneck, repeat placement rate

The merged widget keeps the KPI Scorecard as the shell (it already has the best structure: 4 pillars + time toggle) and absorbs every unique insight from the other two.

## What Gets Added to the KPI Scorecard

From **Pipeline Funnel**:
- Candidate count per stage (mini inline funnel bar under the Efficiency pillar)
- Overdue candidates count (badge/alert)

From **Operational Efficiency**:
- Repeat Placement Rate (new metric in Operations pillar)
- Stage dwell times are already captured by Time to Shortlist and Time to Hire; the per-stage bars are visual sugar that clutters a scorecard -- we drop the bar chart but keep the bottleneck alert

## Updated Pillar Layout

| Pillar | Metrics |
|--------|---------|
| Efficiency | Time to Shortlist, SLA Compliance, Time to Hire + mini funnel strip (5 colored dots with counts) |
| Profitability | Rev / Placement, Pipeline Conv, Total Revenue |
| Operations | Fill Rate, Offer Accept, Interview:Hire, Repeat Rate |
| NPS | Candidate NPS, Partner NPS |

Below the 4-pillar grid: a slim alert row showing bottleneck stage and overdue count (if any).

## Files Changed

| File | Action |
|------|--------|
| `src/hooks/useAdminKPIScorecard.ts` | Add queries for stage counts, overdue count, and repeat placement rate; extend the return type |
| `src/components/clubhome/KPIScorecard.tsx` | Add Operations `repeatRate` metric; add mini funnel strip under Efficiency; add alert row for bottleneck + overdue |
| `src/components/clubhome/AdminHome.tsx` | Remove `PipelineFunnel` from Zone 2; remove `OperationalEfficiencyWidget` from Zone 4; promote `RevenueSparkline` to full width; adjust Zone 4 to just NPS |
| `src/components/clubhome/OperationalEfficiencyWidget.tsx` | Delete |
| `src/components/clubhome/PipelineFunnel.tsx` | Delete |
| `src/components/clubhome/PipelineVelocityWidget.tsx` | Delete (orphaned) |
| `src/hooks/usePipelineVelocity.ts` | Delete (orphaned) |

## Technical Detail

### Hook changes (`useAdminKPIScorecard.ts`)

Add three new data points to the existing query batch:

```text
1. Stage counts -- 5 head-only queries on applications by status (same as PipelineFunnel)
2. Overdue count -- applications in active stages where updated_at < 7 days ago
3. Repeat rate -- count companies with 2+ hires from continuous_pipeline_hires
```

Extend `KPIScorecardData` type:

```text
operations: { ...existing, repeatRate: KPIPillarMetric }
pipeline: { stageCounts: Record<string, number>; bottleneck: string; overdue: number }
```

### Component changes (`KPIScorecard.tsx`)

- Update `pillarConfig` for Operations to include `'repeatRate'`
- Below the pillar grid, render a compact row:
  - Mini funnel: 5 colored dots with stage counts (same colors as PipelineFunnel)
  - Bottleneck badge (amber) if detected
  - Overdue badge (red) if count > 0
  - "View All" link to /applications

### AdminHome layout after merge

```text
Zone 0:   Daily Briefing
Zone 0.5: Club AI Chat
Zone 1:   Command Strip
Zone 2:   Revenue Sparkline (full width, single card)
Zone 2.5: KPI Scorecard (the merged power widget)
Zone 3:   Predictive Signals
Zone 3.5: Team + Partner (2 col)
Zone 4:   NPS Pulse + Tasks (2 col)
Zone 4.5: Meetings (single)
Zone 5:   Live Operations
Zone 6:   Agent Activity
```

## Risk

Low. All data queries already exist across the three widgets being merged. We are consolidating, not inventing new logic. The orphaned files have zero dependents.

