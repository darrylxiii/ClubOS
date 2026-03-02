

# Connection Request Quota Tracking for Avatar Accounts

## LinkedIn Limits (Research)

- **Weekly limit**: 100 connection requests per week for standard accounts, up to 200 for Premium/high-SSI accounts
- **Reset mechanism**: Rolling 7-day window (not a fixed day). Each request "expires" from the count after 7 days
- **Safe daily cadence**: 15-25 per day to avoid triggering LinkedIn's anti-automation flags

Since tracking individual request timestamps for a true rolling window would be complex, the practical approach is a **weekly counter that resets every Monday at 00:00 UTC** (the most common operational cycle). This gives your team a clear, predictable reset rhythm and matches LinkedIn's approximate weekly enforcement.

## What Gets Built

### 1. Database: 3 new columns on `linkedin_avatar_accounts`

| Column | Type | Default | Purpose |
|---|---|---|---|
| `weekly_connection_limit` | integer | 100 | Max requests this account can send per week (configurable per account -- set higher for Premium) |
| `weekly_connections_sent` | integer | 0 | Requests sent this week |
| `weekly_connections_reset_at` | timestamptz | now() | When the counter was last reset (next reset = this + 7 days) |

A **database cron job** (pg_cron) resets `weekly_connections_sent` to 0 and updates `weekly_connections_reset_at` every Monday at 00:00 UTC.

### 2. Account Card: Connection Quota Indicator

Each `AvatarAccountCard` gets a compact quota bar between the stats row and the risk badges:

```text
[===========--------] 67/100 invites left
```

- Green when > 50% remaining
- Amber when 25-50% remaining
- Red when < 25% remaining
- Shows "Depleted" badge when 0 remaining

### 3. View Profile Dialog: Full Quota Section

New section in `ViewAvatarProfileDialog` between Stats and About:

```text
CONNECTION REQUESTS
[==================--] 67 / 100 remaining
Resets Monday, 3 Mar 2026 at 00:00
Daily safe limit: ~15/day
```

Plus a button to manually log sent requests (+1, +5, +10 quick actions) for team members operating the account.

### 4. Edit Dialog: Quota Configuration

New field in `EditAvatarAccountDialog`:
- "Weekly Connection Limit" number input (default 100, set to 200 for Premium accounts)
- "Connections Sent This Week" number input (manually adjustable, for corrections)
- "Reset Counter" button to zero-out the counter immediately

### 5. Grid Filter: New "Depleted" filter option

Add a 6th filter pill: **Depleted** -- shows accounts where `weekly_connections_sent >= weekly_connection_limit`

### 6. Hook Update

Add `weekly_connection_limit`, `weekly_connections_sent`, and `weekly_connections_reset_at` to the `AvatarAccount` interface in `useAvatarAccounts.ts`. Add a `logConnectionsSent` mutation that increments the counter.

## File Changes

| File | Action | What Changes |
|---|---|---|
| DB migration | Create | Add 3 columns + pg_cron reset job |
| `useAvatarAccounts.ts` | Edit | Add 3 fields to interface + `logConnectionsSent` mutation |
| `AvatarAccountCard.tsx` | Edit | Add quota progress bar |
| `ViewAvatarProfileDialog.tsx` | Edit | Add quota section with manual logging buttons |
| `EditAvatarAccountDialog.tsx` | Edit | Add limit config + reset button |
| `AvatarAccountGrid.tsx` | Edit | Add "Depleted" filter pill |

## Cron Reset Logic

Runs every Monday at 00:00 UTC via pg_cron:

```sql
UPDATE linkedin_avatar_accounts
SET weekly_connections_sent = 0,
    weekly_connections_reset_at = now()
WHERE weekly_connections_sent > 0;
```

This keeps it simple and predictable. If finer-grained rolling-window tracking is needed later, we can add a `connection_request_log` table with per-request timestamps.

