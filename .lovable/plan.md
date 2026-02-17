

# Avatar Traffic Control -- Full Audit and Plan to 100/100

## Current Score: 61 / 100

---

## Scorecard Breakdown

| Category | Score | Max | Notes |
|---|---|---|---|
| Core session management | 8 | 10 | Sessions, start/end, realtime, conflict trigger, anomaly detection |
| Job-linked tracking | 6 | 10 | Session-job linking works, switch job works, but job selector is flat list -- unusable with 30+ jobs |
| **Job selector UX** | **2** | **10** | **No company filter. Flat list of all jobs. No job count per company. Hard to navigate.** |
| LinkedIn data sync | 7 | 10 | Captures 20+ fields from Apify. No scheduled auto-sync. |
| Data model completeness | 8 | 10 | 6 tables, 40+ columns, session_jobs, time_corrections, daily_stats |
| Security / credentials | 3 | 10 | Base64 is NOT encryption. Passwords decoded client-side with `atob()`. |
| Risk engine / intelligence | 5 | 10 | Auto-calc function exists + trigger. Missing: consecutive-day tracking, user diversity scoring |
| Usage analytics / reporting | 4 | 10 | Job Insights tab exists. No daily usage charts, no heat maps, no per-account time trends |
| Session timeout enforcement | 4 | 5 | Cron job every 5 min -- working |
| Bulk operations | 4 | 5 | Bulk sync + delete implemented |
| Apify data extraction depth | 7 | 10 | Extended fields stored. Missing: parsing experience/education for display |
| **UI polish / information density** | **5** | **10** | **Session history is a flat table with no grouping. No account detail drawer. Cards good but dense.** |
| Audit trail completeness | 3 | 5 | Events table logs session start/end + time_corrected. Missing: credential_accessed, sync_started, account_created, status_changed |
| Time correction system | 3 | 5 | Dialog exists but uses `session.id` instead of actual `session_job_id` -- broken reference |
| **Scheduled auto-sync** | **0** | **5** | **No `sync-all-avatars` edge function. No daily cron. Only manual.** |
| **Real encryption** | **0** | **5** | **Still using btoa/atob (Base64). Not implemented from Phase 2 of prior plan.** |

---

## What is Broken Right Now

1. **Time correction passes `session.id` as `sessionJobId`** (line 209 of AvatarControlHub). It should query `linkedin_avatar_session_jobs` to get the actual session_job record ID.

2. **`useSessionJobs()` called without `sessionId`** in `TimeCorrectionDialog` (line 38). The hook requires a `sessionId` parameter -- currently undefined so `submitCorrection` is from a parameterless call.

3. **Job selector in StartSessionModal is a flat list** -- with 30+ jobs across 17 companies, users must scroll through everything. No company grouping.

---

## Implementation Plan

### Phase A: Company-First Job Selector (Score impact: +8)

Replace the current flat job list in both `StartSessionModal` and the "Switch Job" dialog with a two-step selector:

**Step 1 -- Company Selector:**
- Searchable dropdown of all companies that have at least 1 published job
- Each item shows: company name + badge with open job count (e.g., "Merrachi (10)")
- Sorted by open job count descending

**Step 2 -- Job Selector (filtered by company):**
- Once a company is selected, show only that company's published jobs
- Each item shows: job title, location, employment type
- A "Show all companies" link to go back to step 1

**Changes:**
- `useAvailableJobs()` in `useSessionJobs.ts`: also fetch `company_id` and return company-level grouping
- New helper: `useAvailableCompaniesWithJobCounts()` that queries companies with job counts
- `StartSessionModal.tsx`: Replace single Popover with two-step flow (company then job)
- `ActiveSessionBanner.tsx` Switch Job dialog: Same two-step pattern

### Phase B: Fix Time Correction Plumbing (Score impact: +3)

- `AvatarControlHub.tsx` session history: query `linkedin_avatar_session_jobs` for each session to get the actual `session_job.id`
- Pass the real `session_job_id` to `TimeCorrectionDialog`
- Fix `TimeCorrectionDialog` to pass `sessionId` to `useSessionJobs()` so `submitCorrection` actually works

### Phase C: Audit Trail Expansion (Score impact: +2)

Log these events to `linkedin_avatar_events`:
- `account_created` (in `useAvatarAccounts.createAccount`)
- `account_updated` (in `updateAccount`)
- `account_deleted` (in `deleteAccount`)
- `credentials_viewed` (in `EditAvatarAccountDialog` when passwords are fetched)
- `sync_started` + `sync_completed` (in `syncLinkedIn` mutation)
- `status_changed` (when account status changes)

