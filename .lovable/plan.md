
# Admin Action Items Widget

## What it does

A high-impact task widget for the **Admin Home** dashboard that surfaces the most urgent and important tasks from the admin's Task Board. Uses behavioral psychology to maximize task completion directly from the dashboard.

## Psychological triggers baked in

- **Loss aversion**: Overdue tasks shown first with red "2d overdue" labels -- framing what's being lost
- **Progress momentum**: Completion streak counter ("3 done today") triggers the endowment effect
- **Micro-commitment**: One-click complete button directly in the widget -- zero friction, no navigation
- **Accountability**: Assignee avatars (using the multi-source resolver we just built) show who's watching
- **Zeigarnik effect**: Incomplete tasks displayed front-and-center keep them top of mind
- **Scarcity framing**: "Due today" and "Due tomorrow" labels create urgency without aggression

## What each task row shows

- Circle-check button (completes task inline with optimistic update)
- Task title (single line, truncated)
- Assignee avatar stack (from `useAttendeeProfiles` -- real photos where available)
- Priority badge (high = red, medium = amber, low = blue)
- Due date label with urgency coloring ("2d overdue" in red, "Due today" in amber, "Due Thu" in muted)

## Widget header

- "Action Items" title with Target icon
- Completion streak badge ("2 done today" in emerald) when count > 0

## Widget footer

- "Open Task Board" link to `/tasks`

## Data

- Queries `unified_tasks` joined with `unified_task_assignees` for the current user
- Filters: status NOT in `completed` or `cancelled`
- Sort: overdue first, then by due date ascending, then by priority
- Limit: 7 tasks
- Separate count query for tasks completed today (streak)
- Inline complete: updates `status = 'completed'` and `completed_at = now()`, removes row optimistically

## Placement in Admin Home

Inserted into **Zone 3** (Operations Grid) alongside the `ActiveMeetingsWidget`, replacing `LiveOperationsWidget` to the row below. This puts tasks at a high-visibility position right after metrics.

```
Zone 3 row 1: TeamCapacityWidget | PartnerEngagementWidget
Zone 3 row 2: AdminTasksWidget   | ActiveMeetingsWidget
Zone 3 row 3: LiveOperationsWidget (full width or paired)
```

## Files

| File | Action |
|---|---|
| `src/components/clubhome/AdminTasksWidget.tsx` | Create -- urgency-sorted task widget with inline completion and streak counter |
| `src/components/clubhome/AdminHome.tsx` | Edit -- import and place AdminTasksWidget in Zone 3 alongside ActiveMeetingsWidget |
