
# Avatar Account Traffic Control -- Full System Audit

## Current Score: 42 / 100

---

## Scorecard Breakdown

| Category | Score | Max | Notes |
|---|---|---|---|
| Core session management | 8 | 10 | Sessions, start/end, realtime, conflict prevention via trigger -- solid |
| LinkedIn data sync | 6 | 10 | Works now, but only captures 5 of ~25 available fields |
| Data model completeness | 3 | 10 | Missing 15+ columns from Apify data; no activity metrics table |
| Security / credentials | 4 | 10 | Base64 is NOT encryption; passwords readable by anyone with DB access |
| Risk engine / intelligence | 1 | 15 | Risk level is manual-only; no auto-calculation from usage patterns |
| Usage analytics / reporting | 2 | 10 | No daily usage tracking, no minutes-used calculation, no trend charts |
| Session timeout enforcement | 1 | 5 | No auto-expiry of sessions past expected_end_at |
| Bulk operations | 2 | 5 | Bulk sync missing; must click sync one-by-one for 8 accounts |
| Delete account | 0 | 5 | No way to delete accounts from the UI |
| Data freshness automation | 0 | 5 | No scheduled re-sync; only manual button |
| Apify data extraction depth | 4 | 10 | Ignoring: about, location, skills, experience, education, company, featured, premium/creator/influencer flags |
| UI polish / information density | 7 | 10 | Cards look good; missing some enrichment data display |
| Audit trail completeness | 4 | 5 | Events table exists but only logs session start/end; no credential access, sync, or edit events |

---

## What Works Well

1. Session conflict prevention via DB trigger (prevents double logins)
2. Realtime subscription for session state changes
3. Account cards with profile picture, headline, connections, followers
4. Edit dialog with credential visibility
5. Session history timeline
6. Active session banner with end-session capability
7. LinkedIn sync via Apify with Proxycurl fallback
8. Profile image download and re-upload to storage (prevents CDN expiry)

---

## Critical Issues (Must Fix)

### 1. Fake Encryption -- Base64 is NOT Encryption
The `avatar-account-credentials` function uses `btoa()` (Base64 encoding) to "encrypt" passwords. Base64 is trivially reversible. Anyone with database read access sees the passwords in cleartext equivalent. The edit dialog also decodes with `atob()` directly on the client.

**Fix:** Use `pgcrypto` with `pgp_sym_encrypt` / `pgp_sym_decrypt` with a server-side secret, or at minimum AES-256. Passwords should never be decodable client-side.

### 2. No Session Auto-Expiry
Sessions that pass `expected_end_at` remain "active" forever. If someone forgets to click "End Session," the account is locked indefinitely.

**Fix:** Add a cron job or DB trigger that sets `status = 'timeout'` for sessions where `expected_end_at < now()` and `status = 'active'`.

### 3. 80% of Apify Data is Discarded
The API returns these fields that are currently thrown away:
- `about` (bio/summary)
- `location` (city/country)
- `top_skills` (array of skills)
- `current_company` + `current_company_url`
- `is_creator`, `is_influencer`, `is_premium`, `open_to_work` (boolean flags)
- `background_picture_url`
- `created_timestamp` (account age)
- `experience` (full work history array)
- `education` (full education array)
- `featured` (featured posts/articles)
- `email` (sometimes available)
- `public_identifier` (the /in/username slug)
- `urn` (LinkedIn internal ID)

### 4. No Bulk Sync
With 8 accounts, admins must click sync on each card individually. There is no "Sync All" button.

### 5. Risk Level is Static / Manual
Risk level is set manually in the edit dialog. There is no automatic risk scoring based on usage patterns (sessions per day, consecutive hours, login frequency, etc.).

---

## Implementation Plan to Reach 100/100

### Phase 1: Data Model Expansion (Score impact: +15)

Add columns to `linkedin_avatar_accounts`:
- `about` (text) -- LinkedIn bio
- `location` (text) -- city/region
- `top_skills` (text[]) -- skills array
- `current_company` (text) -- current employer
- `current_company_url` (text) -- company LinkedIn URL
- `is_creator` (boolean)
- `is_influencer` (boolean)
- `is_premium` (boolean)
- `open_to_work` (boolean)
- `public_identifier` (text) -- the /in/slug
- `linkedin_urn` (text) -- internal LinkedIn ID
- `account_created_at` (text) -- LinkedIn account creation date
- `background_picture_url` (text)
- `experience_json` (jsonb) -- full work history
- `education_json` (jsonb) -- full education
- `featured_json` (jsonb) -- featured posts
- `linkedin_email_from_scrape` (text) -- email if available from scrape

