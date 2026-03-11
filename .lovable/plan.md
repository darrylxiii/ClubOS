

# Employee Dashboard — Full Audit

## Score: 30/100

The existing "employee" intelligence tabs (Admins, Strategists, Recruiters) are near-identical copy-paste components showing only 4 shallow metrics: online status, total actions, activity level, and last activity. They ignore the rich data already in the database. The `UserDetailModal` similarly shows only surface-level stats. None of them answer the questions you care about: candidates added, login count, time online, placements, or productivity.

---

## Bug-by-Bug Breakdown

### 1. Three role tabs are copy-paste with zero role-specific metrics (Critical)
`AdminIntelligenceTab`, `StrategistIntelligenceTab`, and `RecruiterIntelligenceTab` are ~220 lines each with identical logic — only the role string and icon differ. None of them show:
- **Login count** (`session_count` exists in `user_activity_tracking` but is never displayed)
- **Total time online** (`total_session_duration_minutes` exists but is never displayed)
- **Last login** (`last_login_at` exists but is never displayed)
- **Candidates added** (available in `recruiter_activity_metrics.candidates_added` and countable from `applications.sourced_by`)
- **Candidates placed** (available in `recruiter_activity_metrics.candidates_placed` and `placement_fees`)
- **Placement revenue** (available in `recruiter_activity_metrics.placement_revenue` and `placement_fees.fee_amount`)

### 2. `UserDetailModal` missing critical KPIs (Major)
The modal shows total actions, activity score, session count, and last active. It's missing:
- Login count and login history
- Total time online (formatted as hours/days)
- Candidates sourced by this user
- Placements made
- Revenue generated
- `recruiter_activity_metrics` data (calls, emails, interviews, etc.)

### 3. `ActivityMonitoringDashboard` shows `total_actions` but hides session/login data (Major)
Lines 219-226 pull `session_count`, `total_session_duration_minutes`, `last_login_at` from `user_activity_tracking` but only show them in a tooltip on hover. These are primary KPIs that should be visible columns.

### 4. Hardcoded engagement score (Bug)
`UserActivityDashboard` line 74: `avgEngagementScore: 72` is hardcoded. The comment says "Calculated via function" but no function is called.

### 5. No `useQuery` in `ActivityMonitoringDashboard` (Architecture violation)
Uses raw `useEffect` + `useState` instead of `useQuery`, violating the project's data fetching standards. This means no caching, no deduplication, and no stale-time optimization.

### 6. All three role tabs are 95% duplicate code (DRY violation)
The only differences between `AdminIntelligenceTab`, `StrategistIntelligenceTab`, and `RecruiterIntelligenceTab` are the role string and one icon.

---

## Implementation Plan

### Approach

Replace the three copy-paste role tabs with one unified component that accepts a role prop and shows **real KPIs** from the data already in the database. Upgrade the `UserDetailModal` with a comprehensive stats view. No database changes needed — all the data already exists.

### Files

| File | Action |
|------|--------|
| `src/components/admin/activity/RoleIntelligenceTab.tsx` | **New** — Unified component replacing all 3 role tabs. Accepts `role` prop. Shows: online status, login count, session count, total time online (formatted as Xh Ym), candidates sourced (from `applications.sourced_by`), placements (from `placement_fees`), revenue generated, last login, activity level. Fetches `user_activity_tracking` + `recruiter_activity_metrics` + `applications` count + `placement_fees` sum per user. |
| `src/components/admin/activity/UserDetailModal.tsx` | **Edit** — Add tabs for: (a) KPI metrics — login count, total online hours, candidates sourced, placements, revenue; (b) Recruiter activity — from `recruiter_activity_metrics` (calls, emails, interviews, outreach); (c) keep existing events tab. Format `total_session_duration_minutes` as readable hours. |
| `src/components/admin/activity/AdminIntelligenceTab.tsx` | **Edit** — Replace body with `<RoleIntelligenceTab role="admin" />` |
| `src/components/admin/activity/StrategistIntelligenceTab.tsx` | **Edit** — Replace body with `<RoleIntelligenceTab role="strategist" />` |
| `src/components/admin/activity/RecruiterIntelligenceTab.tsx` | **Edit** — Replace body with `<RoleIntelligenceTab role="recruiter" />` |

### `RoleIntelligenceTab` Design

```text
Props: { role: 'admin' | 'strategist' | 'recruiter' }

Query 1: user_roles WHERE role = {role} → get user IDs
Query 2: profiles WHERE id IN (user IDs)
Query 3: user_activity_tracking WHERE user_id IN (user IDs)
Query 4: applications COUNT grouped by sourced_by WHERE sourced_by IN (user IDs)
Query 5: placement_fees SUM(fee_amount) + COUNT grouped by sourced_by WHERE sourced_by IN (user IDs) AND status != 'cancelled'

All 5 queries run in parallel via Promise.all.

Summary cards:
- Total {Role}s | Online Now | Total Logins | Total Hours Online | Candidates Sourced | Placements

Per-user row shows:
- Avatar + name + email
- Online status dot
- Login count
- Time online (formatted)
- Candidates sourced
- Placements
- Revenue
- Last login
- Activity badge
```

### `UserDetailModal` Enhancements

Add a "Performance" tab with:
- Total logins (`session_count`)
- Total time online (formatted from `total_session_duration_minutes`)
- Candidates sourced (`applications` count where `sourced_by = user_id`)
- Placements made (`placement_fees` count)
- Revenue generated (`placement_fees` sum of `fee_amount`)
- Recruiter metrics from `recruiter_activity_metrics` (if data exists): calls, emails sent, candidates screened, outreached, interviewed

### No database changes needed.
All required data exists in `user_activity_tracking`, `applications.sourced_by`, `placement_fees`, and `recruiter_activity_metrics`.

