
# Account Traffic Control -- Full Audit and Fix Plan

## Issues Found

### 1. Passwords Not Saving (Critical)

**Root cause**: Two bugs working together:

**Bug A -- Edit dialog skips credentials save**: In `EditAvatarAccountDialog.tsx` line 98, the condition `if (linkedinPassword || emailPassword || emailAccountAddress !== ...)` checks if `linkedinPassword` is truthy. When the dialog opens, it fetches encrypted passwords from the DB (line 61-76). But since **all passwords are currently null** in the DB, `linkedinPassword` stays empty string. When a user types a new password and saves, the condition IS met -- so that path works. The real problem is:

**Bug B -- Edge function saves `email_account_address` but the edit dialog does NOT include it in `updateAccount`**: The `email_account_address` is only passed through the edge function, but the edge function only updates it when `emailAccountAddress !== undefined` (line 55 of the edge function). The `updateAccount` mutation on line 84-95 does NOT include `email_account_address` in its payload -- so if a user changes only the email address (not password), it goes through the credentials edge function. This actually works.

**Bug C -- The REAL bug**: Looking at the DB data, ALL `linkedin_password_encrypted` and `email_account_password_encrypted` values are `null`. The edge function logs show only "booted" messages with no request processing. This means the edge function calls are either:
  - Failing silently (the `supabase.functions.invoke` error is swallowed by `onError` toast which may not be visible), OR
  - The condition check in the edit dialog is preventing the call

**The fix**: The `handleSave` in both `AvatarAccountForm` (create) and `EditAvatarAccountDialog` (edit) need proper error handling with try/catch, and the credential save needs to be awaited, not fire-and-forget. Additionally, we should save `email_account_address` directly in the `updateAccount` call instead of routing it through the edge function.

### 2. No "View Profile" Mode (Missing Feature)

Currently, the account cards show summary info but there's no way to see a full profile view of an avatar account. Users can only click Edit. We need a read-only "View Profile" drawer/dialog that shows:
- Full LinkedIn profile details (headline, about, experience, education, skills)
- Credentials with show/hide toggle
- Session history for this account
- Risk metrics and usage stats

### 3. Non-2xx on Profile Save (Reported Bug)

The user reported that saving profiles returns a non-2xx status code. This is likely the `updateAccount` mutation in `useAvatarAccounts.ts` line 87-92. The RLS policy requires the user to have `admin` or `strategist` role in `user_roles`. If the logged-in user's role is `admin` in the `profiles` table but NOT in the `user_roles` table, the RLS check fails. Need to verify and potentially align the policy.

---

## Implementation Plan

### Task 1: Fix Password Saving

**Files**: `EditAvatarAccountDialog.tsx`, `AvatarAccountForm.tsx`, `useAvatarAccounts.ts`

Changes:
- In `EditAvatarAccountDialog.tsx`: Always save credentials when the user clicks Save (remove the conditional check that skips the call). Include `email_account_address` in the `updateAccount` call directly.
- In `AvatarAccountForm.tsx`: `await` the `saveCredentials` call instead of fire-and-forget. Add proper error handling.
- In `useAvatarAccounts.ts`: After `saveCredentials` succeeds, invalidate the `avatar-accounts` query so the grid refreshes with updated data.

### Task 2: Add "View Profile" Dialog

**New file**: `src/components/avatar-control/ViewAvatarProfileDialog.tsx`

A read-only dialog/sheet that shows:
- Avatar, name, headline, company, location
- About section (full text)
- Experience timeline (from `experience_json`)
- Education (from `education_json`)
- Skills (full list, not truncated)
- Connection/follower counts, premium/creator/influencer badges
- Credentials section with show/hide password toggles (fetched via edge function or direct query since admin RLS allows it)
- Session history (inline `AvatarSessionTimeline`)
- Risk score, daily usage, last synced

**Modified files**: `AvatarAccountCard.tsx` -- add an "eye" icon button to open the view profile dialog. `AvatarAccountGrid.tsx` -- manage view dialog state.

### Task 3: Fix Non-2xx Profile Save

**Investigation**: Check if the RLS policy's `user_roles` table has the correct entries for the logged-in user. The policy checks `user_roles` table, not `profiles.role`. If these are out of sync, updates will fail with RLS violation.

**Fix**: Add a fallback in the RLS policy to also check `profiles.role`, OR ensure the `user_roles` table is properly populated. Since the existing policy references `user_roles`, we should verify the data first and fix the policy if needed to also check `profiles.role` as a fallback.

### Task 4: Credential Security Improvement

The current edge function uses `btoa()` for "encryption" which is just base64 encoding -- not actual encryption. While fixing this fully requires server-side encryption keys (out of scope), we should at minimum:
- Ensure the `SELECT` policy for `linkedin_avatar_accounts` does NOT return `linkedin_password_encrypted` and `email_account_password_encrypted` columns to non-admin users (currently the SELECT policy is `USING(true)` which exposes passwords to ALL authenticated users)
- Create a view that excludes password columns for non-admin access

---

## Technical Details

### File Changes Summary

| File | Action | Description |
|---|---|---|
| `EditAvatarAccountDialog.tsx` | Edit | Fix credential save logic, include email_account_address in updateAccount |
| `AvatarAccountForm.tsx` | Edit | Await saveCredentials, add error handling |
| `useAvatarAccounts.ts` | Edit | Invalidate query after credential save |
| `ViewAvatarProfileDialog.tsx` | Create | Full read-only profile view with credentials |
| `AvatarAccountCard.tsx` | Edit | Add "View" button |
| `AvatarAccountGrid.tsx` | Edit | Manage view dialog state |
| DB migration | Create | Fix SELECT policy to hide password columns from non-admin users; create secure view |

### Security Fix (DB Migration)

Replace the overly permissive SELECT policy `USING(true)` with a view that excludes password columns for non-admin reads. Admin/strategist users keep full access through the existing ALL policy.