Update `sync-avatar-linkedin` to extract and store ALL of these from the Apify response.

### Phase 2: Real Encryption (Score impact: +6)

- Create a DB function `encrypt_credential(plaintext text)` using `pgcrypto` with a server-side key stored in Vault or env var
- Create a matching `decrypt_credential(ciphertext text)` function
- Update `avatar-account-credentials` edge function to use `pgp_sym_encrypt` / `pgp_sym_decrypt` instead of `btoa` / `atob`
- Log every credential access in `linkedin_avatar_events` (event_type: `credential_accessed`)

### Phase 3: Session Auto-Expiry (Score impact: +4)

- Add a `pg_cron` job (every 5 minutes) that runs:
  ```sql
  UPDATE linkedin_avatar_sessions
  SET status = 'timeout', ended_at = expected_end_at
  WHERE status = 'active' AND expected_end_at < now();
  ```
- Log timeout events to `linkedin_avatar_events`

### Phase 4: Smart Risk Engine (Score impact: +14)

Create a DB function `calculate_account_risk(account_id uuid)` that scores risk based on:
- Sessions per day in last 7 days (>3/day = medium, >5 = high)
- Total hours used per day (>6h = medium, >10h = high)
- Consecutive days of heavy use (>5 days straight = high)
- Time since last cooldown (no use for 24h)
- Number of different users per week (>3 = medium)

Add a trigger or cron that recalculates risk_level automatically after each session ends.

Add new columns:
- `daily_usage_minutes_today` (integer, reset daily)
- `sessions_today` (integer, reset daily)
- `last_cooldown_at` (timestamptz)
- `risk_score` (integer, 0-100)

### Phase 5: Usage Analytics Dashboard (Score impact: +8)

Create a new `linkedin_avatar_daily_stats` table:
- `account_id`, `date`, `total_sessions`, `total_minutes`, `unique_users`, `peak_hour`

Add a tab "Analytics" to the AvatarControlHub with:
- Daily usage chart per account (recharts bar chart)
- Heat map showing usage by hour-of-day
- Account utilization rate (minutes used / max_daily_minutes)
- Top users leaderboard

### Phase 6: Bulk Operations + Delete (Score impact: +10)

- Add "Sync All" button that triggers sync for all accounts with a LinkedIn URL
- Add "Delete Account" button in edit dialog (with confirmation)
- Add multi-select checkboxes on account cards for bulk status change (pause/unpause)

### Phase 7: Scheduled Auto-Sync (Score impact: +5)

- Create a `sync-all-avatars` edge function that iterates all accounts and calls Apify
- Set up a cron/webhook trigger to run daily at 6 AM
- Store `sync_status` and `sync_error` per account
- Show a "Last auto-sync: 6h ago" indicator in the header

### Phase 8: Enriched UI (Score impact: +6)

Update `AvatarAccountCard` to display:
- Location badge
- Skills pills (top 3)
- Premium/Creator/Influencer badges
- "About" snippet (first 120 chars) in a tooltip
- Current company with link
- Account age indicator

Add a detail drawer/modal that shows the full profile including:
- Complete work history timeline
- Education
- Featured content
- Full about text
- All synced data with timestamps

### Phase 9: Audit Trail Expansion (Score impact: +2)

Log these additional events to `linkedin_avatar_events`:
- `account_created`, `account_updated`, `account_deleted`
- `credentials_saved`, `credentials_viewed`
- `sync_started`, `sync_completed`, `sync_failed`
- `risk_level_changed` (with old/new values)
- `status_changed`

---

## Technical Summary

| Phase | Files Changed | DB Changes | Score Impact |
|---|---|---|---|
| 1. Data model + sync | sync-avatar-linkedin, migration | +17 columns | +15 |
| 2. Real encryption | avatar-account-credentials, migration | pgcrypto functions | +6 |
| 3. Session auto-expiry | migration (cron) | pg_cron job | +4 |
| 4. Risk engine | migration, new DB function | risk scoring function | +14 |
| 5. Analytics dashboard | new components, migration | daily_stats table | +8 |
| 6. Bulk ops + delete | AvatarControlHub, hooks | -- | +10 |
| 7. Scheduled sync | new edge function | cron trigger | +5 |
| 8. Enriched UI | AvatarAccountCard, new drawer | -- | +6 |
| 9. Audit trail | hooks, edge functions | -- | +2 |

**Total projected: 42 + 70 = 112 (capped at 100)**

Priority order: Phase 1 and 3 first (biggest value, least effort), then Phase 6 (UX wins), then Phase 4 (intelligence), then the rest.
