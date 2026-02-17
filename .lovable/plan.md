
# Fix: "useTaskBoard must be used within a TaskBoardProvider"

## Root Cause

`TaskBoardProvider` is only rendered inside `src/pages/UnifiedTasks.tsx`, but components that call `useTaskBoard()` are used across the entire app:

- **`RadialMenuProvider`** (inside `AppLayout`, wraps all pages) renders `QuickTaskDialog` and `CreateUnifiedTaskDialog` -- both call `useTaskBoard()`
- **`FeedbackDatabase`** page renders `CreateUnifiedTaskDialog`

When any page other than `/tasks` loads, the provider is missing and the app crashes.

## Fix

Move `TaskBoardProvider` from `UnifiedTasks.tsx` into `ProtectedProviders.tsx` so it wraps the entire authenticated application. Then remove the now-redundant provider wrapper from `UnifiedTasks.tsx`.

---

## Changes

### 1. `src/contexts/ProtectedProviders.tsx`
- Import `TaskBoardProvider`
- Add it inside the provider tree (after `RoleProvider`, since it depends on `useAuth`)

### 2. `src/pages/UnifiedTasks.tsx`
- Remove `TaskBoardProvider` import
- Remove the two `<TaskBoardProvider>` wrappers (loading state and main render)
- The page content stays the same, it just no longer needs its own provider

---

## Files

| File | Action |
|------|--------|
| `src/contexts/ProtectedProviders.tsx` | Add `TaskBoardProvider` to the provider tree |
| `src/pages/UnifiedTasks.tsx` | Remove redundant `TaskBoardProvider` wrapper |
