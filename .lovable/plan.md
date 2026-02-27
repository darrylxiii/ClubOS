

# Fix: Partner Job Creation Blocked by Database Constraint

## Critique of Previous Plan (why it scored 0/100)

1. **Misdiagnosed the blocker.** Every prior attempt fixed the RLS INSERT policy (which was already correct after the first migration). The real blocker — the `jobs_status_check` CHECK constraint — was never touched.
2. **Postgres misleads.** When a CHECK constraint fails during an INSERT that also has RLS, Postgres can surface a generic "violates row-level security" error, hiding the true cause. None of the previous iterations inspected constraints.
3. **Incomplete type system.** `pending_approval` was added to frontend submission logic but never to the `JobStatus` union type or status config, meaning badges, filters, and partner views would break even if the insert succeeded.
4. **No end-to-end validation.** No step verified that a partner user could actually complete the insert after the fix.

## Verified Current State

| Layer | Status |
|---|---|
| RLS INSERT policy | Correct — allows `partner` company role |
| RLS UPDATE policy | Correct — allows partners on their company jobs |
| CHECK constraint `jobs_status_check` | **BLOCKING** — only allows `draft, published, closed, archived` |
| Frontend insert (CreateJobDialog line 418) | Sends `pending_approval` for partners — correct intent |
| `JobStatus` type (statusConfig.ts line 91) | Missing `pending_approval` |
| Job status badge config (statusConfig.ts line 93) | Missing `pending_approval` entry |
| JobApprovals admin page | Already created and correct |
| Admin route + nav link | Already wired |

## Fix (3 changes)

### 1. Database migration: expand the CHECK constraint

```sql
ALTER TABLE public.jobs DROP CONSTRAINT jobs_status_check;

ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text,
    'published'::text,
    'closed'::text,
    'archived'::text,
    'pending_approval'::text
  ]));
```

This is the single change that unblocks the partner insert. Everything else is support.

### 2. Add `pending_approval` to status type and config

**File:** `src/lib/statusConfig.ts`

- Extend the `JobStatus` type union:
  ```
  "draft" | "published" | "closed" | "archived" | "pending_approval"
  ```

- Add config entry to `jobStatusConfig`:
  ```typescript
  pending_approval: {
    label: "Pending Approval",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    description: "Awaiting admin review before publishing.",
  },
  ```

- This ensures `UnifiedStatusBadge`, `JobStatusBadge`, and any view calling `getStatusConfig('job', status)` renders the correct badge instead of falling through to the unknown-status fallback.

### 3. Update `JobStatus` type alias in the badge component

**File:** `src/components/jobs/JobStatusBadge.tsx` (line 6)

Add `"pending_approval"` to the local `JobStatus` union so it stays in sync with the config.

**File:** `src/types/job.ts` — no change needed (status is already `string`).

### 4. Update `JobStatusBadge` in `UnifiedStatusBadge.tsx`

The `StatusByDomain` type map at line references `JobStatus` from statusConfig. Once step 2 is done, this propagates automatically — no manual edit needed.

## What does NOT need changing

- **RLS policies** — already correct for INSERT, UPDATE, SELECT, DELETE.
- **CreateJobDialog** — already sends `pending_approval` for partners (line 418).
- **JobApprovals admin page** — already queries `pending_approval` and updates to `published`/`draft`.
- **Admin routes/nav** — already wired.

## Verification after implementation

1. Log in as Patryk (partner at De Binnenbouwers).
2. Create a job via the Create Job dialog.
3. Confirm it inserts successfully with `status = 'pending_approval'`.
4. Confirm it appears on `/admin/job-approvals` when logged in as admin.
5. Approve it — confirm status changes to `published`.

