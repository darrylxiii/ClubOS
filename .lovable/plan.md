

# Audit & Fix: Pipeline Advance/Decline System + Add "Step Back"

## Root Cause of Decline Error

The decline failure is caused by a **database trigger** (`trg_application_company_history`) that fires on every application status change. When a candidate is declined (status set to `rejected`), this trigger inserts a row into `candidate_company_history` with `interaction_type = 'application'`. However, the table has a CHECK constraint that only allows these values: `sourced, applied, screened, interviewed, offered, hired, rejected, withdrew, ghosted`.

The value `'application'` is not in that list, so the constraint violation causes the entire UPDATE transaction to roll back -- hence the "Failed to decline candidate" error.

## Fix Plan

### 1. Fix the trigger function (Database Migration)

Update `trg_record_company_history()` to use correct `interaction_type` values that match the CHECK constraint:

- `'rejected'` when status is `rejected`
- `'hired'` when status is `hired`
- `'withdrew'` when status is `withdrawn`
- `'rejected'` when status is `declined` (candidate declined offer)

This maps the application status directly to the allowed interaction types instead of hardcoding `'application'`.

### 2. Add "Move Back" (Step Back) Feature

Currently the `EnhancedCandidateActionDialog` only shows stages *after* the current one when advancing. We need to:

**a. Expand the action type** from `'advance' | 'decline'` to `'advance' | 'decline' | 'move_back'`

**b. Update the stage selector** to show previous stages (stages where `order < currentStageIndex`) when action is `move_back`

**c. Add a "Move Back" button** in the pipeline UI alongside Advance and Decline

**d. Add audit logging** for the move-back action (`candidate_moved_back`)

### 3. Update JobDashboard and ExpandablePipelineStage

- Add `onMoveBackCandidate` handler to the pipeline stage component
- Add the "Move Back" action to the state type
- Wire it to the `EnhancedCandidateActionDialog` with `actionType: 'move_back'`

---

## Technical Details

### Database Migration

```sql
CREATE OR REPLACE FUNCTION trg_record_company_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_company_id uuid;
  v_job_id uuid;
  v_interaction_type text;
BEGIN
  IF NEW.status NOT IN ('hired', 'rejected', 'withdrawn', 'declined') THEN
    RETURN NEW;
  END IF;
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_job_id := NEW.job_id;
  SELECT company_id INTO v_company_id FROM jobs WHERE id = v_job_id;
  IF v_company_id IS NULL THEN RETURN NEW; END IF;

  -- Map to allowed interaction_type values
  v_interaction_type := CASE
    WHEN NEW.status = 'hired' THEN 'hired'
    WHEN NEW.status = 'rejected' THEN 'rejected'
    WHEN NEW.status = 'withdrawn' THEN 'withdrew'
    WHEN NEW.status = 'declined' THEN 'rejected'
  END;

  INSERT INTO candidate_company_history (...)
  VALUES (..., v_interaction_type, ...)
  ON CONFLICT ...;

  RETURN NEW;
END;
$$;
```

### EnhancedCandidateActionDialog Changes

- Add `'move_back'` to `actionType` prop
- When `actionType === 'move_back'`, filter stages to show `stage.order < currentStageIndex`
- Update dialog title/description for move-back context
- Update audit log action to `'candidate_moved_back'`
- Require a reason/note for moving back (accountability)

### JobDashboard Changes

- Update state type: `action: 'advance' | 'decline' | 'move_back'`
- Add `onMoveBackCandidate` callback to `ExpandablePipelineStage`
- Add a "Step Back" button (with left-arrow icon) in the candidate card actions (only visible for stages > 0)

## Files to Change

1. **Database migration** -- fix `trg_record_company_history()` function
2. `src/components/partner/EnhancedCandidateActionDialog.tsx` -- add move_back action type + UI
3. `src/pages/JobDashboard.tsx` -- add move_back to state type + wire handler
4. `src/components/partner/ExpandablePipelineStage.tsx` -- add "Step Back" button
5. `src/components/partner/JobDashboardCandidates.tsx` -- add move_back support if used there
6. `src/components/partner/CandidatePipelineStatus.tsx` -- add move_back option
7. `src/components/partner/CandidatePipelineContextBanner.tsx` -- add move_back option

