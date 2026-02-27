

# Fix: Partner Job Visibility — `can_view_stealth_job` Uses Wrong Table

## The Problem (why it's not 100/100 yet)

The constraint fix unblocks the INSERT, but there is a **visibility bug** that will immediately bite partners afterward.

The `can_view_stealth_job` database function — used by the only SELECT policy on `jobs` — determines who can see which jobs. Its partner clause does this:

```sql
-- Current (broken) partner check
SELECT 1 FROM jobs j
JOIN profiles p ON p.company_id = j.company_id
JOIN user_roles ur ON ur.user_id = p.id
WHERE j.id = _job_id 
AND p.id = _user_id 
AND ur.role = 'partner'
AND j.is_stealth = FALSE
```

This joins `profiles.company_id` to `jobs.company_id`. But for Patryk (and potentially all partners), `profiles.company_id` is **NULL**. Company membership is tracked in the `company_members` table, not `profiles.company_id`.

**Result:** After creating a job, a partner cannot see it in any list or detail view (except via the `created_by` fallback, which only works for the creator, not other partners at the same company).

## The Fix

Update `can_view_stealth_job` to use `company_members` instead of `profiles` for the partner visibility check.

### Database migration

Replace the last OR clause in the function with:

```sql
OR EXISTS (
  SELECT 1 FROM jobs j
  JOIN company_members cm ON cm.company_id = j.company_id
    AND cm.user_id = _user_id
    AND cm.is_active = true
  WHERE j.id = _job_id
  AND (j.is_stealth IS NULL OR j.is_stealth = FALSE)
)
```

This:
- Uses `company_members` (the actual source of truth for partner-company relationships)
- Checks `is_active = true` for safety
- Handles `is_stealth IS NULL` (not just `FALSE`)
- Removes the `user_roles` join since `company_members` already implies membership — any active company member should see non-stealth jobs for their company

### No frontend changes needed

The SELECT policy already calls `can_view_stealth_job`. Once the function is fixed, all existing queries and views will start returning correct results for partners.

## Verification

After applying:
1. Patryk creates a job (now possible after constraint fix).
2. The job appears in his job list immediately (SELECT policy passes via both `created_by` clause and the fixed company-member clause).
3. Other partners at De Binnenbouwers also see the job.
4. Stealth jobs remain hidden from partners not in the viewer list.

