
# Fix: Member Approval "Role Error" for Partner Assignment

## Root Cause Analysis

Two database-level errors are blocking the approval workflow when assigning a member as Partner:

### Bug 1: `company_members` role constraint violation
The `company_members` table has a CHECK constraint that only allows: `['owner', 'admin', 'recruiter', 'viewer']`. When the approval workflow assigns a user to a company with role `'partner'`, the insert is rejected.

**Error**: `new row for relation "company_members" violates check constraint "company_members_role_check"`

**Location**: `memberApprovalService.ts` line 557 calls `assignToCompany(requestId, companyId, 'partner')`, but `'partner'` is not in the allowed values.

### Bug 2: Missing INSERT policy on `admin_member_approval_actions`
The audit log table only has a SELECT policy for admins/strategists. There is no INSERT policy, so every call to `logApprovalAction()` silently fails due to RLS. This causes cascading errors throughout the workflow since the audit logging runs before and after each step.

**Error**: `new row violates row-level security policy for table "admin_member_approval_actions"` (appears 8+ times in logs per approval attempt)

## Fix Plan

### 1. Database Migration

Add `'partner'` to the `company_members_role_check` constraint and add an INSERT policy for admins on `admin_member_approval_actions`.

```sql
-- Fix 1: Add 'partner' to company_members role check constraint
ALTER TABLE public.company_members DROP CONSTRAINT company_members_role_check;
ALTER TABLE public.company_members ADD CONSTRAINT company_members_role_check
  CHECK (role = ANY (ARRAY['owner', 'admin', 'recruiter', 'viewer', 'partner', 'member']));

-- Fix 2: Add INSERT policy for admin_member_approval_actions
CREATE POLICY "Admins can insert approval actions"
  ON public.admin_member_approval_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::app_role, 'strategist'::app_role)
    )
  );
```

### 2. Code Fix (defensive mapping)

Update `memberApprovalService.ts` to map the `app_role` value `'partner'` to a valid `company_members` role. When `assignToCompany` is called with `'partner'`, use `'admin'` as the company-level role (since partners are company admins in practice). This prevents future mismatches if the constraint or enum evolves independently.

## Files Changed

| File | Change |
|---|---|
| New migration SQL | Add `'partner'` to constraint + INSERT policy |
| `src/services/memberApprovalService.ts` | Map partner role to valid company_members role |

## Impact
- Unblocks all Partner assignment approvals
- Fixes silent audit log failures (all approval actions will now be properly tracked)
- No data loss or schema conflicts
