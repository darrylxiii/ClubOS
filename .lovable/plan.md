

# Decline/Advance/Move-Back Pipeline Audit — Full Fix Plan

## Bugs Found

### BUG 1 (CRITICAL): Missing INSERT RLS policy on `candidate_comments`
The `CandidateActionDialog` (old dialog) inserts rejection feedback into `candidate_comments`. There is **no INSERT policy** on this table — RLS silently blocks the insert. The `EnhancedCandidateActionDialog` (new dialog, actually used) does NOT use `candidate_comments`, so this only affects the old dialog. However, the old dialog is still imported and could be used.

### BUG 2 (HIGH): `candidate_profiles` lookup uses wrong column
In `EnhancedCandidateActionDialog` line 145-149:
```typescript
const { data: candidateData } = await supabase
  .from('candidate_profiles')
  .select('id')
  .eq('user_id', candidateId)  // ← candidateId is actually candidate_profiles.id, NOT user_id
  .single();                    // ← crashes if no match
```
The `candidateId` prop comes from `candidate.candidate_id || candidate.user_id` (line 966 of JobDashboard). Most candidates in the DB have `user_id = NULL` on `candidate_profiles`, so this lookup fails, `candidateProfileId` becomes `null`, and all secondary actions (audit logs, feedback, interactions) silently skip or insert with `null` candidate_id.

**Fix**: Look up by `id` first (since candidateId is often a candidate_profiles.id), fall back to `user_id`. Use `.maybeSingle()`.

### BUG 3 (HIGH): `.single()` on `jobs` lookup (line 139-143)
The jobs lookup in `EnhancedCandidateActionDialog` uses `.single()`. If the job is somehow not found (deleted, RLS), this crashes the entire handler.

**Fix**: Use `.maybeSingle()` and guard against null.

### BUG 4 (MEDIUM): `setLoading(false)` not called before early return (line 156-159)
In the advance/move_back validation block, if `targetStageIndex` is out of range, the function returns without calling `setSubmitting(false)`, leaving the button permanently disabled.

**Fix**: Set submitting to false before returning.

### BUG 5 (LOW): Old `CandidateActionDialog` still imported
`JobDashboard.tsx` imports both `CandidateActionDialog` and `EnhancedCandidateActionDialog` but only uses the Enhanced one. Dead import.

**Fix**: Remove unused import.

### BUG 6 (MEDIUM): `CandidateActionDialog` calls `supabase.auth.getUser()` twice
Lines 68 and 95 both call `getUser()` redundantly — line 95 shadows the const from line 68.

**Fix**: This is the old dialog; removing the import from JobDashboard is sufficient.

### BUG 7: Missing INSERT policy on `candidate_comments` (for old dialog and future use)
Add an INSERT policy so admins/partners/strategists can insert comments.

---

## Implementation Plan

### 1. Database: Add INSERT RLS policy on `candidate_comments`
```sql
CREATE POLICY "Admins partners strategists can insert comments"
ON public.candidate_comments FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'partner'::app_role) OR
  has_role(auth.uid(), 'strategist'::app_role) OR
  user_id = auth.uid()
);
```

### 2. Fix `EnhancedCandidateActionDialog.tsx` (~4 changes)
- **Line 139-149**: Change jobs `.single()` → `.maybeSingle()`, add null guard. Fix candidate_profiles lookup to try by `id` first, then by `user_id`, using `.maybeSingle()`.
- **Line 156-159**: Add `setSubmitting(false)` before the early return for invalid target stage.
- General: Ensure the dialog doesn't crash when secondary data lookups fail.

### 3. Clean up `JobDashboard.tsx`
- Remove unused `CandidateActionDialog` import (line 29).

### 4. Fix `CandidateActionDialog.tsx` (old dialog)
- Fix double `getUser()` call and `.single()` calls, in case it's used elsewhere.

**Total: ~4 files, 1 migration. Fixes the core decline/advance/move-back flow.**