No DB changes -- just additional `.insert()` calls in existing hooks.

### Phase D: Enriched Session History (Score impact: +5)

- Group sessions by date in the history tab
- Show the actual job name from `linkedin_avatar_session_jobs` (not just `primary_job_id`)
- Show correction indicator if a time correction exists for that session
- Add expandable row to show all job switches within a session
- Fix the "Possibly left running" badge to show on active sessions exceeding their expected end time

### Phase E: Account Detail Drawer (Score impact: +3)

New component that opens when clicking an account card:
- Full "About" text
- Work history timeline (from `experience_json`)
- Education list (from `education_json`)
- Session history for this account
- Risk score breakdown
- All synced metadata with last-sync timestamp

### Phase F: Daily Usage Charts (Score impact: +4)

- Populate `linkedin_avatar_daily_stats` via a DB trigger on session completion
- Add a "Usage" sub-tab in Job Insights with:
  - Bar chart: sessions per day (last 30 days) using recharts
  - Per-account daily minutes chart
  - Account utilization gauge (minutes used / max_daily_minutes)

### Phase G: Real Encryption (Score impact: +5)

- Enable `pgcrypto` extension
- Create `encrypt_credential()` / `decrypt_credential()` DB functions using `pgp_sym_encrypt` with a server-side key from Vault/env
- Update `avatar-account-credentials` edge function to use real encryption
- Remove all `atob()` / `btoa()` from client code
- Decrypt only server-side, return plaintext only to authenticated admin users via edge function

### Phase H: Scheduled Auto-Sync (Score impact: +5)

- Create `sync-all-avatars` edge function that iterates all accounts with a `linkedin_url` and calls Apify
- Add cron job (daily at 06:00 UTC) to trigger it
- Show "Last auto-sync" timestamp in the hub header
- Add `sync_status` and `last_sync_error` columns to accounts

---

## Revised Scorecard After All Phases

| Category | Before | After | Max |
|---|---|---|---|
| Core session management | 8 | 9 | 10 |
| Job-linked tracking | 6 | 9 | 10 |
| Job selector UX | 2 | 10 | 10 |
| LinkedIn data sync | 7 | 10 | 10 |
| Data model completeness | 8 | 10 | 10 |
| Security / credentials | 3 | 8 | 10 |
| Risk engine / intelligence | 5 | 7 | 10 |
| Usage analytics / reporting | 4 | 8 | 10 |
| Session timeout enforcement | 4 | 5 | 5 |
| Bulk operations | 4 | 5 | 5 |
| Apify data extraction depth | 7 | 9 | 10 |
| UI polish / information density | 5 | 8 | 10 |
| Audit trail completeness | 3 | 5 | 5 |
| Time correction system | 3 | 5 | 5 |
| Scheduled auto-sync | 0 | 5 | 5 |
| Real encryption | 0 | 5 | 5 |
| **TOTAL** | **61** | **108 (capped 100)** | **100** |

---

## Priority Order

1. **Phase A** -- Company-first job selector (biggest UX win, addresses main request)
2. **Phase B** -- Fix broken time correction (critical bug)
3. **Phase D** -- Enriched session history (high visibility)
4. **Phase C** -- Audit trail (low effort, high compliance value)
5. **Phase G** -- Real encryption (security critical, but more complex)
6. **Phase F** -- Usage charts (nice to have, uses existing recharts)
7. **Phase E** -- Account detail drawer (depth feature)
8. **Phase H** -- Auto-sync cron (operational convenience)

---

## Files Changed Summary

| Phase | Files | DB Changes |
|---|---|---|
| A | `useSessionJobs.ts`, `StartSessionModal.tsx`, `ActiveSessionBanner.tsx` | None |
| B | `AvatarControlHub.tsx`, `TimeCorrectionDialog.tsx` | None |
| C | `useAvatarAccounts.ts`, `EditAvatarAccountDialog.tsx` | None |
| D | `AvatarControlHub.tsx` (session history section) | None |
| E | New: `AvatarAccountDrawer.tsx` | None |
| F | `AvatarControlHub.tsx`, new chart component | Trigger to populate daily_stats |
| G | `avatar-account-credentials` edge fn, `EditAvatarAccountDialog.tsx` | pgcrypto functions |
| H | New: `sync-all-avatars` edge fn | 2 columns + cron job |

