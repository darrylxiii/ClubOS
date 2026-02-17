

# Admin Homepage KPI Integration -- Four Pillars

## Overview

Add a new **KPI Scorecard Strip** to the Admin homepage between the Intelligence Row (Zone 2) and the Predictive Signals Strip (Zone 2.5). This is a single, compact horizontal widget showing the 8 most critical KPIs across four pillars: Efficiency, Profitability, Operations, and NPS. Each metric is calculated from real database records with no fabricated data.

Additionally, surface the existing `NPSPulseWidget` in the Operations Grid and add an `OperationalEfficiencyWidget` to replace the gap left by consolidating metrics.

## New Components

### 1. `KPIScorecard.tsx` -- The Core Addition

A single full-width card with 4 pillar sections, each containing 2 metrics. Compact, high-density, horizontal layout matching the existing `CommandStrip` aesthetic.

**Efficiency Pillar**
- **Time-to-Shortlist** (avg days from `applications.created_at` to `status = 'screening'` or `stage_updated_at`)
- **SLA Compliance %** (applications updated within 7 days / total active applications)

**Profitability Pillar**
- **Revenue per Placement** (total placement fees from `continuous_pipeline_hires.placement_fee` / total hires)
- **Pipeline Conversion Rate** (hired count / total applications, trailing 90 days)

**Operations Pillar**
- **Fill Rate %** (jobs with `hired_count > 0` / total closed+filled jobs)
- **Offer Acceptance Rate** (hired / (hired + rejected at offer stage) -- derived from applications data)

**NPS Pillar**
- **Candidate NPS** (from `nps_surveys` where `respondent_type = 'candidate'`)
- **Partner NPS** (from `nps_surveys` where `respondent_type = 'partner'` or `'client'`)

Each metric shows: value, trend arrow (vs prior period), and a semantic color (emerald/amber/red).

### 2. `OperationalEfficiencyWidget.tsx`

A compact widget for the Operations Grid showing:
- Avg Days in Stage (per pipeline stage, horizontal bar chart)
- Bottleneck indicator (which stage has the longest dwell)
- Repeat Placement Rate (companies with 2+ placements / total companies with placements)

## Layout Changes to `AdminHome.tsx`

```text
Zone 0:   DailyBriefingBanner (unchanged)
Zone 0.5: ClubAIHomeChatWidget (unchanged)
Zone 1:   CommandStrip (unchanged)
Zone 2:   RevenueSparkline + PipelineFunnel (unchanged)
Zone 2.5: KPIScorecard (NEW -- replaces nothing, inserted here)
Zone 3:   PredictiveSignalsStrip (unchanged)
Zone 3.5: TeamCapacity + PartnerEngagement (unchanged)
Zone 4:   OperationalEfficiencyWidget + NPSPulseWidget (NEW arrangement)
Zone 4.5: AdminTasks + ActiveMeetings (unchanged)
Zone 5:   LiveOperations (unchanged)
Zone 6:   AgentActivity (unchanged)
```

## Data Queries (all from existing tables)

**Efficiency metrics:**
```sql
-- Time to shortlist: avg days from created_at to stage_updated_at where status moved past 'applied'
SELECT AVG(EXTRACT(EPOCH FROM (stage_updated_at - created_at)) / 86400)
FROM applications
WHERE stage_updated_at IS NOT NULL AND status != 'applied';

-- SLA compliance: % updated within 7 days
SELECT COUNT(*) FILTER (WHERE updated_at > created_at + interval '0 days' 
  AND EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400 <= 7) * 100.0 / NULLIF(COUNT(*), 0)
FROM applications WHERE status IN ('active', 'screening', 'interview');
```

**Profitability metrics:**
```sql
-- Revenue per placement
SELECT AVG(placement_fee) FROM continuous_pipeline_hires WHERE placement_fee > 0;

-- Pipeline conversion (90d)
SELECT COUNT(*) FILTER (WHERE status = 'hired') * 100.0 / NULLIF(COUNT(*), 0)
FROM applications WHERE created_at > now() - interval '90 days';
```

**Operations metrics:**
```sql
-- Fill rate
SELECT COUNT(*) FILTER (WHERE hired_count > 0) * 100.0 / NULLIF(COUNT(*), 0)
FROM jobs WHERE status IN ('closed') OR hired_count > 0;

-- Offer acceptance (approximated from hired vs rejected-at-offer)
SELECT COUNT(*) FILTER (WHERE status = 'hired') * 100.0 
  / NULLIF(COUNT(*) FILTER (WHERE status IN ('hired', 'rejected')), 0)
FROM applications;
```

**NPS metrics:**
```sql
-- Candidate NPS
SELECT 
  (COUNT(*) FILTER (WHERE nps_score >= 9) - COUNT(*) FILTER (WHERE nps_score <= 6)) * 100.0 / NULLIF(COUNT(*), 0)
FROM nps_surveys WHERE respondent_type = 'candidate';
```

## Technical Details

### Files to Create
- `src/components/clubhome/KPIScorecard.tsx` -- Four-pillar horizontal scorecard
- `src/components/clubhome/OperationalEfficiencyWidget.tsx` -- Stage dwell times + repeat rate
- `src/hooks/useAdminKPIScorecard.ts` -- Single hook that fetches all 8 metrics in parallel

### Files to Modify
- `src/components/clubhome/AdminHome.tsx` -- Insert `KPIScorecard` at Zone 2.5, add `NPSPulseWidget` and `OperationalEfficiencyWidget` to Operations Grid

### Design Approach
- Each pillar is a visually distinct section separated by a thin vertical border
- Metrics use `text-2xl font-bold` for the value, `text-[10px]` for the label
- Trend arrows use emerald (up/good), amber (flat), red (down/bad) with the direction flipped for "time" metrics (lower is better)
- The entire strip fits in approximately 80px of vertical height
- Matches the glass-subtle card style used by all existing widgets
- No database schema changes required -- all queries use existing tables

### No Database Changes Required
All KPIs are derived from existing `applications`, `jobs`, `continuous_pipeline_hires`, and `nps_surveys` tables.

