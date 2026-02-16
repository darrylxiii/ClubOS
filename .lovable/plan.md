

# Enrich Avatar Accounts with LinkedIn Profile Data

## Overview
Reuse the existing LinkedIn scraper (Proxycurl/Apify) to pull profile pictures, connection counts, and follower counts for avatar accounts. Add credential fields (LinkedIn password, email account login) to the accounts table. Redesign the account cards and add form for a polished, visual experience.

## 1. Database Migration

Add new columns to `linkedin_avatar_accounts`:

| Column | Type | Purpose |
|--------|------|---------|
| `linkedin_url` | text (nullable) | Profile URL, used to trigger LinkedIn sync |
| `avatar_url` | text (nullable) | Profile picture from LinkedIn |
| `connections_count` | integer (nullable) | Number of LinkedIn connections |
| `followers_count` | integer (nullable) | Number of LinkedIn followers |
| `linkedin_headline` | text (nullable) | Profile headline/tagline |
| `linkedin_password_encrypted` | text (nullable) | Encrypted LinkedIn password |
| `email_account_address` | text (nullable) | Associated email account login (if different from linkedin_email) |
| `email_account_password_encrypted` | text (nullable) | Encrypted email account password |
| `last_synced_at` | timestamptz (nullable) | When LinkedIn data was last refreshed |

Passwords will be stored using `pgcrypto` symmetric encryption with a server-side key, accessible only through backend functions -- never exposed to the client.

## 2. Edge Function: `sync-avatar-linkedin`

A new edge function that:
1. Receives `{ accountId, linkedinUrl }`.
2. Calls the same Proxycurl/Apify API the existing `linkedin-scraper` uses.
3. Extracts: `profile_pic_url`, `connections`, `follower_count`, `headline`/`occupation`.
4. Updates the `linkedin_avatar_accounts` row with those values + sets `last_synced_at`.
5. Returns the updated data.

This reuses the exact same API keys (`APIFY_API_KEY` / `PROXYCURL_API_KEY`) already configured.

## 3. Edge Function: `avatar-account-credentials`

A secure edge function for storing/retrieving encrypted credentials:
- **POST**: Encrypts and stores LinkedIn password and/or email password using `pgp_sym_encrypt` with a server-side secret.
- **GET**: Decrypts and returns credentials (admin-only, requires role check).
- Passwords never pass through the client unencrypted at rest.

## 4. Updated `AvatarAccountForm.tsx`

Redesign the "Add Account" dialog into a cleaner multi-section form:

- **Section 1 — Identity**: Label, LinkedIn URL (with "Sync from LinkedIn" button), Team/Campaign.
- **Section 2 — Credentials**: LinkedIn email, LinkedIn password (password input), Email account address (if different), Email account password.
- **Section 3 — Operations**: Max daily minutes, Notes, Playbook.

The "Sync from LinkedIn" button calls the edge function and auto-fills: profile picture, headline, connections, followers, and label (from full name).

## 5. Updated `AvatarAccountCard.tsx`

Visual upgrade to show enriched data:

```text
+------------------------------------------+
| [status strip]                           |
|                                          |
|  [Profile Pic]  Account Label            |
|                 @headline                |
|                 Team / Campaign           |
|                                          |
|  [connections icon] 2,450 connections    |
|  [followers icon]   8,120 followers      |
|                                          |
|  [risk badge]  [status badge]            |
|                                          |
|  [Active session info if in use]         |
|                                          |
|  [ Start Session ]  or  [ In Use ]       |
+------------------------------------------+
```

- Uses `AvatarImage` component with the LinkedIn `avatar_url` as `src`, falling back to initials.
- Displays connection/follower counts with compact number formatting.
- Shows "Last synced X ago" in a subtle footer.

## 6. Updated `useAvatarAccounts.ts`

- Extend the `AvatarAccount` interface with the new fields.
- Add a `syncLinkedIn` mutation that calls the `sync-avatar-linkedin` edge function.
- Add a `saveCredentials` mutation that calls `avatar-account-credentials`.

## 7. Account Detail / Edit Drawer (optional enhancement)

Add an "Edit" button on each card that opens a slide-over drawer with:
- All form fields pre-filled.
- A "Re-sync LinkedIn" button.
- Credential fields (view/update).
- Session history for that account.

## File Changes Summary

| File | Action |
|------|--------|
| New migration SQL | Add columns to `linkedin_avatar_accounts` |
| `supabase/functions/sync-avatar-linkedin/index.ts` | New edge function |
| `supabase/functions/avatar-account-credentials/index.ts` | New edge function |
| `src/hooks/useAvatarAccounts.ts` | Extend interface + add sync/credential mutations |
| `src/components/avatar-control/AvatarAccountCard.tsx` | Visual redesign with photo + stats |
| `src/components/avatar-control/AvatarAccountForm.tsx` | Redesign with credentials + sync button |
| `src/components/avatar-control/AvatarAccountGrid.tsx` | Minor: pass new props |

## Security Considerations

- LinkedIn and email passwords are encrypted at rest using `pgp_sym_encrypt` with a server-side secret (never in client code).
- Decryption only happens in edge functions with admin role verification.
- The `avatar_url` is a public LinkedIn CDN URL -- safe to display client-side.
- RLS policies already restrict write access to admin/strategist roles.

