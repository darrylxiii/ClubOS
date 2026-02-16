

# Greenhouse Import Hub

Build a dedicated admin page that connects to the Greenhouse Harvest API, lets you browse your pipelines (jobs), preview candidates in each, select what to import, and bring them into the OS with full history -- then optionally invite them to the platform.

---

## How It Works

### Step 1: Connect Your Greenhouse API Key

- Admin enters their Greenhouse Harvest API key (stored as a secret `GREENHOUSE_API_KEY`)
- An edge function validates the key by calling `GET /v1/user/me` on the Harvest API
- Once validated, the connection status is shown in the UI

### Step 2: Browse Jobs / Pipelines

- The edge function calls `GET /v1/jobs?status=open` (and `status=closed` if requested) from the Greenhouse Harvest API
- Each job is displayed as a card showing: title, department, office, status, candidate count
- You select which jobs/pipelines you want to import from (e.g. both "Business Analyst" pipelines)

### Step 3: Preview and Select Candidates

- For each selected job, the edge function fetches candidates via `GET /v1/candidates?job_id=...`
- Candidates are displayed in a table: name, email, LinkedIn URL, current stage, source, last activity date
- You can filter by stage (e.g. "only candidates who reached Interview or beyond")
- Select all, select by stage, or cherry-pick individual candidates
- Duplicate detection: candidates whose email already exists in `candidate_profiles` are flagged with a "Already in OS" badge

### Step 4: Choose What Data to Import

A checklist of data categories:

| Data | Greenhouse Source | Where It Goes in OS |
|---|---|---|
| Name + Email | Candidate record | `candidate_profiles.full_name`, `.email` |
| LinkedIn URL | Custom fields or social media | `candidate_profiles.linkedin_url` |
| Phone | Candidate phone numbers | `candidate_profiles.phone` |
| Current company + title | Candidate current employer | `candidate_profiles.current_company`, `.current_title` |
| Resume/CV | Attachments (latest) | Stored in file storage, URL in `candidate_profiles.resume_url` |
| Application history | Applications per job | `applications` table (job title, stages, dates, status) |
| Interview notes | Scorecards and feedback | `candidate_notes` (one note per scorecard, tagged "greenhouse-import") |
| Activity log | Candidate activity feed | `candidate_notes` with type "activity" and full timeline |
| Tags | Candidate tags | `candidate_profiles.tags` (merged with any existing) |
| Source | Candidate source | `candidate_profiles.source_channel` = "greenhouse", `.source_metadata` stores original source details |

### Step 5: Import

- The edge function processes candidates in batches of 25
- For each candidate:
  - Check if email already exists in `candidate_profiles` -- if so, merge (update fields that are currently null, append notes, skip duplicates)
  - Create the `candidate_profiles` record with `source_channel: 'greenhouse'`
  - Create `applications` records for each job application with stage history
  - Create `candidate_notes` for scorecards, feedback, and activity events
  - Download and re-upload the latest resume to file storage
- Progress is shown in real-time (X of Y candidates imported)
- A summary log is saved to `greenhouse_import_logs` for audit

### Step 6: Post-Import Actions

After import completes:
- **View imported candidates** in the Talent Pool
- **Bulk invite** the imported candidates to the OS (links to the existing Bulk Invitation system)
- **Import another pipeline** to continue with more jobs

---

## Files to Create

| File | Purpose |
|---|---|
| `supabase/functions/greenhouse-sync/index.ts` | Edge function: validate key, list jobs, fetch candidates, import batches |
| `src/pages/admin/GreenhouseImport.tsx` | Main page: connection setup, job browser, candidate preview, import progress |
| `src/components/greenhouse/GreenhouseJobSelector.tsx` | Job cards with selection checkboxes |
| `src/components/greenhouse/GreenhouseCandidatePreview.tsx` | Candidate table with stage filter and selection |
| `src/components/greenhouse/GreenhouseImportProgress.tsx` | Real-time progress bar and results summary |
| `src/components/greenhouse/GreenhouseDataFieldSelector.tsx` | Checklist for which data categories to import |
| `src/hooks/useGreenhouseImport.ts` | React Query hooks for all Greenhouse operations |

## Database Changes

1. New table `greenhouse_import_logs`:
   - `id`, `admin_id`, `job_ids` (jsonb), `total_candidates`, `imported_count`, `skipped_count`, `failed_count`, `data_fields` (jsonb -- which categories were selected), `errors` (jsonb), `started_at`, `completed_at`
   - RLS: admin-only read/write

2. Add column `greenhouse_id` (text, nullable) to `candidate_profiles` -- stores the Greenhouse candidate ID for deduplication and future syncs

## Route

- `/admin/greenhouse-import` -- added to admin routes, accessible from the admin sidebar

## Security

- The Greenhouse API key is stored as a server-side secret, never exposed to the client
- All Greenhouse API calls happen inside the edge function
- The edge function requires admin authentication (checks `user_roles`)
- Imported data respects existing RLS policies on `candidate_profiles`, `applications`, and `candidate_notes`

## Implementation Sequence

1. Store the `GREENHOUSE_API_KEY` secret
2. Create the `greenhouse_import_logs` table and add `greenhouse_id` to `candidate_profiles`
3. Build the `greenhouse-sync` edge function (validate, list jobs, fetch candidates, import)
4. Build the UI page and components
5. Add the route and sidebar link

