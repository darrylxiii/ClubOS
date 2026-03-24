

# Add Last Login Tracking to User Management Hub

## Current State

The `user_activity_tracking` table already stores `last_login_at` (updated via `trackLogin` → `update_user_activity_tracking` RPC on every login). The data exists but none of the three tab components fetch or display it.

## Changes

### 1. `CandidatesTab.tsx`
- Add `last_login_at` to the `CandidateUser` interface
- In the query, fetch `user_activity_tracking.last_login_at` for all candidate user IDs and merge into results via a map
- Add "Last Login" column between "Status" and "Joined" — display as relative time (`formatDistanceToNow`) or "Never" if null
- Update `colSpan` from 9 to 10

### 2. `PartnersTab.tsx`
- Add `last_login_at` to `PartnerUser` interface
- Same pattern: fetch from `user_activity_tracking`, merge via map
- Add "Last Login" column between "Status" and "Joined"
- Update `colSpan` from 6 to 7

### 3. `StaffTab.tsx`
- Add `last_login_at` to `StaffUser` interface
- Same fetch and merge pattern
- Add "Last Login" column between "Status" and "Joined"
- Update `colSpan` from 6 to 7

### Display Format
- If `last_login_at` exists: `formatDistanceToNow(date, { addSuffix: true })` (e.g. "3 hours ago")
- If null: gray "Never" text

No database changes needed — the tracking infrastructure already works correctly.

