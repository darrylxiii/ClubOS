

# Enterprise Task-Job Integration System

## Summary

Link the task system (`unified_tasks`) to jobs and companies, enable task creation from the Job Dashboard, auto-generate objectives per job, allow partners to request tasks, and send notifications on task assignment. This requires 1 database migration, 1 new edge function, ~6 new/modified components, and updates to existing contexts.

## Current State

- `unified_tasks` has `objective_id`, `project_id`, `board_id`, `company_name` (text) but **no `job_id` or `company_id` foreign keys**
- `club_objectives` exists with tasks linked via `objective_id` but no job relationship
- `notifications` table exists with `title`, `message`, `type`, `user_id`, `action_url`, `metadata`
- `CreateJobDialog` already creates a review task on job submission but uses `company_name` as text, not a FK
- No existing mechanism for partners to request admin tasks

---

## Step 1: Database Migration

Add `job_id` and `company_id` columns to `unified_tasks`, and `job_id` to `club_objectives`:

```sql
-- Link tasks to jobs
ALTER TABLE public.unified_tasks
  ADD COLUMN job_id UUID REFERENCES public.job_listings(id) ON DELETE SET NULL,
  ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX idx_unified_tasks_job_id ON public.unified_tasks(job_id);
CREATE INDEX idx_unified_tasks_company_id ON public.unified_tasks(company_id);

-- Link objectives to jobs
ALTER TABLE public.club_objectives
  ADD COLUMN job_id UUID REFERENCES public.job_listings(id) ON DELETE SET NULL,
  ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX idx_club_objectives_job_id ON public.club_objectives(job_id);
```

Update existing RLS policies to allow partners to INSERT tasks scoped to their company's jobs (via `company_members` lookup).

---

## Step 2: Auto-Create Objective When Job Task is Created

When a task is created with a `job_id`, check if an objective already exists for that job. If not, auto-create one titled "Tasks for [Job Title]" linked to the job and company. Then attach the task to that objective.

This logic lives in the task creation flow (`CreateUnifiedTaskDialog` and `QuickTaskDialog`).

---

## Step 3: Job Dashboard - Task Tab & Create Task Modal

**New component: `JobTasksPanel.tsx`** (in `src/components/job-dashboard/`)
- Shows all tasks linked to the current `job_id`
- Tabs: Pending | In Progress | Completed
- "Add Task" button opens a pre-filled `CreateUnifiedTaskDialog` with `job_id` and `company_id` set
- Partners see a "Request Task" variant that creates a task assigned to admins

**Integration in `JobDashboard.tsx`:**
- Add a "Tasks" tab alongside existing tabs (Activity, Analytics, etc.)
- Show task count badge on the tab

---

## Step 4: Job Card Task Summary

**Modify `JobCard.tsx`:**
- Add a small task summary line (e.g., "3/7 tasks done") fetched via a lightweight query
- Clicking it navigates to the Job Dashboard Tasks tab

---

## Step 5: Partner Task Request Flow

**New component: `PartnerTaskRequestDialog.tsx`**
- Simplified form: title, description, priority, optional due date
- On submit: creates a `unified_tasks` row with `job_id`, `company_id`, `task_type: 'partner_request'`
- Auto-assigns to the first available admin (via `user_roles` table)
- Inserts a notification for the admin

---

## Step 6: Task Assignment Notifications

**New edge function: `notify-task-assignment`**
- Triggered from client code whenever a task assignee is added
- Inserts into `notifications` table for each assignee:
  - Title: "You've been assigned a task"
  - Message: task title + job context
  - action_url: link to the task board or job dashboard
  - type: `task_assignment`
- Also handles partner request notifications to admins

**Database trigger (optional, in migration):**
- `AFTER INSERT ON unified_task_assignees` trigger that calls a function to insert into `notifications`

---

## Step 7: Update CreateUnifiedTaskDialog

- Add optional `job_id` and `company_id` props
- When a job is selected, auto-populate `company_id` from the job's company
- Add a "Link to Job" dropdown (fetches jobs from `job_listings`) when creating from the task board
- When `job_id` is provided (from Job Dashboard), auto-create/link the objective

---

## Step 8: Update UnifiedTasksContext

- Add `job_id` and `company_id` to the `UnifiedTask` interface
- Support filtering tasks by `job_id` in `loadTasks`
- Include job data in the select query for display purposes

---

## Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create - add `job_id`, `company_id` columns + trigger |
| `src/components/job-dashboard/JobTasksPanel.tsx` | Create |
| `src/components/job-dashboard/PartnerTaskRequestDialog.tsx` | Create |
| `supabase/functions/notify-task-assignment/index.ts` | Create |
| `src/pages/JobDashboard.tsx` | Modify - add Tasks tab |
| `src/components/partner/JobCard.tsx` | Modify - add task summary |
| `src/components/unified-tasks/CreateUnifiedTaskDialog.tsx` | Modify - add job/company linking |
| `src/contexts/UnifiedTasksContext.tsx` | Modify - add job_id to interface and queries |
| `src/components/clubpilot/QuickTaskDialog.tsx` | Modify - support job_id pass-through |

