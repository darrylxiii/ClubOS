
# Job Approval Workflow for Partner-Created Jobs

## What This Does
When a Partner creates a job, it will be saved as "pending_approval" instead of "published". Admins and strategists will see a new "Job Approvals" page where they can review, approve (publish), or decline pending jobs.

## Changes

### 1. Database: Add `pending_approval` Status
- No schema change needed (the `status` column is `text`, not an enum)
- Update the INSERT RLS policy on `jobs` to allow partners to create jobs

**SQL Migration:**
```sql
-- Allow partners to INSERT jobs
DROP POLICY "Company admins can create jobs" ON public.jobs;

CREATE POLICY "Company members can create jobs" ON public.jobs
FOR INSERT TO authenticated
WITH CHECK (
  has_company_role(auth.uid(), company_id, 'owner')
  OR has_company_role(auth.uid(), company_id, 'admin')
  OR has_company_role(auth.uid(), company_id, 'partner')
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'strategist'::app_role)
);
```

### 2. CreateJobDialog: Set Status Based on Role
**File:** `src/components/partner/CreateJobDialog.tsx`

- Detect if the current user is admin/strategist (auto-publish) or partner (pending_approval)
- Change line 416 from `status: 'published'` to a role-conditional value
- Update the success toast: partners see "Job submitted for approval" instead of "Job posted successfully"

### 3. Create Job Approvals Page
**File:** `src/pages/admin/JobApprovals.tsx`

A new admin page that:
- Queries `jobs` where `status = 'pending_approval'`, joined with `companies` and `profiles` (creator)
- Shows a card/table for each pending job with: title, company, creator, salary range, location, created date
- Two actions per job: **Approve** (sets status to `published`, sets `published_at`) and **Decline** (sets status to `draft`, with optional reason)
- Protected by `RoleGate` for admin/strategist only
- Shows empty state when no pending jobs

### 4. Add Route and Navigation
**File:** `src/config/navigation.config.ts`
- Add "Job Approvals" to admin Talent Management group with a badge

**File:** App router (wherever routes are defined)
- Add route `/admin/job-approvals` pointing to the new page

### 5. Notification Indicator (Optional Enhancement)
- Show a count badge on "Job Approvals" nav item when there are pending jobs
- This can be a simple query on mount; no realtime needed initially

## Technical Details

### Role Detection in CreateJobDialog
```typescript
// Determine status based on role
const isAutoPublish = role === 'admin' || role === 'strategist';
const jobStatus = isAutoPublish ? 'published' : 'pending_approval';
```

### Job Approvals Page Structure
- Uses existing patterns: `RoleGate`, `supabase` client, `toast`
- Query: `supabase.from('jobs').select('*, companies(name, logo_url), profiles!created_by(full_name, email)').eq('status', 'pending_approval').order('created_at', { ascending: false })`
- Approve action: `supabase.from('jobs').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', jobId)`
- Decline action: `supabase.from('jobs').update({ status: 'draft' }).eq('id', jobId)`

### Files Created/Modified

| File | Action |
|---|---|
| SQL Migration | Update INSERT RLS policy on `jobs` to include partners |
| `src/components/partner/CreateJobDialog.tsx` | Set status conditionally based on role |
| `src/pages/admin/JobApprovals.tsx` | **Create** -- Admin approval queue page |
| `src/config/navigation.config.ts` | Add "Job Approvals" nav item under Talent Management |
| App router file | Add `/admin/job-approvals` route |
