

# Job-Linked Sessions, Time Tracking, Manual Corrections, and Intelligence Layer

## Overview

Transform the Avatar Traffic Control from a simple session manager into a full **operational intelligence system** that tracks exactly which job every session minute is spent on, enables manual time corrections with an audit trail, and builds a comprehensive metadata layer for reporting.

---

## Part 1: Database Schema

### New table: `linkedin_avatar_session_jobs`

Links sessions to jobs with tracked time. A session can have multiple jobs (user switches between jobs during one session).

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | |
| `session_id` | uuid FK -> sessions | Which session |
| `job_id` | uuid FK -> jobs | Which job |
| `started_at` | timestamptz | When work on this job began |
| `ended_at` | timestamptz (nullable) | When work on this job ended |
| `minutes_logged` | integer | Calculated or manually overridden minutes |
| `is_primary` | boolean default true | Was this the job selected at session start |
| `created_at` | timestamptz | |

### New table: `linkedin_avatar_time_corrections`

Audit trail for manual adjustments to logged time.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | |
| `session_job_id` | uuid FK -> session_jobs | Which session-job link is corrected |
| `session_id` | uuid FK -> sessions | For easy querying |
| `corrected_by` | uuid FK -> profiles | Who made the correction |
| `original_minutes` | integer | Before correction |
| `corrected_minutes` | integer | After correction |
| `reason` | text NOT NULL | Why ("left session running", "forgot to end", "wrong job selected") |
| `correction_type` | text | `too_long`, `too_short`, `wrong_job`, `split` |
| `created_at` | timestamptz | |

### Modify: `linkedin_avatar_sessions`

Add one column:

| Column | Type | Purpose |
|---|---|---|
| `primary_job_id` | uuid FK -> jobs (nullable) | The job selected when starting the session |

### Modify: `linkedin_avatar_daily_stats`

Add columns:

| Column | Type | Purpose |
|---|---|---|
| `jobs_worked` | integer | Number of distinct jobs worked that day |
| `top_job_id` | uuid (nullable) | Job with most minutes that day |

### RLS policies

- `linkedin_avatar_session_jobs`: Authenticated users can read all, insert/update own (user_id match via session join)
- `linkedin_avatar_time_corrections`: Authenticated users can read all, insert own (corrected_by = auth.uid())

---

## Part 2: Start Session Modal -- Job Selector

### Changes to `StartSessionModal.tsx`

- Fetch all jobs with status `published` from the `jobs` table
- Add a searchable dropdown (using cmdk/command or a Select with filter) showing:
  - Job title
  - Company name
  - Location (if any)
- The selected job becomes `primary_job_id` on the session
- After session insert, also insert into `linkedin_avatar_session_jobs` with `is_primary: true`
- Job selection is **required** (cannot start session without choosing a job)

### Changes to `useAvatarSessions.ts`

- `startSession` mutation params gain `job_id: string`
- After inserting the session, insert into `linkedin_avatar_session_jobs`
- Update session event metadata to include `job_id` and `job_title`

---

## Part 3: Active Session Banner -- Show Current Job

### Changes to `ActiveSessionBanner.tsx`

- Query `linkedin_avatar_session_jobs` for the active session to get the job title
- Display: "Active session: [Account] -- [Job Title] -- until HH:mm"
- Add a small "Switch Job" button that opens a mini-dialog to:
  - End the current session_job entry (set `ended_at`)
  - Create a new session_job entry for the newly selected job

---

## Part 4: Session History -- Job Column + Time Details

### Changes to `AvatarControlHub.tsx` (Session History tab)

- Join `linkedin_avatar_session_jobs` and `jobs` to show the job title per session
- Show calculated duration (ended_at - started_at) in minutes
- Add a "Correction" icon button on each completed session row that opens the correction dialog
- Flag sessions that seem anomalous:
  - Session ran > 2x expected duration = "Possibly left running" warning
  - Session < 5 minutes = "Very short" indicator

---

## Part 5: Time Correction Dialog

### New component: `TimeCorrection.tsx`

A dialog that allows manual adjustment of session time:

- Shows original duration (auto-calculated)
- Input for corrected minutes
- Dropdown for correction type: `too_long`, `too_short`, `wrong_job`, `split`
- Required reason text field
- On submit:
  - Insert into `linkedin_avatar_time_corrections`
  - Update `minutes_logged` on the `linkedin_avatar_session_jobs` row
  - Log event `time_corrected` to `linkedin_avatar_events`

---

## Part 6: Job Analytics View

### New tab "Job Insights" on AvatarControlHub

A table/card view showing per-job statistics:

- Total sessions worked on this job
- Total minutes (with corrections applied)
- Number of unique accounts used
- Number of unique users who worked on it
- Average session length
- Last activity date
- Which accounts were used (list)

This is computed by querying `linkedin_avatar_session_jobs` joined with `jobs` and `linkedin_avatar_accounts`.

---

## Part 7: Elevating the System -- Intelligence Features

### 7a. Anomaly Detection flags

Add a DB function `flag_session_anomalies()` that runs when a session ends:
- If actual duration > expected duration * 2 = flag `possibly_abandoned`
- If actual duration < 5 minutes = flag `suspiciously_short`
- Store flag in session metadata or a new `anomaly_flags` text[] column on sessions

### 7b. Job-Account Affinity Matrix

A computed view showing which accounts perform best for which jobs (based on session count and total time invested). Displayed as a simple grid in the UI.

### 7c. Cost-per-job estimation

Add an optional `hourly_cost_rate` (decimal) to `linkedin_avatar_accounts`. Multiply by hours worked per job to show estimated cost-per-role in the Job Insights tab.

### 7d. Session productivity scoring

After ending a session, prompt user with an optional 1-5 rating of how productive the session was. Store in `linkedin_avatar_session_jobs.productivity_rating`. Over time this reveals which account + job + user combos are most effective.

---

## File Changes Summary

| File | Change |
|---|---|
| Migration SQL | Create `session_jobs` table, `time_corrections` table, add `primary_job_id` to sessions, add columns to daily_stats, RLS policies, anomaly function |
| `StartSessionModal.tsx` | Add job selector dropdown with search, pass job_id to mutation |
| `useAvatarSessions.ts` | Extend startSession params, insert session_job row, update endSession to finalize session_job |
| `ActiveSessionBanner.tsx` | Show job title, add "Switch Job" mini-dialog |
| `AvatarControlHub.tsx` | Add "Job Insights" tab, show job column in history, add correction button |
| New: `TimeCorrection.tsx` | Correction dialog component |
| New: `useSessionJobs.ts` | Hook for session-job CRUD and job analytics queries |

---

## Implementation Order

1. Database migration (tables + RLS + anomaly function)
2. `useSessionJobs.ts` hook
3. `StartSessionModal.tsx` with job selector
4. `useAvatarSessions.ts` updates
5. `ActiveSessionBanner.tsx` job display + switch
6. `TimeCorrection.tsx` dialog
7. `AvatarControlHub.tsx` history enrichment + Job Insights tab
8. Anomaly flags + productivity rating

