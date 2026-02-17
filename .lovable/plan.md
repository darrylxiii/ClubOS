
# Ultimate Task Board UI/UX Revamp -- World-Class Execution

## Current Issues Identified

1. **Still too many vertical layers** -- CommandBar + Objectives strip + Toolbar (with search, view modes, actions) + Tabs bar = 4 distinct rows before the first task. Best-in-class boards (Linear, Notion, Asana) use 1-2 rows max.
2. **Duplicate view switcher** -- The `TaskToolbar` has its own Board/List/Calendar/Analytics toggle AND the page has a separate `TabsList` with 7 tabs. Two competing navigation systems.
3. **Toolbar is cluttered** -- SavedFilterPresets, CSVExport, TaskTemplates, SelectAll, Refresh, Keyboard hint all in one row with multiple Separators. Too many icon buttons without clear grouping.
4. **Board skeleton is oversized** -- `BoardColumnSkeleton` still uses `min-w-[300px]` and `min-h-[400px]`, contradicting the compact design.
5. **Task cards still feel amateur** -- The `TaskCardCompact` is better but still lacks visual hierarchy polish. Title and metadata lines have equal visual weight.
6. **List view grid template is fragile** -- Using `grid-cols-[auto_auto_1fr_auto_auto_auto_auto]` with 7 columns and hidden responsive ones is messy.
7. **No visual task count summary** -- No at-a-glance "12 tasks, 3 overdue, 5 blocked" summary anywhere on the page.
8. **Detail sheet is basic** -- The `UnifiedTaskDetailSheet` status/priority bar uses emoji (emoji for statuses) which feels cheap. Section spacing is inconsistent.
9. **Keyboard shortcuts bar is floating at bottom center** -- Takes up visual space permanently. Better as a dismissible tooltip or hidden until user presses `?`.
10. **No empty state design** -- Empty board columns have a minimal "No tasks" + tiny Add button. No illustration or helpful messaging.

## The Plan

### Phase 1: Merge All Chrome Into a Single Command Surface

**Goal**: Collapse CommandBar + Objectives + Toolbar + Tabs into 2 rows maximum.

**Row 1: Unified Command Bar** (~44px)
- Left: Board selector dropdown (existing) + task count summary badge ("42 tasks, 3 overdue")
- Center: Inline search input (replaces the separate `TaskSearchBar`)
- Right: View toggle (icon-only: Board | List | Calendar | Timeline | Analytics), Filter button, "My Tasks" toggle, "New Task" button

**Row 2: Context Strip** (~32px, conditional)
- Objective pills (existing `CollapsedObjectivesSummary` but slimmer)
- Active filter badges inline (moved from the separate filter display below toolbar)
- Bulk action bar (replaces the current one when selections are active)

**What gets removed**:
- The separate `TaskToolbar` component -- functionality absorbed into Row 1
- The separate `TabsList` with 7 triggers -- view modes in Row 1 toggle, AI/Team tabs become overflow menu items
- The floating keyboard shortcuts bar at the bottom -- replaced by `?` key trigger showing a small modal
- The duplicate view mode switcher inside TaskToolbar

### Phase 2: Elevate Task Card Design

**TaskCardCompact v2**:
- Add a subtle left-border color based on urgency score (red for urgent/overdue, amber for high priority, default for rest)
- Title: `text-[13px] font-medium leading-snug` (slightly larger than 10px meta, smaller than current)
- Task number: move to tooltip on hover instead of always visible (reduces noise)
- Assignee avatar: show on hover or when card is focused (not always -- reduces clutter for cards without assignees)
- Add a subtle "urgency glow" for overdue items: `shadow-[inset_0_0_0_1px_rgba(239,68,68,0.3)]`
- Progress bar for subtasks: keep, but make it 1px height instead of 2px (more refined)
- On hover: show a mini action row (status cycle dot, priority cycle, quick assign) -- eliminates need to open detail sheet for simple changes

### Phase 3: Board Column Polish

