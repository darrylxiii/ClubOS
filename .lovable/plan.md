

# Job Dashboard Revamp — Full Audit and Redesign Plan

## Current Problems (Audit Findings)

### Layout and Information Architecture
- **Pipeline buried**: The most critical element (pipeline breakdown) is the 5th thing you scroll past, behind CandidatesAtRisk, PipelineVelocity, JobPerformanceScorecard, CandidateLeaderboard, and SmartInsights
- **Sidebar squeeze**: 360px sidebar creates an awkward 70/30 split that compresses the pipeline into insufficient space
- **1,063-line monolith**: The page file is unmaintainable with inline Supabase calls, state management, and rendering all in one
- **7 tabs**: Too many — Intelligence and My View tabs contain aspirational/mock content that adds clutter without value
- **Redundant widgets**: QuickActionsBar duplicates header actions; SmartInsightsCard shows generic tips; CandidateLeaderboard duplicates what pipeline cards already show
- **Status badge pulses infinitely**: `animate-pulse` on the status badge is distracting and amateurish

### Visual Issues
- **Header too tall**: Back button + logo + title + 6 buttons + badges spanning two lines — too much visual noise
- **Icon legend takes prime real estate**: The format legend (Online/In-Person/Hybrid/Assessment) occupies a full row that could be contextual
- **No visual hierarchy in stats**: EnhancedStatsGrid in sidebar competes with PipelineVelocityTracker and JobPerformanceScorecard in the main area — three competing stat displays
- **Card overload**: Every section is wrapped in its own Card with full headers, creating a "dashboard of dashboards" effect

### Functional Gaps
- **No drag-and-drop between stages for candidates**: Only stage reordering exists — partners need to drag candidates between columns
- **No quick-filter on pipeline**: No way to search/filter candidates within the pipeline view
- **Review count not prominent**: Pending reviews (the most actionable item) are buried in a tab badge
- **No "at a glance" job health**: Partners need to know instantly if this job needs attention

## Redesign Plan

