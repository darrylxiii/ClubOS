

# Partner Provisioning Audit -- Current Score: 72/100

## Scorecard

| Category | Weight | Current | Target | Issue |
|---|---|---|---|---|
| Core Provisioning (provision-partner) | 20 | 18/20 | 20/20 | Works structurally, never tested in production |
| Core Provisioning (approve-partner-request) | 15 | 3/15 | 15/15 | CRASHES -- inserts non-existent column |
| Auth and Authorization | 15 | 14/15 | 15/15 | Both functions verify JWT + admin role -- solid |
| Error Handling and Rollback | 10 | 8/10 | 10/10 | Good pattern, minor gap |
| Client-Side Error Handling | 5 | 5/5 | 5/5 | Uses getEdgeFunctionErrorMessage -- done |
| Welcome Email Integration | 5 | 3/5 | 5/5 | send-partner-welcome orphaned, uses deprecated serve() |
| Input Validation | 5 | 5/5 | 5/5 | Length limits, format checks -- solid |
| Audit Logging | 5 | 5/5 | 5/5 | Both functions write to comprehensive_audit_logs |
| Idempotency | 5 | 5/5 | 5/5 | Profile check + pending guard |
| Data Integrity (DB) | 5 | 4/5 | 5/5 | Trigger fixed, dedup index in place |
| Dead Code | 5 | 3/5 | 5/5 | send-partner-welcome is unused |
| Production Evidence | 5 | 0/5 | 5/5 | Zero provisions ever completed |

**Total: 72/100** (up from 61, but the approve flow is still broken)

---

## Critical Finding: `approve-partner-request` Will Crash on Every Call

**Root cause**: Line 196-201 of `approve-partner-request/index.ts` inserts into `user_roles` with a `company_id` field:

```typescript
.insert({
  user_id: user.id,
  role: "partner",
  company_id: companyId,  // <-- THIS COLUMN DOES NOT EXIST
})
```

The `user_roles` table schema has only 4 columns: `id`, `user_id`, `role`, `created_at`. There is **no `company_id` column**. This insert will fail with a Postgres error on every single approval attempt, triggering the rollback and deleting the just-created auth user.

This is why there are still **zero provisioning logs**, **zero approved requests**, and **zero invite codes** in production.

## Other Findings

### 1. `send-partner-welcome` is Still Orphaned (Minor)

- Uses deprecated `serve()` import from `deno.land/std@0.168.0`
- Not called by either provisioning flow (both send emails inline via Resend)
- Not referenced anywhere in `src/`
- Should be deleted to eliminate confusion and maintenance drift

### 2. `approve-partner-request` Missing `company_id` on `partner_requests` Table

Line 144: `let companyId = request.company_id` -- the `partner_requests` table has no `company_id` column. This evaluates to `undefined`, which means the function always creates a new company from `company_name`. This is acceptable behavior, but the code should not reference a non-existent field. It should explicitly default to `null`.

### 3. `AdminPartnerRequestsTab` Still Sends Unused `approvedBy` in Body

Line 49-52 sends `approvedBy: user?.user?.id` in the request body. The edge function correctly ignores this and uses the JWT-derived admin ID instead. The client-side field is dead code and should be removed to avoid confusion.

---

## Implementation Plan

### Phase 1: Fix the Blocker

1. **Fix `approve-partner-request` Step 3**: Remove `company_id` from the `user_roles` insert. Change from `{ user_id, role, company_id }` to `{ user_id, role }` to match the actual table schema.

2. **Fix `company_id` reference**: Change line 144 from `request.company_id` to `null` (the field does not exist on `partner_requests`).

### Phase 2: Cleanup

3. **Delete `send-partner-welcome`**: This function is unused by any code path. Both `provision-partner` and `approve-partner-request` send emails directly via Resend. Remove the function and its config.toml entry.

4. **Remove dead `approvedBy` from client**: In `AdminPartnerRequestsTab.tsx`, simplify the request body to only `{ requestId }` since the server ignores `approvedBy`.

### Phase 3: Deploy and Verify

5. **Redeploy** `approve-partner-request` and `provision-partner`.
6. **End-to-end test**: Call `approve-partner-request` against one of the 3 remaining pending requests to confirm the full cycle completes (user created, role assigned, company created, invite code generated, welcome email sent, provisioning log written, audit log written).

### Files to modify

- `supabase/functions/approve-partner-request/index.ts` -- Remove `company_id` from `user_roles` insert (line 200), fix `request.company_id` reference (line 144)
- `src/components/admin/AdminPartnerRequestsTab.tsx` -- Remove `approvedBy` from request body (line 51)
- Delete `supabase/functions/send-partner-welcome/` directory
- Update `supabase/config.toml` to remove the `send-partner-welcome` entry (if present)

