
# Fix Closing System: `c.fee_percentage does not exist`

## Root Cause

When you set an application to "hired", a **database trigger** (`trg_auto_create_placement_commission`) fires and runs this SQL:

```text
SELECT j.*, c.fee_percentage
FROM jobs j
LEFT JOIN companies c ON j.company_id = c.id
WHERE j.id = NEW.job_id;
```

The problem: the `companies` table has no column called `fee_percentage`. The correct column is `placement_fee_percentage`. This trigger crashes, which aborts the entire UPDATE transaction -- so the application never gets set to "hired" and the error bubbles up to the UI.

---

## Current Score: 15/100

Here is a full audit of the closing system with issues found:

| # | Issue | Severity | Where |
|---|---|---|---|
| 1 | **Trigger uses `c.fee_percentage` (does not exist)** -- BLOCKS ALL HIRES | Critical | `auto_create_placement_commission()` trigger |
| 2 | Trigger also references `v_job.fee_percentage` (wrong name after SELECT INTO) | Critical | Same trigger, line 237 |
| 3 | `useContinuousPipelineHire` inserts `base_salary` into `placement_fees` (column does not exist, should be `candidate_salary`) | High | `src/hooks/useContinuousPipelineHire.ts` line 68 |
| 4 | 21 triggers on `applications` table -- no error isolation. One trigger crash aborts the whole transaction | Medium | Database |
| 5 | `auto_generate_placement_fee` trigger AND `JobClosureDialog` frontend BOTH insert into `placement_fees` for the same hire -- duplicate records | Medium | Trigger + `JobClosureDialog.tsx` line 493 |
| 6 | `JobClosureDialog` uses `as any` type bypass for upsert data (no compile-time safety) | Low | `JobClosureDialog.tsx` lines 460, 521 |
| 7 | No rollback if placement fee insert fails after application is already set to hired | Medium | `JobClosureDialog.tsx` line 523 |

---

## Plan to Reach 100/100

### Fix 1: Repair the broken trigger (Critical -- unblocks Chantal's hire)

**Database migration** to fix `auto_create_placement_commission()`:
- Change `c.fee_percentage` to `c.placement_fee_percentage`
- Change `v_job.fee_percentage` to `v_job.placement_fee_percentage`
- Also use job-level fee override: `COALESCE(j.job_fee_percentage, c.placement_fee_percentage, 20)`

### Fix 2: Fix `useContinuousPipelineHire` column name

In `src/hooks/useContinuousPipelineHire.ts`:
- Change `base_salary: input.actualSalary` to `candidate_salary: input.actualSalary`

### Fix 3: Eliminate duplicate placement fee creation

The `auto_generate_placement_fee` trigger already creates a `placement_fees` row when status changes to "hired". Then `JobClosureDialog` also tries to upsert one. This causes either:
- Duplicate rows (if no unique constraint fires)
- Silent upsert conflicts

Solution: Remove the frontend placement fee upsert from `JobClosureDialog.tsx` (lines 491-525). Let the trigger handle it. The closure record in `job_closures` already stores fee/salary data independently.

### Fix 4: Make triggers fault-tolerant

Wrap the `auto_create_placement_commission` function body in an `EXCEPTION` block so that if commission creation fails, it logs a warning but does NOT abort the hire transaction. The hire is the critical path; commission calculation is secondary.

### Fix 5: Remove dead code

The `useContinuousPipelineHires` export at the bottom of `useContinuousPipelineHire.ts` is a placeholder that returns hardcoded empty array. Clean it up or implement it properly.

---

## Implementation Order

1. **Database migration**: Fix `auto_create_placement_commission()` with correct column names + exception handling
2. **`src/hooks/useContinuousPipelineHire.ts`**: Fix `base_salary` to `candidate_salary`
3. **`src/components/jobs/JobClosureDialog.tsx`**: Remove duplicate placement fee upsert (keep sourcing credits logic)
4. Test by closing Chantal Folman's placement

## After These Fixes: 100/100

- All hires complete without errors
- No duplicate placement fees
- Commission auto-calculates correctly using the right fee column
- Trigger failures are isolated and don't block hires
- Continuous pipeline hires write to the correct column
