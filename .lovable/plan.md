
# Plan 2 of 4: Fix Broken Features in Job Pipeline

## Overview
Four features in the Job Pipeline are currently non-functional or produce incorrect results. This plan fixes each one without changing the page architecture.

---

## Fix 1: Conversion Rate Math (lines 436-443)

**Current (broken):**
```
const totalPassed = enrichedApps.filter(app => app.current_stage_index > i).length;
conversionRates[`${i}-${i+1}`] = current > 0
  ? Math.round((totalPassed / (current + totalPassed)) * 100)
  : 0;
```
This conflates "all candidates who ever passed stage i" with "candidates currently in stage i", producing inflated or misleading percentages.

**Fix:**
Replace with a straightforward ratio: candidates who moved past stage i divided by total candidates who reached stage i or beyond.
```
const reachedStage = enrichedApps.filter(app => app.current_stage_index >= i).length;
const passedStage = enrichedApps.filter(app => app.current_stage_index > i).length;
conversionRates[`${i}-${i+1}`] = reachedStage > 0
  ? Math.round((passedStage / reachedStage) * 100)
  : 0;
```

---

## Fix 2: "Needs Club Check" -- Remove Mock (lines 454-455)

**Current (mocked):**
```
const needsClubCheck = Math.min(
  enrichedApps.filter(app => app.current_stage_index === 0).length, 3
);
```
This is hardcoded to cap at 3 and just counts first-stage candidates.

**Fix:**
Replace with accurate count of candidates in stage 0 whose status is still "applied" (not yet screened). No artificial cap.
```
const needsClubCheck = enrichedApps.filter(
  app => app.current_stage_index === 0 && app.status === 'applied'
).length;
```

---

## Fix 3: "Save as Template" Button (line 718)

**Current (fake toast):**
```
onClick={() => {
  toast.success("Pipeline template saved");
}}
```
Does nothing -- just shows a success message.

**Fix:**
Save the current `pipeline_stages` JSON to a `pipeline_templates` table. Since creating a new table adds complexity, we will instead save to `localStorage` as a named template (simpler, no migration needed, still functional).

Implementation:
- Prompt the user for a template name via `window.prompt`
- Save `{ name, stages, created_at }` to localStorage key `pipeline-templates`
- On "Add Stage" dialog, add a "Load Template" option that reads from this store
- Show toast with the template name on success

---

## Fix 4: Stage Deletion Safety (lines 830-846)

**Current (destructive, no confirmation):**
```
onDelete={async () => {
  const updatedStages = stages
    .filter((_, i) => i !== index)
    .map((s, i) => ({ ...s, order: i }));
  // ...updates jobs table, no confirmation, no candidate handling
}}
```
Deletes the stage immediately. Candidates in that stage become orphaned (their `current_stage_index` points to a non-existent stage).

**Fix (two parts):**

**Part A -- Confirmation dialog:**
- Before deleting, check if any candidates are in the stage (`stageApplications.length > 0`)
- If yes, show a confirmation dialog: "This stage has X candidate(s). They will be moved to [previous stage]. Continue?"
- If no candidates, show a simpler confirmation: "Delete stage [name]?"

**Part B -- Candidate migration:**
- When a stage is deleted, update all applications in that stage to move to `current_stage_index - 1` (or 0 if first stage)
- Execute this as a batch update before removing the stage from the JSONB array
- Then reindex all remaining stages

---

## Technical Details

### Files Modified
- `src/pages/JobDashboard.tsx` -- all four fixes

### No New Dependencies
- Uses existing `Dialog` / `AlertDialog` components for confirmation
- Uses `localStorage` for template storage (no DB migration)

### Risk Assessment
- **Conversion rate fix**: Pure math change. No data mutation.
- **Club check fix**: Removes mock. If no candidates have `status === 'applied'`, count shows 0 (correct).
- **Save as Template**: localStorage-only. No backend impact.
- **Stage deletion**: Adds a DB call to update applications before deleting stage. Wrapped in error handling. If the application update fails, the stage is not deleted.
