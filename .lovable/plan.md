
# /tasks Deep Audit -- Current Score: 62/100

## What you have (strong foundation)

| Feature | Status | Notes |
|---|---|---|
| Kanban board with DnD | Done | 4 columns, drag between statuses |
| List view | Done | Grouped by today/upcoming/unscheduled |
| Calendar view | Done | 7-day forward only, very basic |
| Create task dialog | Done | Full form with assignees, deps, objectives |
| Quick add (Cmd+K) | Done | Natural language parsing for priority/dates |
| Task detail dialog | Done | Overview, subtasks, comments tabs |
| Subtasks | Done | Add/toggle inside detail dialog |
| Comments (realtime) | Done | Threaded with realtime subscription |
| Time tracking | Done | Start/stop timer, tracked minutes |
| Attachments | Done | Upload to storage, delete own files |
| Labels | Done | Create, assign, color-coded |
| Recurring tasks | Done | Daily/weekly/monthly with end date |
| Dependencies | Done | Blocking and blocked-by relationships |
| Activity log | Done | Timeline of changes per task |
| Inline editing | Done | Title and description |
| Bulk actions | Done | Multi-select, bulk status/priority/delete |
| Search and filters | Done | Text search, status, priority, date range |
| Analytics | Done | Summary cards, burndown, team workload, pie/bar charts |
| Task boards (multi-board) | Done | Personal/shared/company, member management |
| Objectives integration | Done | Tasks linked to OKR-style objectives |
| Completion feedback | Done | Debrief modal with difficulty/time/blockers |
| AI scheduling | Done | Auto-schedule edge function |
| Toolbar with view switcher | Done | Board/list/calendar/analytics modes |

## What the top 0.1% have that you are missing (38 points to gain)

### Tier 1: Critical gaps (-20 points)

**1. No keyboard navigation or shortcuts beyond Cmd+K** (-4 pts)
- Linear has: arrow keys to navigate tasks, `x` to select, `s` to set status, `p` for priority, `l` for labels, `Enter` to open detail
- Your system: only Cmd+K for quick add, everything else is mouse-only

**2. Calendar is 7-day forward-only, no month view, no drag-to-reschedule** (-4 pts)
- Your calendar shows 7 columns of the next 7 days with no navigation, no month/week toggle, no ability to drag tasks between days
- Linear/Asana: full month view, week view, drag tasks to reschedule, click empty slot to create

**3. No undo for destructive actions** (-3 pts)
- Completing, deleting, or status-changing a task has no undo
- Linear/Notion: "Undo" toast with 5-second window after every mutation

**4. Board does N+1 queries for dependencies** (-3 pts)
- `UnifiedTaskBoard.tsx` line 137-158: fires a separate query per task to count dependencies
- 50 tasks = 100 extra queries. This will become unusable at scale

**5. No empty states with context** (-2 pts)
- Board columns show "Drop tasks here" but no CTA to create a task in that column
- List empty state exists but is generic

**6. Loading states are text-only, no skeletons** (-2 pts)
- Board: "Loading tasks..." text
- List: "Loading tasks..." text
- Calendar: "Loading calendar..." text
- No shimmer/skeleton cards matching the real layout

**7. No task templates** (-2 pts)
- Every task starts from scratch
- Linear/Asana: save and reuse task templates with pre-filled fields

### Tier 2: UX polish gaps (-12 points)

**8. Detail dialog is not a full page or slide-over** (-2 pts)
- Current: 700px modal that blocks interaction with the board
- Linear: side panel that lets you still see the board; or full-page task view with URL

**9. No multi-sort or saved views/filters** (-2 pts)
- Can filter by status/priority/date but cannot save filter presets ("My overdue tasks", "High priority unassigned")
- No sort-by option (due date, priority, created, alphabetical)

**10. No @mentions in comments** (-1 pt)
- Comments are plain text with no ability to tag team members

**11. No drag-to-reorder within columns** (-1 pt)
- DnD only works between columns (status change), not for manual ordering within a column

**12. Card doesn't show subtask progress or comment count** (-1 pt)
- `UnifiedTaskCard` has TODO comments for subtask and comment counts (lines 35-36)
- These are hardcoded to 0

**13. No "My Tasks" filtered view** (-1 pt)
- No quick toggle to see only tasks assigned to the current user

**14. Board doesn't remember scroll position or last view** (-1 pt)
- Switching tabs reloads; no URL sync for active tab

