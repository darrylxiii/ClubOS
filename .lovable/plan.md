

# /tasks Page UI/UX Revamp -- Billion-Dollar Upgrade

## Problems Identified

1. **Objectives section dominates the page** -- Full 4-column Kanban board with large cards takes up the entire viewport before you even see tasks. This is backwards; tasks are the daily driver, objectives are context.
2. **Board columns are oversized** -- Each column is `min-w-[300px]` with large cards (`p-6`, `text-lg` headers), wasting space. Five columns overflow horizontally.
3. **Page has too many stacked sections** -- Header, Objectives (with its own tabs), Board Navigation bar, Board Context Header, Objective filter dropdown, Task Toolbar, Task view tabs -- that is 7 vertical layers before the first task card.
4. **Board Navigation and Context Header are bulky** -- `BoardNavigationBar` (type filter buttons + board pills) and `BoardContextHeader` (56px icon, 2xl title, stats, actions) together consume ~200px of vertical space.
5. **Task cards lack dependency intelligence** -- `blockingCount` and `blockedByCount` are fetched but never rendered on the card. This is the most critical missing signal for prioritization.
6. **No visual urgency system** -- Overdue tasks look the same as future tasks. No red glow, no sorting by urgency, no "needs attention" grouping.
7. **Redundant toolbars** -- The board has its own "Group By" toolbar inside, plus the page-level `TaskToolbar`, plus the view tabs. Three control surfaces.
8. **List view is too basic** -- Simple checkbox + title + badge. No dependency info, no progress indicators, no inline status cycling.

## The Plan

### 1. Restructure Page Layout (Collapse the Chrome)

**Merge header, board context, and controls into a single compact command bar:**

- Remove the separate `BoardNavigationBar` and `BoardContextHeader` sections
- Create a new `TasksCommandBar` component: one horizontal bar with:
  - Left: Board selector (dropdown, not pill list), board name + icon
  - Center: Search input (always visible)
  - Right: View tabs (icon-only toggle group), New Task button, settings gear
- This replaces ~200px of vertical chrome with a single 48px bar

**Collapse Objectives into a collapsible summary strip:**

- Replace the full Objectives Board/List tabs section with a `CollapsedObjectivesSummary`:
  - Single horizontal row showing objective pills (name + progress %) 
  - Click an objective pill to filter tasks by it (replaces the separate dropdown)
  - Small expand arrow to open the full objectives board in a Sheet/drawer (not inline)
- This converts ~400px of objectives content into a ~48px summary row

### 2. Redesign Task Cards (Compact + Intelligence)

**New `TaskCardCompact` replacing current `UnifiedTaskCard`:**

- Reduce padding from `p-4` to `p-3`
- Single-line layout for priority + title + task number (no stacked sections)
- Show dependency indicators prominently:
  - Red lock icon with count if task is blocked (`blockedByCount > 0`)
  - Amber chain icon with count if task is blocking others (`blockingCount > 0`)
  - Green checkmark if no blockers and ready to work
- Overdue visual treatment: left border turns red, subtle red background tint
- Subtask progress shown as a thin inline progress bar (not just text)
- Comment count as a small icon + number
- Remove the large avatar stack; show single avatar or initials dot
- Total card height target: ~72px (down from ~120px)

### 3. Board Column Redesign

- Remove `min-w-[300px]` constraint; use fluid `flex-1` columns
- Compact column headers: icon + label + count in a single 36px row
- Remove the colored background tints on columns; use subtle top-border accent only
- Column content area: reduce `min-h-[400px]` to `min-h-[200px]`
- Add column task count summary: "3 blocked, 2 ready" inline text

### 4. Add Urgency-Based Smart Sorting

Inside each board column, sort tasks by computed urgency:

```text
urgency = (isOverdue ? 100 : 0)
        + (blockedByCount > 0 ? -50 : 0)   // blocked tasks sink
        + (blockingCount * 10)              // blocking tasks rise  
        + (priority === 'high' ? 30 : priority === 'medium' ? 15 : 0)
        + (daysUntilDue <= 2 ? 20 : daysUntilDue <= 7 ? 10 : 0)
```

Tasks that block others and are high priority should float to the top with a visual "Unblock this first" indicator.

### 5. Upgrade List View

- Convert to a table-like dense layout with columns: Status, Priority, Title, Due, Blockers, Assignee, Progress
- Each row is ~40px tall (compact)
- Inline status badge that cycles on click (not a checkbox toggle)
- Show blocking/blocked counts with colored indicators
- Sort by urgency score by default

### 6. Unified Toolbar Consolidation

- Merge the board's "Group By" toolbar into the main `TaskToolbar`
- Remove the separate `TabsList` for view switching (already in toolbar)
- Single control surface: Search | Filters | View Mode | Group By | Actions
- This eliminates one entire toolbar row

### 7. Visual Polish for Luxury Aesthetic

- Cards: `bg-card` with `border-border/20`, no `backdrop-blur-md` (performance)
- Use `border-l-2` color accents instead of full background tints
- Priority colors: use the dot/pip pattern (small colored circle) instead of full badges
- Muted, professional typography: `text-sm` for titles, `text-xs` for metadata
- Hover states: subtle `border-primary/30` transition, no `translate-y` bounce
- Remove `rotate-2` on drag overlay (unprofessional)

---

## Technical Breakdown

### New Files
- `src/components/unified-tasks/TasksCommandBar.tsx` -- Merged header/board/controls
- `src/components/unified-tasks/CollapsedObjectivesSummary.tsx` -- Objective pills strip
- `src/components/unified-tasks/TaskCardCompact.tsx` -- Redesigned compact card

### Modified Files
- `src/pages/UnifiedTasks.tsx` -- Remove objectives section, board nav, context header; replace with CommandBar + ObjectivesSummary; consolidate tabs
- `src/components/unified-tasks/UnifiedTaskBoard.tsx` -- Use compact cards, remove internal toolbar, add urgency sorting, fluid columns
- `src/components/unified-tasks/UnifiedTaskCard.tsx` -- Replace with compact design showing blockers/urgency
- `src/components/unified-tasks/UnifiedTasksList.tsx` -- Dense table layout with blocker columns
- `src/components/unified-tasks/TaskToolbar.tsx` -- Add Group By control, remove redundant view switcher

### No Database Changes Required

All data (blockingCount, blockedByCount, due_date, priority) is already fetched. This is purely a UI/UX restructuring.

## Implementation Order

1. **TasksCommandBar + page restructure** (biggest visual impact, removes chrome bloat)
2. **TaskCardCompact with dependency indicators** (makes the board actually useful)
3. **Urgency sorting** (smart defaults)
4. **CollapsedObjectivesSummary** (moves objectives out of the way)
5. **List view upgrade** (dense table)
6. **Toolbar consolidation** (final cleanup)
7. **Visual polish pass** (luxury aesthetic alignment)

Each step is independently shippable and the page improves progressively.

