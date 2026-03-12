

# Partner Approval Workflow — Full Company Assignment UI

## Problem
When approving a partner, the admin only sees a simple dialog with "Send email" and "Send SMS" checkboxes. There's no UI to:
- Select or create a company
- Auto-detect existing companies with similar names
- Choose the partner's company role

The edge function then blindly creates a new company every time, which crashes when schema mismatches occur and creates duplicates.

## Solution

Route partner approvals through the existing `MemberApprovalWorkflowDialog` (same as candidates), but with a partner-adapted flow that skips irrelevant steps (merge detection, candidate profile creation) and adds company auto-detection.

```text
Partner Approval Flow:
┌─────────────┐    ┌──────────────────┐    ┌─────────┐
│ Company Step │ -> │ Role & Notify    │ -> │ Confirm │
│ (auto-detect │    │ (partner role,   │    │         │
│  or create)  │    │  email/SMS)      │    │         │
└─────────────┘    └──────────────────┘    └─────────┘
```

## Changes

### 1. `src/components/admin/AdminMemberRequests.tsx` (lines 502-515)
Route partner approvals to the workflow dialog instead of the simple dialog:
```typescript
const openReviewDialog = (request, action) => {
  if (action === 'approve') {
    // Both candidates AND partners use the workflow dialog
    setWorkflowRequest(request);
    setShowWorkflowDialog(true);
  } else {
    // Declines still use simple dialog
    setSelectedRequest(request);
    setReviewAction(action);
  }
};
```

### 2. New: `src/components/admin/approval/CompanySelectionStep.tsx`
A new step component for partner approval that:
- Queries `companies` table and fuzzy-matches against the partner request's `company_name`
- Shows matching companies ranked by similarity (exact match, starts-with, contains)
- Offers "Create New Company" option pre-filled with request data (name, industry, company_size, website, headquarters_location)
- Lets admin pick company role (owner, admin, recruiter, member)

### 3. `src/components/admin/approval/MemberApprovalWorkflowDialog.tsx`
Add partner-aware flow:
- If `request.request_type === 'partner'`: skip 'detect' and 'create' steps, start at new 'company' step
- Steps for partners: `company → assign → confirm`
- Pass selected/created company data into the confirmation

### 4. `src/types/approval.ts`
Add `'company'` to `ApprovalStep` union type. Add `CompanyAssignmentData` interface:
```typescript
interface CompanyAssignmentData {
  companyId: string | null;  // null = create new
  companyName: string;
  companyRole: 'owner' | 'admin' | 'recruiter' | 'member';
  industry?: string;
  companySize?: string;
  website?: string;
  headquartersLocation?: string;
}
```

### 5. `supabase/functions/approve-partner-request/index.ts`
Accept optional `companyId` in request body. If provided, skip company creation and use the existing company. If not provided, create as before. Also accept `companyRole` to use instead of hardcoded `"owner"`.

### 6. `src/services/memberApprovalService.ts`
Add `executePartnerApprovalWorkflow` method that:
- Calls `approve-partner-request` edge function with `{ requestId, companyId?, companyRole? }`
- Or if creating a new company, passes the company data to the edge function
- Handles the same notification preferences

### 7. `src/components/admin/approval/ApprovalStepIndicator.tsx`
Add the 'company' step to the visual indicator for partner flows.

## Files Changed
| File | Change |
|------|--------|
| `src/types/approval.ts` | Add 'company' step, CompanyAssignmentData type |
| `src/components/admin/approval/CompanySelectionStep.tsx` | New — company auto-detect + create UI |
| `src/components/admin/approval/MemberApprovalWorkflowDialog.tsx` | Partner-aware flow with company step |
| `src/components/admin/approval/ApprovalStepIndicator.tsx` | Add company step indicator |
| `src/components/admin/AdminMemberRequests.tsx` | Route partner approvals to workflow dialog |
| `supabase/functions/approve-partner-request/index.ts` | Accept companyId/companyRole, skip creation if provided |
| `src/services/memberApprovalService.ts` | Add partner workflow execution method |

