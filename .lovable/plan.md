
# Account Traffic Control — LinkedIn Avatar Session Management

## Overview
Build a real-time "Account Traffic Control" system inside Quantum OS that prevents double logins on shared LinkedIn avatar accounts. Team members can check out / check in accounts, see who is active on which profile, and admins get a live dashboard with risk alerts.

## Database Schema

### Table: `linkedin_avatar_accounts`
Stores all LinkedIn avatar profiles the team operates.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `label` | text | e.g. "Darryl - Growth Avatar #3" |
| `linkedin_email` | text (nullable) | Masked login identifier |
| `status` | text | `available`, `paused`, `banned`, `needs_review` |
| `owner_team` | text (nullable) | Campaign/team grouping |
| `risk_level` | text | `low`, `medium`, `high` |
| `max_daily_minutes` | integer | Default 360 (6h) |
| `notes` | text (nullable) | Positioning, niche, tone |
| `playbook` | text (nullable) | Operating guidelines (max connections/day, tools allowed, activity windows) |
| `created_by` | uuid (FK profiles) | Admin who added it |
| `created_at` / `updated_at` | timestamptz | |

### Table: `linkedin_avatar_sessions`
Tracks who is using which account and when.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `account_id` | uuid (FK linkedin_avatar_accounts) | |
| `user_id` | uuid (FK profiles) | Who checked it out |
| `started_at` | timestamptz | |
| `expected_end_at` | timestamptz | When they plan to stop |
| `ended_at` | timestamptz (nullable) | Null = still active |
| `status` | text | `active`, `completed`, `timeout`, `force_closed` |
| `purpose` | text | "DM outreach NL founders" |
| `created_at` | timestamptz | |

- **Unique constraint**: Only one `active` session per `account_id` at a time (partial unique index on `account_id WHERE status = 'active'`).

### Table: `linkedin_avatar_events`
Audit log for compliance and incident investigation.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `account_id` | uuid (FK) | |
| `user_id` | uuid (FK, nullable) | |
| `event_type` | text | `session_started`, `session_ended`, `session_timeout`, `conflict_blocked`, `risk_flagged`, `account_paused` |
| `metadata` | jsonb | Extra context |
| `created_at` | timestamptz | |

### Database Triggers and Functions

1. **Conflict prevention trigger** (`BEFORE INSERT` on `linkedin_avatar_sessions`): Rejects insert if an active session already exists for that `account_id`. Returns clear error message with who holds the lock.

2. **Auto-timeout function** (called via pg_cron or Edge Function cron): Marks sessions as `timeout` when `expected_end_at + 10 minutes grace` has passed without manual end.

3. **Daily budget check**: Before allowing a new session, sum today's session durations for that account. If exceeding `max_daily_minutes`, reject and set account status to `paused`.

4. **Realtime**: Enable `supabase_realtime` on `linkedin_avatar_sessions` so the UI updates live across all team members.

### RLS Policies
- **Admin**: Full CRUD on all tables.
- **Strategist**: Can view all accounts, start/end their own sessions.
- **Other roles**: Read-only on accounts (to see availability), no session creation.

## Frontend Components

### 1. New Page: `/admin/avatar-control`
Added as a new route in `admin.routes.tsx` and linked from the Admin panel.

**Page: `src/pages/admin/AvatarControlHub.tsx`**

### 2. Account Grid (`AvatarAccountGrid.tsx`)
Card-based grid showing all LinkedIn accounts.
- Each card shows: label, status badge (green/red/amber), current user avatar + name, "until HH:MM", purpose, risk badge.
- Filter chips: "Available", "In Use", "Paused", "My Team".
- Click on available card opens the **Start Session** modal.

### 3. Start Session Modal (`StartSessionModal.tsx`)
- Duration selector: 15m / 30m / 1h / 2h / custom end-time.
- Purpose field (required).
- On submit: inserts into `linkedin_avatar_sessions`. If conflict trigger fires, shows toast: "Currently used by [Name] until [Time]."

### 4. Active Session Banner (`ActiveSessionBanner.tsx`)
Persistent banner at the top of the OS when the current user has an active session:
- "You are using: [Account Label] until [Time] — [End Session] [Extend 30m]"
- Rendered inside the main layout, visible on every page.

### 5. Session History Timeline (`AvatarSessionTimeline.tsx`)
Per-account expandable timeline showing past sessions: who, when, how long, purpose. For admin investigation.

### 6. Reservation / Queue System (`AvatarReservationSlots.tsx`)
Mini day-view calendar per account. Users can reserve a future slot (e.g. 16:00-17:00). Visual blocks similar to a calendar.

### 7. Admin Dashboard Widget
On the main Admin page, add a compact "Avatar Status" card showing:
- X accounts in use / Y total
- Any accounts at risk
- Quick link to `/admin/avatar-control`

## Smart Safety Features

### Automatic Timeout (Edge Function Cron)
An Edge Function (`avatar-session-timeout`) runs every 5 minutes:
- Finds sessions where `status = 'active'` AND `expected_end_at < now() - interval '10 minutes'`.
- Sets `status = 'timeout'`, `ended_at = expected_end_at + 10m`.
- Logs event to `linkedin_avatar_events`.
- Sets account status back to `available`.

### Daily Budget Enforcement
- Before a session starts, compute `SUM(duration)` of today's completed sessions for that account.
- If total + requested duration > `max_daily_minutes`, block with message: "This account has been used for X hours today. Resting for safety."
- Automatically set account `status = 'paused'` and log event.

### Risk Flagging
- If a single account hits timeout 3+ times in a week, auto-set `risk_level = 'high'`.
- If total daily usage exceeds budget on 2+ consecutive days, flag for admin review.

## File Structure

```text
src/pages/admin/AvatarControlHub.tsx           -- Main page
src/components/avatar-control/
  AvatarAccountGrid.tsx                         -- Card grid of all accounts
  AvatarAccountCard.tsx                         -- Individual account card
  StartSessionModal.tsx                         -- Check-out modal
  ActiveSessionBanner.tsx                       -- Persistent banner
  AvatarSessionTimeline.tsx                     -- Per-account history
  AvatarReservationSlots.tsx                    -- Future slot reservations
  AvatarAdminWidget.tsx                         -- Compact widget for admin home
  AvatarAccountForm.tsx                         -- Add/edit account form
src/hooks/
  useAvatarAccounts.ts                          -- CRUD + realtime for accounts
  useAvatarSessions.ts                          -- Session management + conflict check
  useActiveAvatarSession.ts                     -- Current user's active session
supabase/functions/avatar-session-timeout/      -- Cron for auto-timeout
src/routes/admin.routes.tsx                     -- Add route
src/pages/Admin.tsx                             -- Add tab/link
```

## Implementation Sequence

1. **Database migration**: Create tables, indexes, triggers, RLS policies, enable realtime.
2. **Hooks**: `useAvatarAccounts`, `useAvatarSessions`, `useActiveAvatarSession` with realtime subscriptions.
3. **Core UI**: `AvatarControlHub` page, `AvatarAccountGrid`, `AvatarAccountCard`, `StartSessionModal`.
4. **Active session banner**: `ActiveSessionBanner` integrated into main layout.
5. **Session timeline + reservation slots**.
6. **Edge Function**: `avatar-session-timeout` cron job.
7. **Admin widget + routing**: Wire into admin routes and admin dashboard.
8. **Risk flagging logic**: Automated risk level updates based on usage patterns.
