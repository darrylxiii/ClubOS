

# Task System: 85 → 100/100 — Final Polish

## Changes

### 1. Job/Company badges on task cards (4 pts)

**`TaskCardCompact.tsx`** — Add a small job/company badge in the meta line (after priority dot, before dependency indicators):
```tsx
{task.job && (
  <span className="inline-flex items-center gap-0.5 text-primary/70 font-medium truncate max-w-[80px]">
    <Briefcase className="h-2.5 w-2.5" />
    {task.job.title}
  </span>
)}
```

**`EnhancedTaskCard.tsx`** — Add a job/company badge row between Labels and Footer sections, showing job title and company name as small badges.

### 2. Job/Company block in task detail sheet (3 pts)

**`UnifiedTaskDetailSheet.tsx`** — Add a Job/Company info block between Objective and Project sections. Uses `task.job` and `task.company` data (already on the interface). Links to `/job-dashboard/{jobId}`.

### 3. Realtime for JobTasksPanel (2 pts)

**`JobTasksPanel.tsx`** — Add a `useEffect` with a Supabase realtime channel subscription on `unified_tasks` filtered by `job_id`, invalidating `['job-tasks', jobId]` on any change.

**Migration** — `ALTER PUBLICATION supabase_realtime ADD TABLE public.unified_tasks;`

### 4. Refactor CreateUnifiedTaskDialog fetches to useQuery (3 pts)

**`CreateUnifiedTaskDialog.tsx`** — Replace the 5 manual `useState` + `useEffect` fetch patterns (profiles, objectives, projects, jobs list, board tasks) with `useQuery` hooks. This adds caching, deduplication, and reduces ~80 lines.

### 5. Refactor UnifiedTaskDetailSheet fetches to useQuery (2 pts)

**`UnifiedTaskDetailSheet.tsx`** — Replace the manual `loadTaskDetails` function (objective, project, dependencies, subtasks, owners) with 5 `useQuery` hooks keyed on `task.id`. Removes imperative `useState` patterns.

### 6. Admin jobs list task progress (1 pt)

Verify admin job list component — if it uses `JobCard`, it already has task progress. If not, add the same lightweight task count query.

## Files

| File | Change |
|------|--------|
| `src/components/unified-tasks/TaskCardCompact.tsx` | Add job/company badge |
| `src/components/unified-tasks/EnhancedTaskCard.tsx` | Add job/company badge |
| `src/components/unified-tasks/UnifiedTaskDetailSheet.tsx` | Add job link + refactor to useQuery |
| `src/components/job-dashboard/JobTasksPanel.tsx` | Add realtime subscription |
| `src/components/unified-tasks/CreateUnifiedTaskDialog.tsx` | Refactor fetches to useQuery |
| Migration SQL | Enable realtime on unified_tasks |

