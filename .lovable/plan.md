
# Fix: Declining Candidates and Creating Tasks

## Issue 1: Creating Tasks -- `project_id` Column Does Not Exist

### Root Cause
The `CreateUnifiedTaskDialog` component (line 160) inserts `project_id: selectedProject || null` into the `unified_tasks` table, but **the table has no `project_id` column**. This causes the insert to fail silently with a Postgres error, and the user sees "Failed to create task."

The last task was created on November 15, 2025 -- confirming this has been broken for months.

### Secondary Issue: `board_id` Not Set
The create dialog does not pass the current board's `board_id` from `TaskBoardContext`. While the "Users can create tasks" RLS policy (`created_by = auth.uid()`) would still allow the insert, new tasks won't appear on the current board because the board-scoped SELECT policy (`View tasks from accessible boards`) filters by `board_id`. Tasks with `board_id = NULL` only show if `created_by = auth.uid()`, which works for the creator but not for shared boards.

### Fix
1. **Add `project_id` column** to `unified_tasks` table (nullable UUID, foreign key to `marketplace_projects`).
2. **Pass `board_id`** from `TaskBoardContext` into the insert so tasks appear on the active board.
3. Update `CreateUnifiedTaskDialog` to consume `useTaskBoard()` and include `board_id: currentBoard?.id || null` in the insert payload.

---

## Issue 2: Declining Candidates -- Missing INSERT Policy on `candidate_interactions`

### Root Cause
The decline flow in `EnhancedCandidateActionDialog` does these steps in sequence:
1. Update `applications.status` to `'rejected'` -- this WORKS (admin UPDATE policy exists)
2. Insert into `pipeline_audit_logs` -- this WORKS (INSERT policy `user_id = auth.uid()`)
3. Insert into `company_candidate_feedback` -- this WORKS (ALL policy for admin/partner/strategist)
4. Insert into `role_candidate_feedback` -- this WORKS (ALL policy for admin/partner/strategist)
5. Insert into `candidate_interactions` -- **FAILS: no INSERT policy exists**

The `candidate_interactions` table has SELECT and UPDATE policies but **zero INSERT policies**. Since the Supabase client returns errors silently (no throw), the application status IS updated, but the code does not check intermediate errors. However, the flow may still appear broken to the user because:
- If `candidateProfileId` is null (no `candidate_profiles` entry for the user), the `candidate_interactions` insert uses a NOT NULL `candidate_id` column, which would cause a hard Postgres error that gets caught by the outer try/catch, showing "Failed to decline candidate"
- The missing audit trail means the decline appears incomplete in the UI

### Fix
1. **Add INSERT policy** on `candidate_interactions` for admin/partner/strategist roles.
2. **Add error resilience** to the decline flow -- the application status update should succeed independently of the audit inserts. Wrap secondary inserts in individual try/catch blocks so audit failures don't block the primary action.
3. **Handle null `candidateProfileId`** gracefully -- skip `candidate_interactions` insert if no candidate profile exists rather than passing null to a NOT NULL column.

---

## Implementation Plan

### Step 1: Database Migration
```sql
-- Add project_id column to unified_tasks
ALTER TABLE unified_tasks
  ADD COLUMN project_id uuid REFERENCES marketplace_projects(id) ON DELETE SET NULL;

-- Add INSERT policy on candidate_interactions
CREATE POLICY "Admins partners strategists can insert interactions"
  ON candidate_interactions FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'partner') OR
    has_role(auth.uid(), 'strategist')
  );
```

### Step 2: Fix CreateUnifiedTaskDialog
- Import `useTaskBoard` context
- Add `board_id: currentBoard?.id || null` to the insert payload
- The `project_id` field will now work since the column exists

### Step 3: Fix EnhancedCandidateActionDialog
- Wrap each secondary insert (audit log, feedback, interactions) in individual try/catch so failures don't block the primary application update
- Skip `candidate_interactions` insert if `candidateProfileId` is null/undefined
- Add console warnings for failed secondary inserts to aid debugging

### Files Changed

| File | Action |
|------|--------|
| Database migration | Add `project_id` column + INSERT policy on `candidate_interactions` |
| `src/components/unified-tasks/CreateUnifiedTaskDialog.tsx` | Add `board_id` from context, fix `project_id` (now valid column) |
| `src/components/partner/EnhancedCandidateActionDialog.tsx` | Add error resilience for secondary inserts, null-guard `candidateProfileId` |
