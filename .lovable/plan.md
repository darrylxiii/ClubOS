

# Fix: Show Team Members in Live Operations Widget

## Problem

The "Team Online" section never appears because the `useLiveOperations` hook has a strict 15-minute `last_seen` filter. Users like Sebastiaan and Darryl have `status = 'online'` in the database but their `last_seen` timestamps are stale (hours or days old). The filter discards them, resulting in an empty list every time.

## Root Cause

The presence heartbeat (`useUserPresence`) updates `last_seen` every 30 seconds while a user is active. But if a user closes their browser without triggering the `beforeunload` event (common on mobile, crash, etc.), the `status` stays stuck at `online` with an old `last_seen`. The current logic requires both `status === 'online'` AND `last_seen` within 15 minutes -- which is too strict.

## Fix

### 1. Relax the filtering in `useLiveOperations.ts`

Change the logic so that:
- If `status === 'online'` AND `last_seen` within 5 minutes = show as **online** (green dot, pulse if < 1 min)
- If `status === 'online'` AND `last_seen` between 5-30 minutes = show as **away** (amber dot)
- If `status === 'online'` AND `last_seen` older than 30 minutes = still show but as **away** with "last seen Xh ago" (these are likely stale -- but better to show than hide)
- If `status === 'offline'` = do not show (count as offline)

This means: anyone with `status = 'online'` always appears in the Team Online section. The `last_seen` timestamp determines their status indicator, not their visibility.

### 2. Always render the Team Online section in `LiveOperationsWidget.tsx`

Currently the section is wrapped in `{onlineMembers.length > 0 && ...}`. Change this so the section always renders when not loading. If no members are online, show a subtle "No team members online" message instead of hiding the section entirely. This makes the widget feel complete even when nobody is active.

### 3. Add presence refresh interval

Add a 60-second interval in `useLiveOperations` that also refreshes presence (not just sessions), so the status dots update as members come and go.

---

## Technical Details

### File: `src/hooks/useLiveOperations.ts`

- Remove the `minutesAgo < 15` gate that skips users to `offline++`
- Instead: if `presence.status === 'online'`, always push to the `online` array
- Compute `status` and `recentlyActive` purely from `last_seen` time deltas
- Add `loadPresence()` to the existing 60-second refresh interval

### File: `src/components/clubhome/LiveOperationsWidget.tsx`

- Remove the `{onlineMembers.length > 0 && ...}` conditional wrapper on the Team Online section
- Add a fallback message when `onlineMembers.length === 0` and not loading
- Always show the section header "Team Online" for consistency

---

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useLiveOperations.ts` | Relax presence filter, add presence to refresh interval |
| `src/components/clubhome/LiveOperationsWidget.tsx` | Always show Team Online section with empty state |

No database changes needed.