- Column headers: reduce to 28px height, icon + label + count only
- Remove the "blocked/ready" counts from column headers (too noisy at column level -- this info is on each card)
- Empty column: show a centered dashed border area with "Drop here" text (for drag target clarity)
- Column backgrounds: pure transparent with `border-t-2` accent only (already done but ensure consistency)
- Board grid: use `grid-cols-5` on desktop but allow collapsing "Done" and "Cancelled" into a single "Resolved" column on smaller screens

### Phase 4: List View Upgrade to Data Table

- Replace custom grid with a proper data table pattern
- Sticky header row
- Alternating row backgrounds (`even:bg-muted/5`) for readability
- Sort indicators on column headers (clickable to sort by that column)
- Row hover: show inline quick actions (change status, priority) without opening sheet
- Group-by support: allow grouping by status, priority, or assignee with collapsible section headers

### Phase 5: Detail Sheet Refinement

- Replace emoji in status select (`emoji Pending`) with colored dot + text
- Add a "Time in status" indicator (e.g., "In Progress for 3 days")
- Description: use markdown rendering (react-markdown is already installed)
- Dependencies section: add a visual mini-graph showing the dependency chain
- Add activity feed tab showing status changes, comments, and assignments chronologically

### Phase 6: Task Summary Statistics Bar

Add a compact stats row below the command bar showing:
- Total tasks | Overdue (red) | Blocked (amber) | In Progress | Completed today
- These are clickable to filter the view
- Uses semantic color coding (emerald for success, amber for urgency per brand guidelines)

### Phase 7: Micro-Interactions and Polish

- Card transitions: `transition-all duration-150` on hover (border color + shadow)
- Drag overlay: clean shadow, no rotation, scale to 1.02
- Column drop target highlight: subtle `ring-2 ring-primary/20` when dragging over
- Skeleton loading: match compact card sizes (not oversized old skeletons)
- Toast actions: ensure all mutations have undo capability
- Keyboard `?` shortcut: show a centered modal with all shortcuts, dismissible

## Technical Breakdown

### Modified Files
- `src/pages/UnifiedTasks.tsx` -- Major restructure: remove separate toolbar/tabs, integrate unified command bar, add stats row
- `src/components/unified-tasks/TasksCommandBar.tsx` -- Expand to include search, view toggle, filter trigger, new task button (absorb toolbar)
- `src/components/unified-tasks/TaskCardCompact.tsx` -- Hover actions, urgency glow, refined typography, task number on hover
- `src/components/unified-tasks/UnifiedTaskBoard.tsx` -- Simplified columns, better drag targets, remove internal toolbar
- `src/components/unified-tasks/UnifiedTasksList.tsx` -- Data table pattern with sticky header, sort, group-by
- `src/components/unified-tasks/UnifiedTaskDetailSheet.tsx` -- Remove emoji, add time-in-status, markdown description
- `src/components/unified-tasks/CollapsedObjectivesSummary.tsx` -- Slimmer, integrate active filters inline
- `src/components/unified-tasks/TaskCardSkeleton.tsx` -- Match new compact card sizes

### New Files
- `src/components/unified-tasks/TaskStatsBar.tsx` -- Compact statistics row with clickable filters
- `src/components/unified-tasks/KeyboardShortcutsModal.tsx` -- `?` triggered shortcuts reference

### Removed/Deprecated
- `src/components/unified-tasks/TaskToolbar.tsx` -- Functionality absorbed into `TasksCommandBar`
- `src/components/unified-tasks/TaskSearchBar.tsx` -- Search input moved inline into command bar

## Implementation Order

1. **TasksCommandBar expansion + page restructure** (merge all chrome, remove duplicate nav)
2. **TaskStatsBar** (at-a-glance metrics)
3. **TaskCardCompact v2** (hover actions, urgency visual system, refined typography)
4. **Board column polish + skeleton fix** (compact headers, better empty/drag states)
5. **List view data table** (sticky header, sort, alternating rows, group-by)
6. **Detail sheet refinement** (remove emoji, markdown, time-in-status)
7. **KeyboardShortcutsModal + micro-interactions** (final polish pass)

No database changes required. This is purely a UI/UX restructuring using existing data.
