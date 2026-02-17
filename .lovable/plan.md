
# Task Completion Feedback Modal -- Intelligence Capture System

## Overview

Every time a user marks a task as "completed" anywhere in the platform, a modal intercepts the action to collect structured feedback before persisting the completion. This data feeds directly into Club Pilot scoring, ML training, and operational analytics.

## The Modal: "Task Debrief"

A sleek, fast-to-complete dialog (target: under 15 seconds) with these fields:

### Required
1. **Time spent** -- Segmented control with smart presets based on `estimated_duration_minutes`:
   - "< 15 min", "15-30 min", "30-60 min", "1-2 hrs", "2+ hrs"
   - Tapping one is instant; no typing needed

2. **Difficulty** -- Slider 1-10 with semantic labels:
   - 1-3: "Straightforward" (green)
   - 4-6: "Moderate" (amber)
   - 7-9: "Challenging" (red)
   - 10: "Extreme" (deep red)

### Optional (progressive disclosure -- collapsed by default)
3. **Outcome quality** -- "How satisfied are you with the result?" -- 5-star rating
4. **Blockers encountered** -- Multi-select chips: "Waiting on others", "Unclear requirements", "Tool issues", "Scope creep", "None"
5. **What would help next time?** -- Multi-select chips: "Better brief", "More time", "Right tools", "Delegation", "Training"
6. **Notes** -- Single-line text input for freeform context

### Footer
- **"Complete Task"** button (primary, emerald) -- saves feedback + completes task
- **"Skip Feedback"** button (ghost, muted) -- completes task without feedback (we never block completion)
- Skip is intentionally smaller and less prominent to nudge feedback without forcing it

## Why this is FBI-level

- **Micro-behavioral data**: Time-spent vs estimated reveals estimation accuracy per user, per task type -- feeds Club Pilot's effort weight
- **Difficulty calibration**: Over time, difficulty ratings per task type train the ML to predict effort and adjust priority scoring (`Effort(0.03)` weight in Club Pilot formula becomes data-driven)
- **Blocker patterns**: Aggregated blocker data reveals systemic issues (e.g., "Waiting on others" correlates with certain task types -- triggers proactive dependency detection)
- **Outcome quality**: Low satisfaction + high difficulty = candidate for automation or delegation
- **Skip rate itself is a signal**: If users consistently skip, the modal is too long; if they engage, the data is gold

## Database

### New table: `task_completion_feedback`

```
id                  UUID PK
task_id             UUID FK -> unified_tasks(id) ON DELETE CASCADE
user_id             UUID FK -> auth.users(id)
time_spent_minutes  INTEGER (mapped from the preset selected)
difficulty_rating   INTEGER (1-10)
outcome_rating      INTEGER (1-5, nullable)
blockers            TEXT[] (nullable)
improvement_suggestions TEXT[] (nullable)
notes               TEXT (nullable)
skipped             BOOLEAN DEFAULT false
completed_at        TIMESTAMPTZ DEFAULT now()
```

RLS: Users can INSERT/SELECT their own rows only.

## Implementation

### New files

| File | Purpose |
|---|---|
| `src/components/unified-tasks/TaskCompletionFeedbackModal.tsx` | The modal component with slider, chips, presets |
| `src/hooks/useTaskCompletion.ts` | Shared hook that wraps the "complete task" flow: opens modal, handles submit/skip, persists feedback + status update |

### Edited files

| File | What changes |
|---|---|
| `src/components/clubhome/AdminTasksWidget.tsx` | Replace direct `completeMutation` with `useTaskCompletion` hook -- clicking the check circle opens the modal |
| `src/components/unified-tasks/UnifiedTasksList.tsx` | Replace `handleToggleTask` completion path with `useTaskCompletion` -- checkbox triggers modal when going to completed |
| `src/components/unified-tasks/UnifiedTaskBoard.tsx` | Replace direct status update with `useTaskCompletion` when dragging/setting to completed column |
| `src/components/clubhome/ClubPilotTasksWidget.tsx` | Replace `handleCompleteTask` with `useTaskCompletion` hook |

### The `useTaskCompletion` hook

```
useTaskCompletion() returns:
  - requestComplete(taskId, taskTitle, estimatedMinutes?) -> opens modal
  - TaskCompletionModal component (rendered once, controlled by hook state)
```

This pattern means every consumer just calls `requestComplete(...)` and renders `<TaskCompletionModal />` once -- no duplicated modal logic.

### Flow

```text
User clicks "complete"
       |
       v
  Modal opens (task title shown)
       |
  +----+----+
  |         |
  v         v
Fill out   Skip
  |         |
  v         v
INSERT feedback (skipped=false)  INSERT feedback (skipped=true)
       |
       v
UPDATE unified_tasks SET status='completed', completed_at=now()
       |
       v
Invalidate queries, show streak update
```

## ML/AI Integration Points (future-ready)

The `task_completion_feedback` table becomes a training signal for:

- **Club Pilot effort weight**: Actual time vs estimated recalibrates the `Effort(0.03)` coefficient per task type
- **Difficulty prediction**: Given task metadata, predict difficulty before assignment -- warn assignees
- **Smart scheduling**: If user consistently rates morning tasks as easier, Club Pilot auto-schedules hard tasks in their peak window
- **Blocker detection**: Pattern-match blockers to task dependencies and proactively flag risks
- **Team capacity**: Aggregate difficulty + time data per member feeds the `TeamCapacityWidget`

No ML code is written now -- the table structure is designed to be query-ready for these use cases.

## Files Summary

| File | Action |
|---|---|
| `src/components/unified-tasks/TaskCompletionFeedbackModal.tsx` | Create -- the debrief modal |
| `src/hooks/useTaskCompletion.ts` | Create -- shared completion flow hook |
| `src/components/clubhome/AdminTasksWidget.tsx` | Edit -- use hook instead of direct mutation |
| `src/components/unified-tasks/UnifiedTasksList.tsx` | Edit -- use hook for completion path |
| `src/components/unified-tasks/UnifiedTaskBoard.tsx` | Edit -- use hook when moving to completed |
| `src/components/clubhome/ClubPilotTasksWidget.tsx` | Edit -- use hook instead of direct update |
| Database migration | Create `task_completion_feedback` table with RLS |
