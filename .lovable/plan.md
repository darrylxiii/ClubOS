

# Greenhouse Candidate Sync -- Import from Older Pipelines

## Overview

Build an edge function and admin UI to pull candidates from Greenhouse job pipelines (past and current) and sync them into TQC's candidate_profiles table. Uses the Greenhouse Harvest API, deduplicates via the existing `greenhouse_id` column, and logs every import run in `greenhouse_import_logs`.

## Prerequisites

- **GREENHOUSE_API_KEY** secret must be added (you will be prompted to enter it)
- The API key needs Harvest API access with read permissions for Candidates, Applications, and Jobs

## Database Changes

### Add column to `jobs` table
- `greenhouse_job_id TEXT` -- maps TQC jobs to their Greenhouse counterparts for linking

No new tables needed; `greenhouse_import_logs` and `candidate_profiles.greenhouse_id` already exist.

## Edge Function: `sync-greenhouse-candidates`

**Location:** `supabase/functions/sync-greenhouse-candidates/index.ts`

### Accepts (POST body)
```json
{
  "job_ids": [12345, 67890],     // Greenhouse job IDs to import from (optional, imports all if empty)
  "dry_run": false,              // Preview without writing
  "include_rejected": false,     // Whether to include rejected candidates
  "page_size": 100               // Pagination size (max 500)
}
```

### Logic
1. Authenticate the request (admin/strategist only via JWT)
2. Create a `greenhouse_import_logs` entry (started_at = now)
3. Fetch jobs from Greenhouse Harvest API (`GET /v1/jobs` or specific job IDs)
4. For each job, paginate through candidates via `GET /v1/jobs/{id}/candidates`
5. For each candidate:
   - Check if `greenhouse_id` already exists in `candidate_profiles` -- skip if so (increment skipped_count)
   - Map Greenhouse fields to TQC schema:
     - `first_name + last_name` to `full_name`
     - `email_addresses[0].value` to `email`
     - `phone_numbers[0].value` to `phone`
     - `applications[].current_stage.name` for stage tracking
     - `attachments` with type "resume" to `resume_url` (re-upload to private storage)
     - Tags, social URLs (LinkedIn, GitHub)
   - Insert into `candidate_profiles` with `greenhouse_id` set, `source_channel = 'greenhouse'`
   - Create a `candidate_notes` entry tagged `greenhouse-import` with the raw application data
6. Update the `greenhouse_import_logs` row with final counts and `completed_at`
7. Return summary: `{ found, created, skipped, errors, dryRun }`

### Greenhouse Harvest API Details
- Base URL: `https://harvest.greenhouse.io/v2`
- Auth: Basic auth with API key as username, blank password
- Rate limit: 50 req/10s -- function includes delay between pages
- Pagination: Link header based

## Admin UI: Greenhouse Sync Panel

### Location: New component `src/components/admin/GreenhouseSyncPanel.tsx`

### Features
- **Job selector**: Fetches available Greenhouse jobs via the edge function (separate lightweight mode) and displays them as checkboxes
- **Options**: Toggle for "Include rejected candidates", dry-run mode
- **Import button**: Triggers the sync, shows a progress indicator
- **Results card**: Shows found/created/skipped/errors after completion
- **Import history**: Lists recent entries from `greenhouse_import_logs` with timestamps and counts

### Where it lives
- Add as a tab or section within the existing Admin settings or a dedicated route `/admin/greenhouse-sync`
- Accessible only to Admin and Strategist roles

## File Summary

| File | Action |
|---|---|
| `supabase/functions/sync-greenhouse-candidates/index.ts` | Create -- main sync edge function |
| `src/components/admin/GreenhouseSyncPanel.tsx` | Create -- admin UI for triggering and monitoring syncs |
| `src/pages/Auth.tsx` or relevant admin route | Modify -- add navigation to Greenhouse sync panel |
| DB migration | Add `greenhouse_job_id` column to `jobs` table |

## Security
- Edge function validates JWT and checks admin/strategist role before proceeding
- `GREENHOUSE_API_KEY` stored server-side only, never exposed to client
- RLS on `greenhouse_import_logs` restricts to admins
- Imported candidates get `gdpr_consent = false` by default (must be obtained separately)

## What This Does NOT Do (future scope)
- Two-way sync (pushing TQC data back to Greenhouse)
- Webhook-driven real-time sync (can be added later)
- Scorecard/feedback import (noted in memory, deferred)
