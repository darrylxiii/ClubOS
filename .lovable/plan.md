

# Admin Dashboard Overhaul — Amended

## Key Amendment

The Club AI Chat Widget (`ClubAIHomeChatWidget`) stays as an **inline widget at the top of the dashboard** for all user roles (Admin, Candidate, Partner). It will NOT be moved to a floating overlay as originally proposed.

This means the overhaul plan changes from "4 zones" to "5 zones" with Club AI as the permanent Zone 1.

---

## Updated Layout Structure

```text
Zone 0: Club AI Chat (inline, always first — already exists in all 3 role views)
+--------------------------------------------------+
| [Ask Club AI anything...] [Voice] [Send]         |
| Quick action chips when collapsed                 |
+--------------------------------------------------+

Zone 1: Command Strip (urgent action items)
+--------------------------------------------------+
| [Pending: 3] [Overdue: 7] [At Risk: 4] [Alerts: 0] |
+--------------------------------------------------+

Zone 2: Intelligence Row (above the fold metrics)
+------------------+-------------------+
| Revenue & Growth | Pipeline Velocity |
| (with sparkline) | (with funnel viz) |
+------------------+-------------------+

Zone 3: Operations Grid (essential detail widgets)
+----------+----------+----------+
| KPI      | Partners | Meetings |
| Health   | Health   | Today    |
+----------+----------+----------+

Zone 4: Activity Stream (bottom, collapsible)
+--------------------------------------------------+
| Recent Activity (condensed, last 10 items)        |
+--------------------------------------------------+
```

---

## What Changes from the Original Plan

| Item | Original Plan | Updated |
|---|---|---|
| ClubAIHomeChatWidget | Move to floating overlay | Keep inline at top (Zone 0) |
| Everything else | Same | Same |

---

## Implementation Details

### AdminHome.tsx Rewrite

The `ClubAIHomeChatWidget` stays as the first child, followed by the new Command Strip, Intelligence Row, Operations Grid, and Activity Stream. All the widgets marked for removal in the original plan (WhatsApp, CRM Prospects, Top Clients, Referrals, AI Analytics, Edge Function Health, Platform Growth, Quick Management) are still removed from the admin home — only the Chat stays.

### CandidateHome.tsx and PartnerHome.tsx

No changes needed — the `ClubAIHomeChatWidget` is already rendered inline at position 2 (after stats bar) in both. This overhaul only affects AdminHome.

### New Files (same as original plan)

| File | Purpose |
|---|---|
| `src/components/clubhome/CommandStrip.tsx` | Urgent actions bar with clickable counts |
| `src/components/clubhome/RevenueSparkline.tsx` | Revenue card with inline area chart |
| `src/components/clubhome/PipelineFunnel.tsx` | Visual funnel replacing text-only pipeline widgets |
| `src/components/clubhome/DashboardWidget.tsx` | Unified widget wrapper for loading/empty/error states |
| `src/hooks/useAdminDashboardData.ts` | Consolidated data fetching (2-3 RPC calls instead of 16) |

### AdminHome.tsx Final Structure

```text
ClubAIHomeChatWidget          (kept — Zone 0)
CommandStrip                  (new — replaces UnifiedStatsBar + Quick Management)
DashboardSection (2-col)      (RevenueSparkline + PipelineFunnel)
DashboardSection (3-col)      (KPISummaryWidget + PartnerEngagementWidget + ActiveMeetingsWidget)
RecentActivityFeed            (condensed, collapsible)
```

### Widgets Removed from AdminHome (not deleted, just un-rendered)
- `UnifiedStatsBar` (replaced by CommandStrip)
- Quick Management links (moved to sidebar — already accessible there)
- `PlatformGrowthCard` (key numbers merged into CommandStrip)
- `CRMProspectsWidget` (belongs on CRM page)
- `TopClientsWidget` (belongs on CRM page)
- `DealPipelineSummaryWidget` (merged into PipelineFunnel)
- `PipelineVelocityWidget` (merged into PipelineFunnel)
- `RevenueOverviewWidget` (replaced by RevenueSparkline)
- `AdminReferralWidget` (belongs on Referrals page)
- `ClubAIAnalyticsWidget` (belongs on AI Analytics page)
- `EdgeFunctionHealthWidget` (belongs on System Health page)
- `WhatsAppPreviewWidget` (belongs on Messages page)
- `UpcomingMeetingsWidget` (condensed into Operations Grid)

