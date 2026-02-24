

# Partner Provisioning Audit -- Score: 31/100

## Root Cause of the Non-2xx Error

The `provision-partner` edge function crashes at **Step 1 (company creation)** due to a database trigger:

```
null value in column "owner_id" of relation "task_boards"
violates not-null constraint
```

The `auto_create_company_board` trigger fires on every `INSERT INTO companies` and calls `auth.uid()` to set `owner_id`. But the edge function uses the **service role key** (no auth session), so `auth.uid()` returns `NULL` -- which violates the `NOT NULL` constraint on `task_boards.owner_id`. The function returns a 500 error and provisioning fails completely.

The `create_company_workspace` trigger also fires but succeeds only because `workspaces.created_by` is nullable.

---

## Full Scorecard

| Category | Weight | Current | Target | Issue |
|---|---|---|---|---|
| Core Provisioning Works | 20 | 0/20 | 20/20 | Crashes on company creation due to trigger |
| Error Handling / Rollback | 15 | 2/15 | 15/15 | No rollback -- partial state left behind (user created, company not) |
| Auth / Security | 15 | 8/15 | 15/15 | verify_jwt=false but manual JWT check inside; listUsers call is wasteful and leaks data |
| Input Validation | 10 | 7/10 | 10/10 | Decent but no length limits, no sanitization |
| Idempotency | 10 | 3/10 | 10/10 | Profile check works, but no protection against race conditions |
| Audit Logging | 10 | 7/10 | 10/10 | Good structure, but silently swallows insert errors |
| Email Delivery | 5 | 4/5 | 5/5 | Works if Resend key exists; no retry on failure |
| approve-partner-request Function | 10 | 1/10 | 10/10 | Same trigger bug; also uses deprecated handler export; no audit log |
| Client Hook (usePartnerProvisioning) | 5 | 1/5 | 5/5 | Does not parse FunctionsHttpError body -- shows generic "FunctionsHttpError" instead of server message |

---

## Detailed Findings

### 1. Company Creation Trigger Crash (Severity: BLOCKER)

`auto_create_company_board()` runs `INSERT INTO task_boards (..., owner_id) VALUES (..., auth.uid())`. The service role client has no JWT user session, so `auth.uid()` is `NULL`. `task_boards.owner_id` is `NOT NULL`.

**Fix**: Modify the trigger to gracefully skip when `auth.uid()` is NULL, or accept a fallback (e.g., the company ID creator passed as a column). The safest enterprise-grade fix is to make the trigger tolerant:

```sql
IF auth.uid() IS NOT NULL THEN
  INSERT INTO task_boards (..., owner_id) VALUES (..., auth.uid());
END IF;
```

Then in the edge function, after company creation, explicitly create the task board with the admin's user ID as `owner_id`.

### 2. No Transactional Rollback (Severity: HIGH)

The function executes 11 sequential steps. If step 5 fails, steps 1-4 have already committed. This leaves orphaned auth users, partial company records, and dangling role assignments. An enterprise provisioning system must be atomic.

**Fix**: Wrap steps 1-8 in a Postgres function (`provision_partner_atomic`) called via `supabase.rpc()`, so all DB writes happen in a single transaction. Auth user creation (which is an API call, not a DB write) should be the first step -- if it fails, nothing else runs. If a later step fails, clean up the auth user via `admin.deleteUser()`.

### 3. Wasteful `listUsers` Call (Severity: MEDIUM)

Line 151 calls `supabase.auth.admin.listUsers({ page: 1, perPage: 1 })` but never uses the result. This is a leftover that adds latency and leaks user counts.

**Fix**: Remove the dead `listUsers` call entirely.

### 4. `approve-partner-request` Has the Same Trigger Bug (Severity: HIGH)

This function also inserts into `companies` (line 85-91), hitting the same `auto_create_company_board` trigger crash. Additionally:
- Uses the deprecated `export async function handler` pattern instead of `Deno.serve`
- No audit logging
- No profile creation for the new user
- No idempotency check (can approve the same request twice)

**Fix**: Rewrite to use `Deno.serve()`, fix the trigger issue, add audit log, and add idempotency guard.

### 5. Client Hook Swallows Error Details (Severity: MEDIUM)

`usePartnerProvisioning.ts` catches `error` from `supabase.functions.invoke()` but shows `error.message` which for `FunctionsHttpError` is just "FunctionsHttpError". The actual server error body (e.g., "Failed to create company") is inside `error.context.json()` and never extracted.

**Fix**: Use the existing `parseEdgeFunctionError` utility from `src/utils/edgeFunctionErrors.ts` to extract the real error message from the response body.

### 6. No Input Length Limits (Severity: LOW)

`fullName`, `companyName`, `welcomeMessage` have no max length. A malicious admin could pass megabytes of text.

**Fix**: Add length validation (e.g., fullName max 200 chars, companyName max 100, welcomeMessage max 500).

---

## Implementation Plan

### Phase 1: Fix the Blocker

1. **Database migration**: Alter the `auto_create_company_board` trigger to skip when `auth.uid() IS NULL`
2. **Edge function** (`provision-partner`): After company creation, explicitly insert the task board with the provisioning admin's ID as `owner_id`
3. **Remove** the dead `listUsers` call (line 151-154)

### Phase 2: Atomic Provisioning

4. **Add rollback logic**: If any step after auth user creation fails, call `supabase.auth.admin.deleteUser(newUserId)` before returning the error -- prevents orphaned users
5. **Add input length validation**: Cap `fullName` at 200, `companyName` at 100, `welcomeMessage` at 500 characters

### Phase 3: Fix `approve-partner-request`

6. **Rewrite** to use `Deno.serve()` instead of deprecated `handler` export
7. **Add** the same task board creation logic post-company-insert
8. **Add** idempotency guard (check `status !== 'pending'` is already there, but add audit log)
9. **Add** comprehensive audit log entry
10. **Add** profile update for the new user (currently missing)

### Phase 4: Client-Side Error Handling

11. **Update** `usePartnerProvisioning.ts` to use `parseEdgeFunctionError` from `edgeFunctionErrors.ts` to surface the actual server error message instead of generic "FunctionsHttpError"

### Phase 5: Deploy and Verify

12. **Redeploy** `provision-partner` and `approve-partner-request`
13. **Test** provisioning end-to-end via the edge function

### Files to modify:
- `supabase/functions/provision-partner/index.ts` -- remove listUsers, add task board creation, add rollback, add input length limits
- `supabase/functions/approve-partner-request/index.ts` -- rewrite to Deno.serve, fix trigger issue, add audit log
- `src/hooks/usePartnerProvisioning.ts` -- use parseEdgeFunctionError for proper error messages
- New DB migration: alter `auto_create_company_board` trigger to handle NULL `auth.uid()`

