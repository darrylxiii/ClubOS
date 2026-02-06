

# Fix: Team Invite Failing Due to Database Constraint

## Problem

When a partner clicks "Invite" on the Partner Home, the insert into `invite_codes` fails because:

- The code sends `created_by_type: "user"` (line 103 in TeamOverviewWidget.tsx)
- The database constraint `invite_codes_created_by_type_check` only allows `'member'` or `'recruiter'`

## Fix

**One-line change** in `src/components/partner/TeamOverviewWidget.tsx` (line 103):

Change `created_by_type: "user"` to `created_by_type: "member"`

This matches the allowed values in the database constraint and correctly identifies the inviter as a company member.

### Also check TeamInviteWidget.tsx

The same bug likely exists in `src/components/partner/TeamInviteWidget.tsx` -- will verify and fix there too if needed.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/partner/TeamOverviewWidget.tsx` | Change `created_by_type` from `"user"` to `"member"` |
| `src/components/partner/TeamInviteWidget.tsx` | Same fix if applicable |

