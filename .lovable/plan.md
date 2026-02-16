

# Fix: Avatar LinkedIn Sync + Edit/Password Visibility

## Root Cause (Definitively Found)

The Supabase client in this project sends a custom `x-application-name: thequantumclub` header with EVERY request (configured in `src/integrations/supabase/client.ts`). When calling edge functions via `supabase.functions.invoke()`, this header triggers a CORS preflight check.

The working function (`sync-greenhouse-candidates`) includes `x-application-name` in its `Access-Control-Allow-Headers`. The broken functions do NOT. Result: the browser blocks the POST at the network level, and the Supabase client throws `"Failed to send a request to the Edge Function"`.

**Proof:**
- Working: `sync-greenhouse-candidates` CORS → includes `x-application-name`
- Broken: `sync-avatar-linkedin` CORS → missing `x-application-name`
- Broken: `avatar-account-credentials` CORS → missing `x-application-name` AND most other headers, AND still uses `esm.sh` import

## Part 1: Fix Edge Functions (CORS + Import)

### File: `supabase/functions/sync-avatar-linkedin/index.ts`

**Line 5 change only** -- add `x-application-name` to the CORS headers:

```
Before: 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, ...'
After:  'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, ...'
```

Everything else in this function stays exactly the same. The auth logic, Apify/Proxycurl logic, DB update logic -- all correct. It was always just the missing CORS header.

### File: `supabase/functions/avatar-account-credentials/index.ts`

Two fixes:
1. **Line 1**: Change import from `esm.sh` to `npm:@supabase/supabase-js@2`
2. **Line 5**: Replace minimal CORS headers with the full set (matching the working pattern), including `x-application-name`

### File: `supabase/functions/linkedin-scraper-proxycurl/index.ts`

Same CORS fix -- add `x-application-name` to the headers (line 5).

### Redeploy all three functions

## Part 2: Add Edit Dialog for Existing Accounts

### New file: `src/components/avatar-control/EditAvatarAccountDialog.tsx`

A dialog that lets admins edit any existing account. Features:
- Pre-populated form with current account data (label, LinkedIn URL, email, team, notes, playbook, max daily minutes)
- Password fields with show/hide toggle for LinkedIn password and email password
- Passwords display as masked by default; clicking the eye icon reveals them
- Fetches current (Base64-decoded) passwords from the database for display
- Save button updates the account via `updateAccount` mutation + `saveCredentials` for password changes

### File: `src/components/avatar-control/AvatarAccountCard.tsx`

- Add an Edit (pencil) icon button next to the sync button in each card
- Clicking it opens the `EditAvatarAccountDialog` with the account data pre-filled

### File: `src/components/avatar-control/AvatarAccountGrid.tsx`

- Wire up the edit dialog state (selectedAccount, open/close)
- Pass `onEdit` callback to each `AvatarAccountCard`

### File: `src/hooks/useAvatarAccounts.ts`

- Add `getCredentials` query/function that reads `linkedin_password_encrypted` and `email_account_password_encrypted` from the database and decodes them (Base64) for display in the edit dialog

## Summary

| File | Change |
|------|--------|
| `sync-avatar-linkedin/index.ts` | Add `x-application-name` to CORS headers (1 line) |
| `avatar-account-credentials/index.ts` | Fix import + expand CORS headers |
| `linkedin-scraper-proxycurl/index.ts` | Add `x-application-name` to CORS headers |
| `EditAvatarAccountDialog.tsx` | New file: edit dialog with password visibility |
| `AvatarAccountCard.tsx` | Add edit button |
| `AvatarAccountGrid.tsx` | Wire up edit dialog |
| `useAvatarAccounts.ts` | Add credential retrieval |

