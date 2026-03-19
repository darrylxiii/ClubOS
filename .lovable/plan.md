

# Fix: Drop Redundant CHECK Constraint on Profiles

## Problem

The error `"profiles" violates check constraint "check_approval_requires_onboarding_for_candidates"` fires on profile updates because a rigid CHECK constraint blocks ANY update to an approved pure-candidate's profile row if `onboarding_completed_at` is NULL or `phone_verified` is false.

This constraint is redundant — there is already a validation trigger (`trg_validate_candidate_approval`) that handles the same logic more intelligently (only on status transitions, not every update).

## Fix

**One migration** to drop the CHECK constraint. The trigger remains and continues to guard approval transitions.

```sql
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS check_approval_requires_onboarding_for_candidates;
```

That's it. No code changes needed.

## Why This Is Safe

- The trigger `trg_validate_candidate_approval` already validates that candidates can only be approved after completing onboarding
- The CHECK constraint is overly broad — it blocks even innocent profile field updates (e.g., updating `avatar_url` or `bio`) if the candidate hasn't verified their phone
- Removing it restores normal profile update behavior while keeping the approval guard via the trigger

