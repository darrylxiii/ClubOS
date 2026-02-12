

# Feature Control Center — Platform Module Toggle Page

## What This Does

A new admin page at `/admin/feature-control` that lets you toggle entire website modules on and off (Radio, DJ Mixer, Meetings, CRM, Analytics dashboards, etc.) without deleting any code. Similar to how the Edge Function Command Center controls backend functions, this controls frontend features.

The existing Feature Flags in GodMode are too low-level (6 flags, code-level keys like `ghost_mode_enabled`). This page operates at the **module level** — entire sections of the platform with descriptions, categories, cost/polling impact indicators, and bulk actions.

---

## How It Works

The page reads from the existing `feature_flags` table but introduces a new set of module-level flags. Each module flag controls route access and sidebar visibility. When a module is disabled:

1. Its sidebar/navigation link disappears
2. Its route redirects to `/home` with a "Feature disabled" toast
3. Its polling queries stop firing (saving DB queries)
4. Its edge function calls are skipped

---

## Module Registry (what can be toggled)

Organized by category:

| Category | Module | Flag Key | Polling Impact | Notes |
|---|---|---|---|---|
| **Entertainment** | Club DJ / Mixer | `module_club_dj` | 60s poll | Music mixing features |
| | Radio / Playlists | `module_radio` | 3-30s polls | Heaviest poller on the platform |
| **Communication** | WhatsApp Integration | `module_whatsapp` | 30-60s polls | WhatsApp messaging hub |
| | CRM / Outreach | `module_crm` | Multiple 30-60s polls | Prospect pipeline, campaigns |
| **Meetings** | Video Meetings | `module_meetings` | 60s polls | LiveKit rooms, scheduling |
| | Meeting Intelligence | `module_meeting_intelligence` | 60s poll | AI transcription, insights |
| **Analytics** | Hiring Intelligence | `module_hiring_intelligence` | 60s poll | AI-powered hiring analytics |
| | Career Insights | `module_career_insights` | 60s poll | Candidate-facing analytics |
| | Revenue Analytics | `module_revenue_analytics` | 300s poll | Revenue dashboards |
| **Admin Tools** | Investor Dashboard | `module_investor_dashboard` | 300s poll | Investor metrics |
| | Enterprise Dashboard | `module_enterprise_dashboard` | 300s poll | Enterprise management |
| | Risk Management | `module_risk_management` | 300s poll | Risk dashboards |
| | Marketplace Analytics | `module_marketplace` | 300s poll | Marketplace tracking |
| **Engagement** | Achievements / Gamification | `module_achievements` | 60s poll | Badges, leaderboards |
| | Referral Program | `module_referrals` | 300s poll | Referral tracking |

---

## Page Design

### Header
- Title: "Feature Control Center"
- Subtitle: "Toggle platform modules on and off. Disabled modules hide from navigation and stop background queries."
- Summary cards: Active Modules count, Disabled Modules count, Estimated Polling Savings

### Filter Bar
- Category filter chips (Entertainment, Communication, Meetings, Analytics, Admin, Engagement)
- Search by module name
- "Show disabled only" toggle

### Module Cards (main content)
Each card shows:
- Module name and description
- Category badge
- Polling impact indicator (queries saved per hour when disabled)
- Toggle switch (on/off)
- Last toggled timestamp
- Affected routes list (collapsed by default)

### Bulk Actions
- "Disable all Entertainment" / "Disable all Analytics" category toggles
- "Disable all non-essential" one-click (keeps core: Jobs, Candidates, Applications, Profile)

---

## Technical Implementation

### Database
- Insert ~15 new rows into `feature_flags` table for module-level flags
- Add `category` and `module_config` fields to `feature_flags.metadata` JSONB (no schema change needed)
- Each flag's metadata stores: `{ category, affected_routes, polling_queries_per_hour, description_long }`

### New Files

| File | Purpose |
|---|---|
| `src/pages/admin/FeatureControlCenter.tsx` | Main page with category filters, search, module cards |
| `src/components/admin/feature-control/ModuleCard.tsx` | Individual module toggle card with impact info |
| `src/components/admin/feature-control/ModuleSummaryCards.tsx` | Top-level active/disabled/savings summary |
| `src/components/admin/feature-control/CategoryFilter.tsx` | Category chip filter bar |
| `src/hooks/useModuleFlags.ts` | Hook to fetch module flags and check if a module is enabled |

### Modified Files

| File | Change |
|---|---|
| `src/routes/admin.routes.tsx` | Add route for `/admin/feature-control` |
| `src/routes/shared.routes.tsx` | Wrap Radio/DJ routes with module gate check |
| `src/routes/meetings.routes.tsx` | Wrap meeting routes with module gate check |
| `src/routes/crm.routes.tsx` | Wrap CRM routes with module gate check |
| `src/routes/analytics.routes.tsx` | Wrap analytics routes with module gate check |
| Sidebar/navigation component | Hide links for disabled modules |

### Route Gating Pattern

A lightweight `ModuleGate` wrapper component:
- Checks if the module flag is enabled via `useModuleFlags`
- If disabled: redirects to `/home` with toast "This module is currently disabled"
- If enabled: renders children normally
- Uses the existing `is_feature_enabled` RPC for efficient server-side checks

### Polling Guard Pattern

For the biggest cost savings, the `useModuleFlags` hook exposes an `isModuleEnabled(key)` function. Polling hooks check this before setting `refetchInterval`:
- `refetchInterval: isModuleEnabled('module_radio') ? 30000 : false`
- This means disabled modules produce zero background DB queries

---

## Admin Route Registration

The page registers at `/admin/feature-control` alongside the existing Edge Function Command Center, creating a natural pair:
- Edge Function Command Center = backend function control
- Feature Control Center = frontend module control

