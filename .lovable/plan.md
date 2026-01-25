

# Fix Admin Cannot Add Candidates - Missing RLS INSERT Policy

## Root Cause

The "Enterprise Grade RLS Hardening" migration (`20260110012210`) dropped the INSERT policy for the `applications` table on line 21 but failed to recreate it:

```sql
DROP POLICY IF EXISTS "Admins and company members can insert applications" ON public.applications;
```

This leaves the table with RLS enabled but no INSERT policy, blocking all authenticated users from adding applications - including admins like Sebastiaan Brouwer.

## Database Evidence

| Table | INSERT Policy Exists | Status |
|-------|---------------------|--------|
| `candidate_profiles` | Yes | Working |
| `applications` | **No** | **BROKEN** |

Sebastiaan Brouwer's role is correctly configured:
- `user_id`: `f1f446e1-b186-4a35-9daf-cc0bcd10b907`
- Has `admin`, `strategist`, `partner`, `user` roles in `user_roles` table
- `has_role(..., 'admin')` returns `true`

## Solution

Create a database migration to restore the missing INSERT policy for the `applications` table.

### Migration SQL

```sql
-- Restore missing INSERT policy for applications table
-- This was accidentally dropped in migration 20260110012210

CREATE POLICY "Admins and company members can insert applications"
ON public.applications
FOR INSERT
TO public
WITH CHECK (
  -- Admins can always insert
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Partners can always insert
  has_role(auth.uid(), 'partner'::app_role)
  OR
  -- Strategists can always insert
  has_role(auth.uid(), 'strategist'::app_role)
  OR
  -- Company members can insert for their company's jobs
  EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.company_members cm ON cm.company_id = j.company_id
    WHERE j.id = applications.job_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
  )
  OR
  -- Users can insert their own applications
  (auth.uid() = user_id AND user_id IS NOT NULL)
);
```

## Implementation Steps

1. Run the database migration to create the missing INSERT policy
2. Verify the policy exists via `pg_policies` query
3. Test: Have Sebastiaan Brouwer attempt to add a candidate again

## Expected Outcome

After applying this fix:
- Admins, partners, and strategists can add candidates to any job
- Company members can add candidates to their company's jobs
- Users can submit their own applications
- The "You do not have permission to add candidates" error will no longer appear

## Technical Details

**Files to modify:** Database migration only (no code changes needed)

**Risk:** Low - this restores a previously working policy

**Rollback:** `DROP POLICY IF EXISTS "Admins and company members can insert applications" ON public.applications;`