### New Layout Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  COMPACT HEADER BAR                                          │
│  [←] Logo  Title · Company   [Status] [Edit] [Share] [···]  │
├─────────────────────────────────────────────────────────────┤
│  STATS BAR (single horizontal row)                           │
│  47 Candidates · 12 Active · 5 Pending Reviews · 23d Open   │
│  · 68% Conversion · Avg 18d to Hire                         │
├─────────────────────────────────────────────────────────────┤
│  PIPELINE KANBAN (full-width, horizontal scroll)             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Applied  │ │ Screening│ │Interview │ │  Offer   │       │
│  │   (24)   │ │   (12)   │ │   (8)    │ │   (3)    │       │
│  │ ──────── │ │ ──────── │ │ ──────── │ │ ──────── │       │
│  │ Card     │ │ Card     │ │ Card     │ │ Card     │       │
│  │ Card     │ │ Card     │ │ Card     │ │ Card     │       │
│  │ Card     │ │          │ │          │ │          │       │
│  │ +3 more  │ │          │ │          │ │          │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                          [+ Add Stage]      │
├─────────────────────────────────────────────────────────────┤
│  TABS: Reviews (5) · Analytics · Activity · Rejected (3)    │
│        · More (admin: Audit, Email Dump, Knowledge)          │
└─────────────────────────────────────────────────────────────┘
```

### Step 1: Create `JobDashboardHeader.tsx`
- Single compact row: back arrow, company logo (32px), job title, company name, status badge (no pulse), actions
- Actions: Edit button, Share button (with active share count dot), `···` dropdown (Job Context, Close, Archive, Delete)
- ContinuousPipelineBadge moved inline next to status
- Absorbs info from current header + `JobSummaryCard`

### Step 2: Create `JobDashboardStatsBar.tsx`
- Horizontal single-row stats strip matching `PartnerInlineStats` pattern
- 6 metrics: Total Candidates, Active in Pipeline, Pending Reviews (with attention dot if > 0), Days Open, Conversion Rate, Avg Time to Hire
- Uses `AnimatedNumber` for values
- Color-coded thresholds (green/amber/red) for days open, conversion, time to hire
- Replaces: `EnhancedStatsGrid`, `PipelineVelocityTracker`, `JobPerformanceScorecard`

### Step 3: Create `PipelineKanbanBoard.tsx`
- Full-width horizontal Kanban with one column per pipeline stage
- Horizontal scroll via `ScrollArea` with `ScrollBar`
- Each column: stage name, candidate count, avg days badge, conversion arrow to next stage
- Column header includes stage owner icon (company vs club) and format icon
- "Add Stage" button at the end of the row
- Reuses existing `dnd-kit` setup for candidate drag between columns AND stage reorder
- Search/filter bar above the board (name search, match score filter)

### Step 4: Create `PipelineKanbanColumn.tsx`
- Glass-morphic column with stage-specific accent color
- Header: stage name, count badge, avg days, health indicator (green/amber/red dot)
- Scrollable candidate list within column
- "Show all" toggle when > 5 candidates (shows first 5 by default)
- Drop zone highlighting when dragging a candidate

### Step 5: Create `PipelineKanbanCard.tsx`
- Compact candidate card: avatar, name, current title, match score bar, days in stage
- Quick action buttons on hover: Advance (arrow right), Reject (X), View Profile (eye)
- Subtle risk indicator (amber/red dot) if candidate has been in stage too long
- Click to navigate to candidate profile
- Reuses existing `EnhancedCandidateActionDialog` for advance/reject flows

### Step 6: Refactor `JobDashboard.tsx`
- Reduce from ~1,063 lines to ~350 by composing new components
- Remove inline Supabase calls for stage operations (already have `usePipelineManagement` hook)
- Streamline tabs from 7 to 5:
  - **Reviews** (with pending count badge) — InternalReviewPanel + PartnerFirstReviewPanel
  - **Analytics** — JobAnalytics + JobInterviewRecordingsPanel
  - **Activity** — InlineActivityFeed + TeamActivityCard + JobTeamPanel (moved from sidebar)
  - **Rejected** (with count) — RejectedCandidatesTab
  - **More** (admin/strategist only) — Audit Log, Email Dump, Job Context/Knowledge, Documents
- Remove Intelligence tab (PredictiveAnalytics, MLInsights, CandidateIntelligenceDossier, ExecutiveBriefing — aspirational/mock)
- Remove My View tab (role-based dashboards — future standalone feature)
- Kill the sidebar entirely — full-width layout

### Step 7: Component Cleanup
Remove these components (no longer referenced after revamp):
- `EnhancedStatsGrid.tsx` → replaced by StatsBar
- `JobPerformanceScorecard.tsx` → merged into StatsBar
- `PipelineVelocityTracker.tsx` → velocity info shown per-column in Kanban
- `CandidateLeaderboard.tsx` → pipeline cards show the same info
- `CandidateEngagementStream.tsx` → already unused
- `SmartInsightsCard.tsx` → generic tips, not actionable
- `QuickResponseTimeTracker.tsx` → niche metric
- `StageQuickActionsToolbar.tsx` → actions are per-card now
- `JobSummaryCard.tsx` → merged into header
- `JobDashboardSidebar.tsx` → sidebar eliminated
- `QuickActionsBar.tsx` → bulk actions moved to header dropdown

Keep all dialogs, review panels, AdminJobTools, and the ExpandablePipelineStage (repurposed for detail expansion within Kanban).

## What Partners and Admins Need to See (Prioritized)

1. **Pipeline state** (who is where) — now the hero section
2. **Pending reviews count** — prominent in stats bar with attention indicator
3. **Candidate risk** — integrated as card-level indicators (amber/red dots) instead of a separate panel
4. **Conversion funnel** — shown as arrows between Kanban column headers
5. **Stage bottlenecks** — avg days per stage shown in column headers with health colors
6. **Quick candidate actions** — advance/reject/view on hover, no extra clicks
7. **Team activity** — moved to Activity tab (not competing with pipeline)
8. **Documents and interviews** — accessible via More tab (not cluttering the main view)

## Files Summary

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/components/job-dashboard/JobDashboardHeader.tsx` | Compact header |
| Create | `src/components/job-dashboard/JobDashboardStatsBar.tsx` | Horizontal stats strip |
| Create | `src/components/job-dashboard/PipelineKanbanBoard.tsx` | Full-width Kanban |
| Create | `src/components/job-dashboard/PipelineKanbanColumn.tsx` | Stage column |
| Create | `src/components/job-dashboard/PipelineKanbanCard.tsx` | Candidate card |
| Rewrite | `src/pages/JobDashboard.tsx` | ~1063 → ~350 lines |
| Update | `src/components/job-dashboard/index.ts` | Update exports |
| Delete | 11 components listed in Step 7 | Remove clutter |

