

# Task System Brutal Audit — Score: 72/100

## Scoring Breakdown

| Area | Score | Max | Issue |
|------|-------|-----|-------|
| Database schema & migration | 8 | 10 | Solid FKs, indexes, trigger. Missing: `task_number` auto-generation (inserts empty string `''`) |
| RLS policies | 6 | 10 | Partner INSERT policy requires `job_id IS NOT NULL` — partners cannot create non-job tasks. No SELECT policy for partners to see tasks on their company's jobs |
| Context architecture | 4 | 10 | `UnifiedTasksContext` loads tasks but `UnifiedTaskBoard` has its OWN `loadTasks` that ignores the context entirely — two parallel data flows, context is effectively dead weight for the board view |
| Realtime | 5 | 10 | Realtime enabled on `unified_tasks`, used in `JobTasksPanel` only. Main task board has ZERO realtime — stale until manual refresh |
| Task board UI | 6 | 10 | Board has its own fetch, no job/company data in its query (missing joins), `TaskCardCompact` badges exist but data is never loaded by the board query |
| Job Dashboard integration | 8 | 10 | `JobTasksPanel` is solid with realtime + mutations. Task count badge works |
| Partner flow | 6 | 10 | `PartnerTaskRequestDialog` assigns to all admins (good). But partners cannot SEE their submitted tasks — no SELECT RLS policy for partner-created tasks |
| Notification system | 6 | 10 | DB trigger works for assignment. No notification for: task status changes, task completion, approaching due dates, partner request acknowledged |
| Detail sheet | 7 | 10 | `useQuery` refactored, job/company block with deep link. Missing: edit capabilities (can only change status, not title/description/priority/due date) |
| Create dialog | 6 | 10 | Job linking works, auto-objective creation works. Still 711 lines. Job dropdown fetches but doesn't search/filter |
| Code quality | 5 | 10 | Duplicate `UnifiedTask` interface in `UnifiedTaskBoard.tsx` (lines 36-59) vs context. Board ignores context's `filteredTasks`. `EnhancedTaskCard` uses `(task as any).job` cast |
| Search & filtering | 5 | 10 | `useTaskSearch` exists but is disconnected — never used by the board. `TasksCommandBar` has search but only filters client-side by title. No job/company filter option |

---

## Critical Bugs Found

### 1. UnifiedTaskBoard has its own parallel data loading (Impact: CRITICAL)
`UnifiedTaskBoard.tsx` lines 120-146 has a completely independent `loadTasks()` function that queries `unified_tasks` directly — it does NOT use the context's `filteredTasks` or `tasks`. The context's `board_id` filtering, job/company joins, and search filters are ALL bypassed. The board loads ALL tasks (no `board_id` filter) and has no job/company joins in its select.

This means:
- Board shows tasks from ALL boards, not just the current one
- Job/company badges on `TaskCardCompact` render nothing (data never fetched)
- Context search/filters have no effect on what the board displays

### 2. `task_number` inserted as empty string (Impact: HIGH)
Every task creation path inserts `task_number: ''`. There's no auto-generation trigger or function. Task numbers display as blank in the UI.

### 3. Partner RLS gap (Impact: HIGH)
Partners can INSERT tasks (via the `partners_insert_tasks_for_company_jobs` policy) but there is no matching SELECT policy for partners. They submit a task request and then cannot see it. The existing SELECT policy requires `auth.uid() = user_id OR assigned OR admin`, and partner-created tasks have `user_id` set to the admin, not the partner.

### 4. `EnhancedTaskCard` casts `(task as any).job` (Impact: MEDIUM)
The card receives a typed `UnifiedTask` from context but casts to `any` to access `.job` and `.company`. This works, but is fragile and the type should include these fields.

### 5. No realtime on main task board (Impact: MEDIUM)
`JobTasksPanel` has realtime. The main `UnifiedTaskBoard` has zero realtime subscription. When another user creates/completes a task, it doesn't appear until page refresh.

---

## Improvement Plan (72 to 100)

### Phase 1: Fix Critical Architecture (72 to 85)

1. **Rewrite `UnifiedTaskBoard` to consume context data** — Remove its independent `loadTasks`. Use `filteredTasks` from `useUnifiedTasks()`. Add job/company joins to the context query (already there). Add dependency/subtask/comment counts as a secondary enrichment query in the context or as a separate hook.

2. **Add `board_id` filter to `UnifiedTaskBoard`'s data** — Already in context's `loadTasks` but the board bypasses it. Fix by consuming context.

3. **Fix `task_number` auto-generation** — Create a DB trigger `BEFORE INSERT ON unified_tasks` that generates a sequential task number like `TASK-001`.

4. **Fix partner SELECT RLS** — Add policy: partners can SELECT tasks where `created_by = auth.uid()` OR where `job_id` belongs to a job at their company.

### Phase 2: Intelligence Layer (85 to 93)

5. **Add realtime to main task board** — Subscribe to `unified_tasks` changes scoped to the current `board_id`, invalidate context on changes.

6. **Expand notification triggers** — Add notifications for: task status changed to `completed`, task approaching due date (within 24h), partner request acknowledged (status changed from pending).

7. **Add job/company filter to `TasksCommandBar`** — Allow filtering the board by job or company, using the data already joined in context.

8. **Make detail sheet editable** — Allow inline editing of title, description, priority, and due date from the detail sheet, not just status.

### Phase 3: Polish to 100 (93 to 100)

9. **Remove duplicate `UnifiedTask` interface** from `UnifiedTaskBoard.tsx` — use the one from context.

10. **Remove `(task as any)` casts** in `EnhancedTaskCard` — the `UnifiedTask` type already has `job` and `company`.

11. **Add task number display** in creation success toast and partner request confirmation.

12. **Add activity log** — When a task status changes, insert into an `activity_log` or `task_activity` table for audit trail visibility in the detail sheet.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/unified-tasks/UnifiedTaskBoard.tsx` | Remove parallel loadTasks, consume context, add realtime |
| `src/contexts/UnifiedTasksContext.tsx` | Add enrichment (dep counts, subtask counts, comment counts) |
| `src/components/unified-tasks/EnhancedTaskCard.tsx` | Remove `as any` casts |
| `src/components/unified-tasks/UnifiedTaskDetailSheet.tsx` | Add inline editing for title, description, priority, due date |
| `src/components/unified-tasks/TasksCommandBar.tsx` | Add job/company filter controls |
| Migration SQL | Auto-generate `task_number`, partner SELECT RLS, due-date notification trigger |

