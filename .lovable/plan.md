

# Change "Last Pipeline" to Track Job Pipelines, Not CRM

## What Changes

The radial menu's "Last Pipeline" action currently tracks CRM routes (`/crm/prospects`, `/crm/pipeline`, etc.) and navigates back to them. You want it to track the last **Job Pipeline** (e.g., `/jobs/abc-123/dashboard`) that the user visited instead.

## How It Will Work

- Whenever a user visits a job dashboard (`/jobs/:jobId/dashboard`), that URL is saved to localStorage.
- Clicking "Last Pipeline" in the radial menu navigates to that last-visited job pipeline.
- If no job pipeline has been visited yet, it falls back to `/jobs` (the Jobs Hub).

## Technical Details

### File: `src/hooks/useLastPipeline.ts`

Replace the CRM route list with a job dashboard pattern match:

- Change `PIPELINE_ROUTES` from CRM paths to a regex check for `/jobs/:jobId/dashboard`.
- The hook will save the full path (e.g., `/jobs/some-uuid/dashboard`) to localStorage whenever it matches.

### File: `src/hooks/useRadialMenu.ts`

- Update the `last-pipeline` fallback from `"/crm/prospects"` to `"/jobs"` (the Jobs Hub) so if no job pipeline has been visited yet, it goes to the jobs overview.

### File: `src/config/radial-menu-items.ts`

- Update the label from "Last Pipeline" to "Last Job Pipeline" (or just "Pipeline") for clarity.

### No database changes needed.

