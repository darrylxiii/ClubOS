
# Fix: "Cannot Add Barbara de Groot" -- Duplicate Profile & Pipeline Errors

## Problem
Barbara de Groot already exists in the database (candidate profile + "Supply Chain Manager" application with status "submitted"). When the approval workflow runs again for her, it hits two hard errors instead of gracefully handling the situation:

1. **Profile creation**: tries to INSERT with the same email, violating `unique_email_when_present`
2. **Pipeline assignment**: finds an existing application and throws instead of reusing it

## Root Cause
The `createCandidateProfile` method checks for duplicates and returns the existing ID (correct), but the `executeApprovalWorkflow` method in Step 2 calls a *different* path (`createProfile` data) that bypasses the duplicate-safe logic. Meanwhile `linkCandidateToJob` throws a hard error when the candidate is already in the pipeline, instead of returning the existing application ID.

## Fix

### File: `src/services/memberApprovalService.ts`

**1. `linkCandidateToJob` (line ~370)** -- Instead of throwing when a duplicate application exists, return the existing application ID with a log message. This makes re-approval idempotent.

```
// Before (throws):
if (existingApp) {
  throw new Error(`Candidate is already in the "..." pipeline`);
}

// After (returns existing):
if (existingApp) {
  console.log('[MemberApproval] Candidate already in pipeline, reusing:', existingApp.id);
  return existingApp.id;
}
```

**2. `createCandidateProfile` (line ~144-152)** -- Wrap the INSERT in a catch that detects the `unique_email_when_present` constraint violation. If hit, query for the existing profile by email and return its ID instead of throwing.

```
// After the insert, if error.code === '23505' and message includes
// 'unique_email_when_present', fall back to email lookup and return
// the existing candidate ID.
```

These two changes make the entire approval flow idempotent -- re-approving a member who already exists simply links everything that isn't already linked and succeeds quietly.

### No other files need changes.
No database migrations, no new components. The UI already handles success/error messages from the workflow result.
