

# Link Quick Task to the Unified Task System

## Overview

The radial menu's Quick Task currently writes to a separate `pilot_tasks` table that has no connection to the Task Board. This plan rewires it so every quick task lands in the real `unified_tasks` table, assigns you by default, and provides a one-click "Expand" button to open the full task creation dialog where you can add assignees, link to objectives/projects, set dependencies, etc.

## How It Will Work

```text
Right-click --> Quick Task wedge
         |
         v
+-------------------------------+
| Quick Task           [Expand] |
| [What needs to be done?     ] |
| [Low] [Med] [High]           |
| [Create Task]                 |
+-------------------------------+
         |                  |
    "Create Task"       "Expand"
         |                  |
         v                  v
  INSERT into          Close quick dialog,
  unified_tasks        open full
  + auto-assign        CreateUnifiedTaskDialog
  to yourself          with title & priority
                       pre-filled
```

## Changes

### 1. `src/components/clubpilot/QuickTaskDialog.tsx` (rewrite)

- **Replace `pilot_tasks` insert with `unified_tasks`**: insert with `title`, `priority`, `status: "pending"`, `task_type: "general"`, `scheduling_mode: "manual"`, `user_id`, `created_by`, `task_number: ""`.
- **Auto-assign to self**: after creating the task, insert a row into `unified_task_assignees` with the current user.
- **Add `onExpand` callback prop**: new optional prop `onExpand?: (title: string, priority: string) => void`.
- **Expand button**: add a small icon button (Maximize2 icon) in the dialog header next to the title. Clicking it calls `onExpand(currentTitle, currentPriority)` and closes the quick dialog.

### 2. `src/hooks/useRadialMenu.ts` (add full-task state)

- Add to state: `showFullTask: boolean`, `fullTaskTitle: string`, `fullTaskPriority: string`.
- Add `openFullTask(title, priority)` callback — sets `showFullTask: true` and stores title/priority.
- Add `closeFullTask()` callback — resets back.
- Return these new values from the hook.

### 3. `src/components/ui/radial-menu-provider.tsx` (render full dialog)

- Import `CreateUnifiedTaskDialog`.
- Destructure new `showFullTask`, `fullTaskTitle`, `fullTaskPriority`, `openFullTask`, `closeFullTask` from the hook.
- Pass `onExpand` to `QuickTaskDialog` that calls `closeQuickTask()` then `openFullTask(title, priority)`.
- Render `CreateUnifiedTaskDialog` with `open={showFullTask}`, `onOpenChange`, `initialTitle`, `initialPriority`, `objectiveId={null}`, wrapping an empty `<span />` as children.

### No database changes needed

The `unified_tasks` and `unified_task_assignees` tables already exist with all required columns.

