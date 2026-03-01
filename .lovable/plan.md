

# CEO Command Center -- AdminHome Redesign

## Vision

Transform the admin dashboard from a "collection of widgets" into a **CEO War Room** -- a single screen that answers the five questions every founder asks every morning:

1. **How much money are we making?** (Revenue, pipeline, burn)
2. **Are we winning or losing?** (KPIs, conversion, velocity)
3. **What needs my attention right now?** (Alerts, blockers, approvals)
4. **How is my team performing?** (Capacity, SLA compliance, output)
5. **What should I do next?** (AI-recommended actions, scheduled meetings)

---

## Current State Assessment

The existing AdminHome has 11 widgets in a single vertical scroll. Issues:

- **No hierarchy** -- Revenue, AI chat, meetings, and agent activity are all given equal visual weight
- **No "at a glance" numbers** -- A CEO landing here cannot get the state of the business in 3 seconds
- **Missing investor-grade metrics** -- No ARR, no MRR, no Rule of 40, no burn rate visible
- **No quick-launch panel** -- 40+ admin routes exist but no fast way to reach critical ones
- **ClubAI chat takes Zone 0.5** -- A chat widget should not be the second thing the CEO sees; it should be a floating assistant
- **Predictive Signals are horizontally scrolling cards** -- Easy to miss; should be condensed into urgent-badge format
- **No "health score"** -- No single number that says "the business is healthy/not"

---

## Redesigned Layout (Top to Bottom)

### Zone 0: CEO Header Bar
Replace the generic `ClubHomeHeader` greeting with a **power header**:
- Left: "Good morning, [First Name]" (compact, one line)
- Center: **Business Health Score** (0-100, color-coded ring/arc) calculated from KPI pillars
- Right: Quick-action icon buttons: Refresh KPIs, Open Finance, Open Analytics, Notifications

### Zone 1: Revenue Ticker Strip
A horizontal strip of 5-6 **hero numbers** -- the metrics a CEO checks first:
- **MRR** (Monthly Recurring Revenue / annualized placement revenue)
- **Pipeline Value** (weighted)
- **Placements This Month** vs target
- **Active Jobs**
- **Avg Days to Hire**
- **NPS Score**

Each with a delta badge (vs previous period). Clicking any number deep-links to the relevant dashboard. This replaces the current KPIScorecard and gives instant readability.

### Zone 2: Revenue and Growth Widget (existing, refined)
Keep the current `RevenueGrowthWidget` but move it here as the first full-width card. It already has period selection, sparkline, pipeline bar, and expansion. No structural changes needed -- just ensure it sits directly below the ticker.

### Zone 3: Command Strip + Predictive Signals (merged)
Merge the current `CommandStrip` (Pending/Overdue/At Risk/Alerts) with `PredictiveSignalsStrip` into a single **Attention Required** strip:
- Left half: 4 urgency badges (existing CommandStrip items)
- Right half: Top 3 predictive signals as compact inline badges (icon + label + strength) instead of scrolling cards
- If any signal is "Strong" (>=0.8), promote it to a red/amber pulsing badge

### Zone 4: Daily Briefing (existing, repositioned)
Move `DailyBriefingBanner` here. It's dismissible and contextual -- perfect after the CEO has seen numbers and alerts.

### Zone 5: Two-Column Operations View
```text
+---------------------------+---------------------------+
|   Team Capacity (existing)|   Partner Engagement      |
|   + SLA Compliance meter  |   (existing, keep as-is)  |
+---------------------------+---------------------------+
|   Action Items (existing) |   Upcoming Meetings       |
|   (AdminTasksWidget)      |   (ActiveMeetingsWidget)  |
+---------------------------+---------------------------+
```

### Zone 6: Quick Launch Grid
A new **Quick Launch** section with 8-12 icon tiles for the most critical admin destinations:
- Finance Hub, KPI Command Center, Talent Pool, Job Approvals, Security Hub, Global Analytics, Employee Dashboard, WhatsApp Hub, System Health, Feature Control

Each tile: icon + label, 4 columns on desktop, 2 on mobile. Replaces the need to dig through the sidebar for common admin tasks.

