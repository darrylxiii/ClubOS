

# Task System Audit - Score: 62/100

## What Works Well (Earned Points)

| Area | Score | Notes |
|------|-------|-------|
| Database migration | 8/10 | Clean FK additions, indexes, proper `ON DELETE SET NULL` |
| Notification trigger | 7/10 | Smart DB trigger approach, skips self-assignment, includes job context |
| JobTasksPanel | 7/10 | Uses `useQuery` (good), tabs, role-based buttons, clean UI |
| PartnerTaskRequestDialog | 6/10 | Works, but assigns to only 1 admin (fragile) |
| JobCard task summary | 7/10 | Lightweight query, clean display |
| Job Dashboard integration | 8/10 | Tab added properly, passes context correctly |
| Auto-objective creation | 7/10 | Deduplicates, creates on-the-fly, links to job |

## Critical Issues Found

### 1. UnifiedTasksContext IGNORES `job_id` entirely (Impact: HIGH)
`loadTasks()` only filters by `objective_id`. There is no `job_id` filter parameter. Tasks created from the Job Dashboard with a `job_id` will load fine in `JobTasksPanel` (which uses its own `useQuery`), but the main task board context has zero awareness of job/company linkage. No way to filter the task board by job.

### 2. No `board_id` filtering in `loadTasks` (Impact: HIGH)
The context loads ALL tasks for the user regardless of which board is selected. `currentBoard` is used only at creation time. The task board UI likely shows every task across all boards.

### 3. Partner RLS policy blocks non-job tasks (Impact: MEDIUM)
The new `partners_insert_tasks_for_company_jobs` policy requires `job_id IS NOT NULL`. If there are no other INSERT policies for partners, they can ONLY create tasks linked to jobs. General task creation would fail silently with RLS violation.

### 4. `PartnerTaskRequestDialog` assigns to only 1 admin with `LIMIT 1` (Impact: MEDIUM)
Uses `LIMIT 1` with no ordering, so it picks a random admin. If that admin is inactive or on vacation, the task is orphaned. No fallback, no round-robin, no notification to multiple admins.

### 5. `notify-task-assignment` edge function was never created (Impact: LOW)
The plan called for it, but the DB trigger handles it directly. The edge function referenced in the plan doesn't exist. Not a bug since the trigger covers it, but the plan was misleading. The trigger-based approach is actually better.

### 6. `CreateUnifiedTaskDialog` is 690 lines, no `useQuery` (Impact: MEDIUM)
Uses raw `useState` + manual `supabase.from()` calls for profiles, objectives, projects, and tasks. Violates the project's modern fetching standards. No caching, no deduplication, no error boundaries.

### 7. No "Link to Job" dropdown in the task board create dialog (Impact: MEDIUM)
The plan specified: "Add a 'Link to Job' dropdown (fetches jobs from `job_listings`) when creating from the task board." This was not implemented. Users can only link tasks to jobs when creating from the Job Dashboard.

### 8. Task board does not show job/company context (Impact: MEDIUM)
Tasks on the board don't display which job or company they belong to. No visual indicator, no grouping.

### 9. `QuickTaskDialog` was not updated (Impact: LOW)
Plan called for `job_id` pass-through support in `QuickTaskDialog`. Not done.

### 10. No task count badge on the Tasks tab (Impact: LOW)
Plan specified "Show task count badge on the tab." The tab exists but has no count badge like Reviews and Rejected do.

---

## Improvement Plan

### Phase 1: Fix Critical Gaps
1. **Add `board_id` and `job_id` filtering to `UnifiedTasksContext.loadTasks()`** - filter tasks by `currentBoard?.id` so the board view only shows relevant tasks
2. **Add task count badge to the Tasks tab** in `JobDashboard.tsx` (quick win, uses existing query)
3. **Fix partner RLS** - ensure existing INSERT policies still apply for non-job tasks, or add a fallback policy

### Phase 2: Improve Quality
4. **Add "Link to Job" dropdown** in `CreateUnifiedTaskDialog` when opened from the task board (not pre-filled with jobId)
5. **Show job/company badges on task cards** in the board view so users know which tasks belong to which jobs
6. **Refactor `CreateUnifiedTaskDialog`** to use `useQuery` for profiles, objectives, projects (from 690 lines to ~400)
7. **Improve partner task assignment** - assign to all admins or use a configurable assignment strategy, notify multiple people

### Phase 3: Polish
8. **Update `QuickTaskDialog`** to support `job_id` pass-through
9. **Add task progress to job list view** (not just `JobCard` in partner view, but also the admin jobs list)
10. **Add realtime subscription** for job tasks so the `JobTasksPanel` updates live when tasks change

