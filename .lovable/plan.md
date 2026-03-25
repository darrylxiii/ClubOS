

# Intelligent Job Urgency Meter (0-10) — Deep Audit & Design

## Data Signals Available in Our OS

After auditing the full schema and data flows, here is every signal we can leverage — far beyond basic "days open" heuristics:

### Tier 1: Pipeline Signals (from `applications` table, already fetched)
| Signal | What it tells us | Score contribution |
|--------|-----------------|-------------------|
| **Candidate count** | How many people are in the pipeline | Low count on old job = urgent |
| **Active stage count** | How many candidates are actively progressing | Zero active = stalled pipeline |
| **Conversion rate** | % of candidates who reached "hired" | Low conversion = struggling role |
| **Days since last activity** | When last application was updated | Stale pipeline = urgent |
| **Stage distribution** | Are candidates bunched at early stages? | Everyone stuck at screening = bottleneck |

### Tier 2: Job Lifecycle Signals (from `jobs` table)
| Signal | What it tells us | Score contribution |
|--------|-----------------|-------------------|
| **Days open** (`created_at`) | How long the role has been open | Longer = more urgent |
| **Expected close date** (`expected_close_date`) | Deadline set by partner | Past deadline = critical |
| **Expected start date** (`expected_start_date`) | When they need someone | Approaching start with no hire = critical |
| **Deal health score** (`deal_health_score`) | CRM deal health | Low health + open role = at risk |
| **Deal probability** (`deal_probability`) | Likelihood of placement | Low probability = needs intervention |
| **Is continuous** (`is_continuous`) | Ongoing hiring vs single fill | Different urgency model |
| **Target hire count vs hired count** | Progress toward goal | Far from target = urgent |
| **Urgency field** (`urgency`) | Partner-stated urgency ("immediate", "two_weeks") | Direct input signal |
| **Published at** (`published_at`) | When it went live | Time since publish matters more than created_at |

### Tier 3: CRM Intelligence Signals (from `company_intelligence_scores`)
| Signal | What it tells us | Score contribution |
|--------|-----------------|-------------------|
| **`hiring_urgency_score`** | AI-extracted urgency from partner interactions | Direct 0-10 already computed by AI from meetings/calls |
| **`relationship_health_score`** | How healthy is the partner relationship | Urgent job + deteriorating relationship = critical |
| **`last_interaction_at`** | When we last spoke to the partner | No recent comms + stale job = danger |

### Tier 4: Interaction Intelligence (from `interaction_insights`)
| Signal | What it tells us | Score contribution |
|--------|-----------------|-------------------|
| **`hiring_urgency` insight** | AI-extracted from meeting transcripts | "They mentioned needing someone by end of month" |
| **`decision_timeline` insight** | Deadlines mentioned in conversations | Hard deadlines boost urgency |
| **Competitor mentions** | Other agencies mentioned | Competition = time pressure |

### Tier 5: Activity Feed (from `activity_feed`)
| Signal | What it tells us | Score contribution |
|--------|-----------------|-------------------|
| **Event frequency for job** | How much activity is happening | Declining activity = stalling |
| **Event types** | Are reviews happening? Interviews scheduled? | No interviews scheduled for weeks = stalled |

## Scoring Algorithm

```text
computeJobUrgencyScore(job, applications, intelligence) → 0-10

┌─────────────────────────────────────────────────────────┐
│  LAYER 1: TIME PRESSURE (max 3 points)                  │
│  ─ Days open: >60d=2, >30d=1.5, >14d=0.5               │
│  ─ Past expected_close_date: +1                         │
│  ─ Expected start <14d away with no hire: +1            │
│  ─ Partner-stated urgency "immediate": +1               │
├─────────────────────────────────────────────────────────┤
│  LAYER 2: PIPELINE HEALTH (max 3 points)                │
│  ─ Zero candidates: +2                                  │
│  ─ <3 candidates on job >14d old: +1.5                  │
│  ─ Zero active candidates (all rejected/withdrawn): +2  │
│  ─ All candidates stuck at stage 0: +1                  │
│  ─ Conversion rate <5%: +0.5                            │
├─────────────────────────────────────────────────────────┤
│  LAYER 3: ACTIVITY DECAY (max 2 points)                 │
│  ─ No activity in >14d: +2                              │
│  ─ No activity in >7d: +1                               │
│  ─ No activity in >3d: +0.5                             │
├─────────────────────────────────────────────────────────┤
│  LAYER 4: INTELLIGENCE BOOST (max 2 points)             │
│  ─ CRM hiring_urgency_score >7: +1.5                   │
│  ─ CRM hiring_urgency_score >5: +0.5                   │
│  ─ Competitor mentions in insights: +0.5                │
│  ─ Relationship health <30: +0.5                        │
├─────────────────────────────────────────────────────────┤
│  MANUAL OVERRIDE (replaces everything)                  │
│  ─ Admin sets 0-10 via slider → stored in DB            │
│  ─ Shows "Manual" badge + who set it + when             │
│  ─ "Clear" button reverts to data-driven                │
└─────────────────────────────────────────────────────────┘

Final = min(10, sum of layers), capped
If manual override exists → use manual instead
```

