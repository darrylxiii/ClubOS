
# Quick Actions Button & Content Revamp

## Problem
1. **Buttons too dark**: Admin Quick Management and Partner Quick Actions use `variant="glass"` buttons (`bg-card/30 + border-border/40 + shadow-glass-md`) sitting inside `glass-subtle` containers (`bg-card/50`). The stacked opacity creates visually heavy, dark buttons that clash with the lighter glass aesthetic of surrounding widgets.
2. **Dull actions**: The current Quick Management links (Manage Users, Manage Companies, Security Settings, View System Logs, KPI Command Center) are generic navigation items -- they feel like a sidebar menu copy-pasted into a card rather than high-impact executive shortcuts.

## Fix 1: Lighter Button Styling

Change all Quick Action buttons from `variant="glass"` to `variant="ghost"` across Admin and Partner home pages. The `ghost` variant (`hover:bg-card/20, text-muted-foreground`) is nearly transparent at rest and only shows a subtle hover state -- matching the "floating on glass" aesthetic.

Also change the one `variant="outline"` button in PartnerHome (Messages) to `ghost` for consistency.

**Files**: `AdminHome.tsx` (5 buttons), `PartnerHome.tsx` (4 buttons)

## Fix 2: Admin Quick Management -- Better Actions

Replace the current generic nav links with higher-impact executive actions:

| Current (dull) | New (actionable) | Icon | Route |
|---|---|---|---|
| Manage Users & Roles | Invite New Member | UserPlus | /admin?tab=users |
| Manage Companies | Onboard Partner | Building2 | /admin?tab=companies |
| Security Settings | Review Flagged Items | AlertTriangle | /admin/anti-hacking |
| View System Logs | Approve Pending Jobs | CheckCircle | /jobs?status=pending |
| KPI Command Center | View KPI Dashboard | BarChart3 | /admin/kpi-command-center |

These feel like actions an admin would take right now rather than places to navigate.

**File**: `AdminHome.tsx`

## Fix 3: Partner Quick Actions -- Better Actions

| Current (dull) | New (actionable) | Icon | Route |
|---|---|---|---|
| Post New Job | Create New Role | Plus | /company-jobs/new |
| Review Applications | Review Shortlist | Users | /company-applications |
| Update Company Profile | Schedule Interview | Calendar | /meetings |
| Message Candidates | Message Candidates | MessageSquare | /messages |

**File**: `PartnerHome.tsx`

## Fix 4: Candidate Quick Actions -- Consistent Ghost Styling

The `CandidateQuickActions` buttons currently use `variant={action.variant}` which alternates between `"default"` and `"outline"`. Standardize all to use the `ghost` variant with `glass-subtle border-0` so they match Admin/Partner.

**File**: `CandidateQuickActions.tsx`

## Summary

| File | Changes |
|---|---|
| `src/components/clubhome/AdminHome.tsx` | 5 buttons: `variant="glass"` to `variant="ghost"`, update labels/icons/routes |
| `src/components/clubhome/PartnerHome.tsx` | 4 buttons: `variant="glass"`/`"outline"` to `variant="ghost"`, update labels/icons/routes |
| `src/components/candidate/CandidateQuickActions.tsx` | Standardize all button variants to `ghost` |

Total: 3 files, ~30 lines changed. Zero new dependencies.
