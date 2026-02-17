

# Live Presence and Avatar Activity Widget for Admin Home

## What will be built

A new **"Live Operations"** widget on the Admin Home that combines two real-time feeds into one unified view:

1. **Team Members Online** -- who on your team is active in the platform right now (from `user_presence`)
2. **Avatar Accounts In Use** -- which LinkedIn avatar accounts currently have active sessions, who is operating them, and on which job (from `linkedin_avatar_sessions`)

This gives admins instant situational awareness: who can I reach, and what accounts are being worked right now.

---

## Widget Design

The widget uses the existing `DashboardWidget` shell (glass card with title/icon) and contains two stacked sections:

### Section 1: "Team Online" (top)
- Row of avatar circles with green/amber/gray dot indicators (online/away/offline)
- Only shows online + away members (offline are hidden, count shown as "+N offline")
- Hover tooltip shows full name and "last seen X min ago"
- Clicking an avatar could later link to messaging (no action for now)

### Section 2: "Accounts Active" (bottom, separated by a subtle divider)
- Each active session shown as a compact row:
  - Account avatar + label (e.g., "Sarah Mitchell")
  - Operator name (who started the session)
  - Job title being worked
  - Duration running (live counter, e.g., "1h 23m")
  - A small risk-level dot (green/amber/red based on account `risk_level`)
- If no active sessions: "No accounts in use" empty state
- Realtime subscription on `linkedin_avatar_sessions` to auto-update

### Header
- Title: "Live Operations"
- Icon: `Radio` (matches nav)
- Badge in header: total count of online members + active accounts (e.g., "5 online")

---

## Placement on Admin Home

Insert into **Zone 3** (Operations Grid) as a 4th widget, making it a 2-column layout on desktop instead of 3, or better: replace the current 3-column Zone 3 with a 2+2 layout:

```
Row 1: TeamCapacity | PartnerEngagement
Row 2: ActiveMeetings | LiveOperations (NEW)
```

This keeps the grid balanced.

---

## Technical Implementation

### New file: `src/components/clubhome/LiveOperationsWidget.tsx`

- Uses `DashboardWidget` wrapper
- Calls a new hook `useLiveOperations()` that combines:
  - `user_presence` joined with `profiles` (online/away members)
  - `linkedin_avatar_sessions` where `status = 'active'`, joined with `profiles`, `linkedin_avatar_accounts`, and `jobs`
- Realtime subscriptions on both `user_presence` and `linkedin_avatar_sessions` tables
- Live duration timer using `useState` + `setInterval` every 60s

### New file: `src/hooks/useLiveOperations.ts`

- Fetches online team members (reuses the proven logic from `useLiveHubPresence` -- 5min = online, 15min = away)
- Fetches active avatar sessions with account label, operator name, job title
- Sets up realtime channels for both tables
- Returns `{ onlineMembers, activeSessions, isLoading }`

### Modified file: `src/components/clubhome/AdminHome.tsx`

- Import `LiveOperationsWidget`
- Add it to Zone 3 grid, change columns from 3 to 2 on that row, and split into two `DashboardSection` rows of 2

---

## Elevating to 0.1% -- Additional Enhancements

### Within this widget:
- **Typing/activity indicator**: Show a subtle pulse animation on members who were active in the last 60 seconds vs just "online"
- **Session health dot**: Green if session is within expected time, amber if approaching end time, red if past expected end time (possibly abandoned)
- **Quick action**: "Message" button next to online team members (links to internal messaging if available)

### Future additions (not in this build, but designed for):
- **Page presence**: Show which admin page each online member is viewing (using existing `page_presence` table)
- **Account queue**: Show upcoming scheduled sessions (accounts reserved for later today)
- **Daily ops summary line**: "Today: 12 sessions across 6 accounts, 4 jobs" as a footer stat

---

## Files Summary

| File | Action |
|---|---|
| `src/hooks/useLiveOperations.ts` | Create -- combined presence + active sessions hook |
| `src/components/clubhome/LiveOperationsWidget.tsx` | Create -- the widget component |
| `src/components/clubhome/AdminHome.tsx` | Edit -- add widget to Zone 3 grid layout |

No database changes needed -- all data already exists in `user_presence` and `linkedin_avatar_sessions`.