## Implementation Plan

### 1. Database Migration
Add 3 columns to `jobs`:
```sql
ALTER TABLE public.jobs
  ADD COLUMN urgency_score_manual smallint,
  ADD COLUMN urgency_score_manual_set_by uuid REFERENCES auth.users(id),
  ADD COLUMN urgency_score_manual_set_at timestamptz;
-- Validation trigger for 0-10 range (not CHECK constraint per guidelines)
```

### 2. New: `src/lib/jobUrgencyScore.ts`
Pure scoring engine with the layered algorithm above. Inputs:
- Job fields: `created_at`, `expected_close_date`, `expected_start_date`, `urgency`, `hired_count`, `target_hire_count`, `deal_health_score`
- Pipeline metrics: `candidateCount`, `activeCount`, `conversionRate`, `lastActivityDaysAgo`, `stageDistribution`
- Intelligence: `hiringUrgencyScore`, `relationshipHealthScore` (optional, from `company_intelligence_scores`)

Returns: `{ dataScore: number, manualScore: number | null, effectiveScore: number, breakdown: { timePressure, pipelineHealth, activityDecay, intelligenceBoost } }`

### 3. New: `src/components/jobs/UrgencyMeter.tsx`
Visual component:
- **Circular arc gauge** showing 0-10 with color gradient (green → amber → red)
- Number displayed in center, bold
- **Tooltip** showing full breakdown: "Time: 2 | Pipeline: 1.5 | Activity: 1 | Intel: 0.5 = 5.0"
- If manual override: shows "Manual override by [name], [time ago]" with clear button
- **Admin popover**: click to open slider (0-10) + save/clear buttons
- Compact variant for card view, expanded variant for detail view

### 4. Query Updates — `PartnerJobsHome.tsx`
- Add `urgency_score_manual`, `urgency_score_manual_set_by`, `urgency_score_manual_set_at`, `expected_close_date`, `expected_start_date`, `urgency`, `deal_health_score` to the jobs select
- After fetching jobs, batch-fetch `company_intelligence_scores` for all company IDs to get `hiring_urgency_score` and `relationship_health_score`
- Compute `dataScore` client-side per job, pass to cards

### 5. Integration into Job Cards
| Component | Placement |
|-----------|-----------|
| `CompactJobCard.tsx` | Top-right, replacing/supplementing existing status indicators |
| `JobCardHeader.tsx` | In badge row alongside status & continuous badges |
| `JobTableView.tsx` | New sortable "Urgency" column |

### 6. Sorting & Filtering
- Add urgency score as a sort option in the filter bar
- Add quick filter: "Urgent (7+)" to surface critical jobs
- Default sort: urgency descending (most urgent first) as an option

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | Add 3 columns + validation trigger to `jobs` |
| `src/lib/jobUrgencyScore.ts` | New — layered scoring engine |
| `src/components/jobs/UrgencyMeter.tsx` | New — visual gauge + admin override popover |
| `src/components/partner/PartnerJobsHome.tsx` | Expand query, compute scores, pass to cards |
| `src/components/partner/jobs/CompactJobCard.tsx` | Add UrgencyMeter |
| `src/components/partner/job-card/JobCardHeader.tsx` | Add UrgencyMeter alongside badges |
| `src/components/partner/JobTableView.tsx` | Add sortable Urgency column |
| `src/components/partner/jobs/index.ts` | Export new types |

