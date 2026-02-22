
# Fix: `pilot_tasks.source_id does not exist` Database Errors

## Root Cause

The database is being flooded with errors: **`column pilot_tasks.source_id does not exist`**. This happens because several edge functions and frontend files insert into the `pilot_tasks` table using column names that don't exist.

The actual `pilot_tasks` columns are:
`id, user_id, task_type, title, description, priority_score, impact_score, urgency_score, effort_minutes, auto_scheduled_at, scheduled_start, scheduled_end, context, ai_recommendation, status, related_entity_type, related_entity_id, completed_at, snoozed_until, created_at, updated_at`

## Column Mismatches Found

| Wrong column used | Correct column | Where |
|---|---|---|
| `source_id` | `related_entity_id` | 2 edge functions |
| `source_type` | `related_entity_type` | 2 edge functions |
| `priority` (string) | `priority_score` (number) | 2 edge functions |
| `source` | `related_entity_type` | MeetingInsights.tsx |
| `due_date` | `scheduled_end` | useCRMPilotIntegration.ts |

## Files to Fix

### 1. `supabase/functions/check-stalled-candidates/index.ts`
- Line 49: `.eq("source_id", app.id)` -> `.eq("related_entity_id", app.id)`
- Line 66: `priority: "high"` -> `priority_score: 90`
- Lines 68-69: `source_type`/`source_id` -> `related_entity_type`/`related_entity_id`

### 2. `supabase/functions/check-missing-meeting-data/index.ts`
- Line 69: `.eq("source_id", booking.id)` -> `.eq("related_entity_id", booking.id)`
- Line 77: `priority: "medium"` -> `priority_score: 60`
- Lines 79-80: `source_type`/`source_id` -> `related_entity_type`/`related_entity_id`

### 3. `src/pages/MeetingInsights.tsx`
- Line 129: `source: 'meeting_insights'` -> `related_entity_type: 'meeting'`
- Add: `related_entity_id: meetingId`

### 4. `src/hooks/useCRMPilotIntegration.ts`
- Line 46: `due_date: ...` -> `scheduled_end: ...`

### 5. Deploy updated edge functions
- `check-stalled-candidates`
- `check-missing-meeting-data`

## Impact
- Eliminates the flood of database errors currently filling logs
- Fixes task creation from meeting insights and CRM flows that currently silently fail
- Fixes duplicate-detection queries in both edge functions that currently error out (meaning they create duplicates every time they run)
