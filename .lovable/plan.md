
# Phase 3: Jobs Page to 100/100 - Final Push

## Current State: 92/100

Phase 1 and 2 are complete:
- Bulk Actions with Multi-Select
- Real-time Updates via Supabase
- Keyboard Navigation (J/K, shortcuts dialog)
- View Mode Switcher (Grid/List/Kanban/Table)
- Virtualized List for performance
- Filter persistence (localStorage + URL sync)

---

## What's Missing for 100/100

### 1. Inline Micro-Charts (Sparklines) — +2 points
**Current:** Job cards show static candidate count
**Target:** Show 7-day application trend sparkline

Create `JobSparkline.tsx`:
- Tiny inline chart (64x20px) showing last 7 days of applications
- Uses existing DynamicChart pattern but minimal config
- Data fetched per-job lazily (on-demand)

Wire into `JobCardMetrics.tsx`:
- Add sparkline next to Candidates metric
- Tooltip shows "7-day trend"

---

### 2. AI Hiring Recommendations Widget — +3 points
**Current:** No AI insights on jobs list page
**Target:** Collapsible widget showing QUIN recommendations

Create `JobsAIInsightsWidget.tsx`:
- Uses existing `useAggregatedHiringIntelligence` hook
- Displays:
  - Overall hiring health score (0-100)
  - Top strategic recommendations (priority: critical/high/medium)
  - Cross-pipeline patterns (bottlenecks, concerns)
  - 30/60/90 day forecast
- Collapsible design to save space
- "Powered by QUIN" branding

Add to `PartnerJobsHome.tsx`:
- Position above the job grid (below analytics widget)
- Only visible to admin users
- Lazy-loaded to avoid initial bundle impact

---

### 3. Enhanced Job Card — +2 points
**Current:** UrgencyBadge exists but missing interview count, next best action
**Target:** Add scheduled interviews this week + AI-suggested next action

Modify `JobCardMetrics.tsx`:
- Add "Interviews This Week" metric card
- Fetch interview count from meetings table

Create `JobNextAction.tsx`:
- AI-generated "next best action" prompt
- E.g., "3 candidates awaiting feedback" or "Consider promoting - low applicants"
- Uses job metrics to generate locally (no API call)

---

### 4. Saved Filter Presets — +1 point
**Current:** Filters persist to localStorage but no named presets
**Target:** Save/load named filter configurations

Create `SavedFilterPresets.tsx`:
- Dropdown showing saved presets
- "Save Current View" button
- Delete preset functionality
- Max 10 presets per user

Create `useSavedFilterPresets.ts` hook:
- CRUD operations on localStorage
- Structure: `{ name: string, filters: JobFilterState }[]`

Add to filter bar in `PartnerJobsHome.tsx`:
- Small "Presets" dropdown next to search

---

### 5. Table Column Customization — +1 point (bonus polish)
**Current:** Table view has fixed columns
**Target:** Show/hide columns via settings dropdown

Modify `JobTableView.tsx`:
- Add column visibility state
- Settings dropdown in header with checkboxes
- Persist to localStorage
- Default visible: Title, Status, Candidates, Days, Conversion
- Optional: Location, Progress, Created

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/partner/job-card/JobSparkline.tsx` | 7-day mini chart |
| `src/components/partner/JobsAIInsightsWidget.tsx` | AI recommendations widget |
| `src/components/partner/job-card/JobNextAction.tsx` | AI-suggested next action |
| `src/components/partner/SavedFilterPresets.tsx` | Save/load filter configs |
| `src/hooks/useSavedFilterPresets.ts` | Saved presets CRUD |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/partner/job-card/JobCardMetrics.tsx` | Add sparkline, interviews count |
| `src/components/partner/PartnerJobsHome.tsx` | Add AI insights widget, presets dropdown |
| `src/components/partner/JobTableView.tsx` | Column customization |

---

## Technical Details

### JobSparkline Implementation
```text
Component Structure:
├── Uses DynamicChart with type="line" 
├── Height: 20px, Width: 64px
├── No axis, no labels, just the line
├── Color: primary for positive trend, muted for flat
├── Data: last 7 days application counts (mocked initially)
└── Tooltip on hover shows exact values
```

### AI Insights Widget Structure
```text
JobsAIInsightsWidget:
├── Collapsible Card (default collapsed on mobile)
├── Header: "QUIN Insights" with Brain icon
├── Content:
│   ├── Health Score: circular progress (0-100)
│   ├── Key Recommendations: max 3 cards
│   ├── Forecast: 30/60/90 day hires prediction
│   └── Patterns: comma-separated concern areas
└── Footer: "Powered by QUIN" + refresh button
```

### Saved Presets Data Structure
```text
localStorage key: 'job_filter_presets_v1'
Value: [
  {
    id: string (uuid),
    name: string,
    createdAt: ISO string,
    filters: JobFilterState
  }
]
Max items: 10
```

### Next Action Logic (Local Rules)
```text
Priority order:
1. candidates_awaiting_feedback > 0 → "X candidates awaiting feedback"
2. days_since_opened > 45 && candidate_count < 5 → "Role needs promotion"
3. last_activity_days > 7 → "Pipeline stalled - check in"
4. conversion_rate > 20% → "High performing role"
5. Default: null (no action shown)
```

---

## Scoring Breakdown

| Feature | Points | Status |
|---------|--------|--------|
| Sparklines | +2 | To implement |
| AI Insights Widget | +3 | To implement |
| Enhanced Job Card (interviews + next action) | +2 | To implement |
| Saved Filter Presets | +1 | To implement |
| **Total to add** | **+8** | — |
| **Current** | **92** | — |
| **Target** | **100** | — |

---

## Implementation Priority

1. **AI Insights Widget** (highest value, leverages existing hook)
2. **Enhanced Job Card** (interviews + next action)
3. **Sparklines** (visual polish, uses DynamicChart)
4. **Saved Presets** (quality of life improvement)
5. **Table Column Customization** (bonus polish)

---

## Why This Beats Competitors

After implementing all features:

| Feature | TQC | Greenhouse | Lever | Ashby |
|---------|-----|------------|-------|-------|
| AI Recommendations | Full QUIN integration | Basic | None | Partial |
| Real-time Updates | Yes | Partial | Yes | Yes |
| Keyboard Navigation | Full vim-style | Basic | Basic | Good |
| Trend Sparklines | Yes | No | Yes | Yes |
| Saved Views | Yes | Yes | Yes | Yes |
| Bulk Actions | Full | Full | Full | Full |
| Column Customization | Yes | Yes | Yes | Yes |

**TQC differentiator:** QUIN-powered next best actions inline on every job card - no competitor has this level of AI integration at the list level.
