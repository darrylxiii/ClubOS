
# Migrate all `/unified-tasks` references to `/tasks`

## What changes

Every occurrence of the route string `/unified-tasks` across the codebase gets replaced with `/tasks`. Component file imports (from `@/components/unified-tasks/...`) stay as-is since those are internal file paths, not URL routes.

## Files to edit (6 files, route strings only)

| File | Line(s) | Change |
|---|---|---|
| `src/routes/shared.routes.tsx` | 76 | `path="/unified-tasks"` to `path="/tasks"` |
| `src/config/navigation.config.ts` | 122 | `path: "/unified-tasks"` to `path: "/tasks"` |
| `src/components/CommandPalette.tsx` | 70 | `path: "/unified-tasks"` to `path: "/tasks"` |
| `src/contexts/NavigationHistoryContext.tsx` | 34 | `'/unified-tasks': 'Tasks'` to `'/tasks': 'Tasks'` |
| `src/components/ai/AIPageCopilot.tsx` | 102 | `case '/unified-tasks':` to `case '/tasks':` |
| `src/pages/UnifiedTasks.tsx` | 412 | `currentPage="/unified-tasks"` to `currentPage="/tasks"` |
| `src/pages/ObjectiveWorkspace.tsx` | 87, 264 | Two `navigate("/unified-tasks")` calls to `navigate("/tasks")` |

## What stays the same

- All component **file imports** like `from "@/components/unified-tasks/..."` remain unchanged -- those are folder paths, not URLs
- The `AdminTasksWidget` already links to `/tasks` -- no change needed
- The `useTaskCompletion` hook uses query key `"unified-tasks"` (React Query cache key, not a URL) -- no change needed