**15. Calendar tasks are not clickable to open detail** (-1 pt)
- Calendar task items have `cursor-pointer` but no onClick handler

**16. No due date reminder / notification system** (-1 pt)
- Tasks can be overdue with no proactive nudge beyond dashboard widget

**17. Objective filter uses horizontal scroll of buttons, not a dropdown** (-1 pt)
- With many objectives, this becomes unusable

### Tier 3: Advanced features (-6 points)

**18. No Gantt / timeline view** (-2 pts)
- Top-tier PM tools all offer a timeline/Gantt showing task durations and dependencies visually

**19. No task import/export** (-1 pt)
- No CSV export, no bulk import

**20. No task estimation vs actual comparison** (-1 pt)
- `estimated_duration_minutes` exists but is never compared to `time_tracked_minutes` in analytics

**21. No "cancelled" status column** (-1 pt)
- STATUS_COLUMNS only has pending/in_progress/on_hold/completed -- no cancelled

**22. No dark mode polish for task cards** (-1 pt)
- Some hard-coded color values don't adapt well to dark mode

---

## The Plan: 62 to 100

### Phase 1: Performance and reliability (62 to 72)

| Item | Points | Work |
|---|---|---|
| Fix N+1 dependency queries -- use a single aggregated query or RPC | +3 | Rewrite `loadTasks` in board to join counts in one query |
| Add skeleton loading states for board, list, calendar | +2 | Create `TaskCardSkeleton`, use in all three views |
| Add undo toasts for complete/delete/status changes | +3 | `sonner` already supports `toast.dismiss` + undo callback pattern |
| Column empty states with "Add task" CTA that pre-fills status | +2 | Small UI tweak in board column rendering |

### Phase 2: Keyboard-driven UX (72 to 80)

| Item | Points | Work |
|---|---|---|
| Keyboard navigation on board/list (arrow keys, enter, x, s, p) | +4 | Add `useTaskKeyboardNav` hook with focus management |
| Full calendar with month/week toggle, prev/next, drag-to-reschedule | +4 | Replace basic 7-day grid with a proper calendar component |

### Phase 3: UX polish (80 to 90)

| Item | Points | Work |
|---|---|---|
| Task detail as a slide-over panel (not blocking modal) | +2 | Use `Sheet` from radix instead of `Dialog` |
| Saved views / filter presets | +2 | Persist named filter combos to local storage or DB |
| Subtask progress + comment count on cards | +1 | Include counts in the board query |
| My Tasks quick filter toggle | +1 | Button in toolbar that filters by current user |
| URL-synced active tab (board/list/calendar/analytics) | +1 | Sync `activeTab` with search params |
| Calendar items clickable to open detail | +1 | Add onClick to calendar task items |
| Objective filter as dropdown (not horizontal scroll) | +1 | Replace button row with Select/Combobox |
| Drag-to-reorder within columns | +1 | Use `@dnd-kit/sortable` within each column |

### Phase 4: Advanced (90 to 100)

| Item | Points | Work |
|---|---|---|
| @mentions in comments | +1 | Autocomplete dropdown in comment textarea |
| Estimation vs actual analytics chart | +1 | New chart in analytics comparing estimated vs tracked time |
| Cancelled status column (toggleable) | +1 | Add to STATUS_COLUMNS, optionally hidden |
| Task templates (save/load) | +2 | New `task_templates` table + "Create from template" option |
| Timeline/Gantt view | +2 | New tab with horizontal timeline using task dates + dependencies |
| CSV export | +1 | Download button in toolbar |
| Due date reminders | +1 | Background check + toast/notification for tasks due today |
| Dark mode card polish | +1 | Audit all hardcoded colors, use CSS variables |

---

## Recommended implementation order

Start with **Phase 1** (performance/reliability) -- these are bugs and debt that affect trust. Then **Phase 2** (keyboard nav + calendar) which are the two highest-impact UX upgrades. Phase 3 is polish. Phase 4 is differentiation.

Each phase is independently deployable and testable.

## Technical notes

- The N+1 fix can use a Postgres function or a view that pre-aggregates dependency counts
- Keyboard navigation should use a focus context provider so it works across board/list views
- The calendar upgrade can wrap `react-day-picker` (already installed) for month navigation and overlay task dots
- Saved views can start with localStorage and graduate to a `saved_task_views` table later
- The slide-over pattern uses Radix `Sheet` which is already in the UI library
- Timeline/Gantt can use a custom SVG or a lightweight library; no heavy dependency needed