### Zone 7: Agent Activity + Live Operations (collapsed by default)
Combine `AgentActivityWidget` and `LiveOperationsWidget` into a single expandable "Operations Monitor" card:
- Default collapsed: Shows "X agents active, Y team members online, Z pending approvals" as a one-liner
- Expanded: Shows both widgets side by side

### Removed from Main View
- **ClubAI Chat Widget**: Move to a **floating action button** (bottom-right, above MobileBottomNav) available on all pages, not just the dashboard. This frees valuable above-the-fold space.
- **NPSPulseWidget as standalone**: Absorbed into the Zone 1 ticker strip (NPS number) and accessible via KPI Command Center deep-link.

---

## Technical Implementation

### New Components

1. **`CEOHealthScore.tsx`** -- Circular arc/ring showing 0-100 score derived from KPI pillar averages (efficiency, profitability, operations, NPS). Uses existing `useAdminKPIScorecard` hook.

2. **`RevenueTickerStrip.tsx`** -- Horizontal strip of 5-6 metric pills. Pulls from existing `useRevenueAnalytics` and `useAdminKPIScorecard`. Each pill: label, value, delta badge, click handler.

3. **`AttentionRequiredStrip.tsx`** -- Merges CommandStrip + PredictiveSignals into one row. Reuses existing query logic from both hooks.

4. **`QuickLaunchGrid.tsx`** -- Static grid of Link tiles to admin routes. No data fetching, pure navigation.

5. **`OperationsMonitor.tsx`** -- Collapsible wrapper around AgentActivity + LiveOperations. Uses framer-motion for expand/collapse.

6. **`FloatingClubAI.tsx`** -- Fixed-position FAB (floating action button) that opens the existing ClubAIHomeChatWidget in a slide-up panel. Available globally via AppLayout, not just AdminHome.

### Modified Components

7. **`AdminHome.tsx`** -- Complete restructure of zone ordering (as described above).

8. **`ClubHomeHeader.tsx`** -- Add CEOHealthScore component to center, add quick-action icon buttons to right.

### Files Unchanged
- `RevenueGrowthWidget.tsx` -- no changes needed
- `TeamCapacityWidget.tsx` -- no changes needed  
- `PartnerEngagementWidget.tsx` -- no changes needed
- `AdminTasksWidget.tsx` -- no changes needed
- `ActiveMeetingsWidget.tsx` -- no changes needed
- `DailyBriefingBanner.tsx` -- no changes needed
- `DashboardWidget.tsx` -- no changes needed
- `DashboardSection.tsx` -- no changes needed

### Data Flow
- No new database tables or edge functions required
- All data already available via existing hooks: `useAdminKPIScorecard`, `useRevenueAnalytics`, `usePredictiveSignals`, `useStrategistWorkload`, `usePartnerEngagement`
- `CEOHealthScore` derives from `useAdminKPIScorecard` data (average of pillar scores)
- `RevenueTickerStrip` derives from `useRevenueAnalytics` + `useAdminKPIScorecard`

---

## Design Specifications

- **Health Score Ring**: 120px diameter, stroke-dasharray animation, color: green (>=70), amber (40-69), red (<40)
- **Ticker Strip**: Horizontal scroll on mobile, flex-wrap on desktop. Each pill: `rounded-xl bg-card/80 border border-border/20 px-4 py-3`
- **Quick Launch tiles**: `rounded-xl bg-card/60 hover:bg-card/80 border border-border/20 p-4`, icon 24px, label 11px
- **Floating AI button**: `fixed bottom-20 right-4 md:bottom-6 z-50`, 56px circle, primary gradient, Sparkles icon
- **All animations**: 200-300ms, ease-out, no bounce

---

## Implementation Order

1. Create `RevenueTickerStrip` (highest CEO value -- instant numbers)
2. Create `CEOHealthScore` and update `ClubHomeHeader`
3. Create `AttentionRequiredStrip` (merge command + signals)
4. Create `QuickLaunchGrid` (fast admin navigation)
5. Create `OperationsMonitor` (collapsed agent + live ops)
6. Create `FloatingClubAI` and add to AppLayout
7. Restructure `AdminHome.tsx` with new zone ordering

