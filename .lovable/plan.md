

# Security Audit Fix: Remove Sensitive Data from Candidate and Partner Views

Admins and Strategists retain full access to everything. These changes only restrict what Candidates and Partners can see.

## Changes

### 1. CRITICAL: Remove Placement Fee Exposure (JobReferralSection)

**File: `src/components/jobs/JobReferralSection.tsx`**

The current 3-column earnings breakdown (Salary Base / Placement Fee / Your Earnings) reveals confidential agency fee structure. Replace it with a single, clean card showing only the referral reward amount.

- Remove the entire 3-column grid (lines 119-172) that shows "Salary Base", "Placement Fee", and "Your Earnings"
- Replace with a single prominent display: "Potential Referral Reward: EUR X"
- Remove the `feePercentage` prop from the interface entirely
- Remove the badge showing `{referralBonusPercentage}% Share` (line 112)
- Remove the tooltip that says "{feePercentage}% of salary as placement fee"
- Keep the referral link sharing UI and "How it works" section untouched

**File: `src/pages/JobDetail.tsx` (line 524)**

- Remove `feePercentage={job.companies?.placement_fee_percentage || 20}` from the `JobReferralSection` props -- this confidential company data should never reach the frontend for candidates

**File: `src/components/jobs/JobReferralBadge.tsx`**

- Remove `feePercentage` prop from `JobReferralChip` -- it currently accepts and uses the agency fee rate to compute earnings client-side
- Instead, accept a pre-computed `potentialEarnings` prop (computed without exposing fee structure)

### 2. HIGH: Add Role Guard to AdminNotesEditor

**File: `src/components/partner/edit/AdminNotesEditor.tsx`**

- Import `useRole` from RoleContext
- Add early return: if role is not `admin` or `strategist`, render nothing
- This is defense-in-depth -- even if a parent accidentally renders it, candidates/partners see nothing

### 3. HIGH: Add Candidate Filter to CandidateNotesManager

**File: `src/components/partner/CandidateNotesManager.tsx`**

- Add a check at line 37: if `userRole === 'candidate'`, return `null` immediately
- Candidates should never see internal notes written about them by recruiters or partners

### 4. MEDIUM: Harden Financial Components with Role Guards

For each of these components, add a `useRole()` check that returns `null` if the current role is not `admin` or `strategist`:

- `src/components/deals/DealCard.tsx` -- shows fee types, percentages, weighted values
- `src/components/crm/CRMWeightedPipeline.tsx` -- shows weighted revenue per stage
- `src/components/crm/EnhancedKanbanColumn.tsx` -- shows deal values
- `src/components/companies/CompanyFinancialsTab.tsx` -- shows bank details, payment terms
- `src/components/financial/CompanyFeeConfigDialog.tsx` -- shows fee configurations
- `src/components/financial/EmployeeCommissionsTable.tsx` -- shows commission amounts
- `src/components/revenue-ladder/TeamLeaderboard.tsx` -- shows individual revenue figures

The pattern for each:
```typescript
import { useRole } from "@/contexts/RoleContext";

// Inside component:
const { currentRole } = useRole();
if (currentRole !== 'admin' && currentRole !== 'strategist') return null;
```

## Summary of What Changes for Each Role

| Data | Admin | Strategist | Partner | Candidate |
|---|---|---|---|---|
| Placement fee % | Visible | Visible | Hidden | Hidden |
| Placement fee amount | Visible | Visible | Hidden | Hidden |
| Referral reward amount | Visible | Visible | Visible | Visible |
| Internal notes | Visible | Visible | Hidden | Hidden |
| Partner-shared notes | Visible | Visible | Visible | Hidden |
| Deal card financials | Visible | Visible | Hidden | Hidden |
| Company bank/payment details | Visible | Visible | Hidden | Hidden |
| Employee commissions | Visible | Visible | Hidden | Hidden |
| Revenue leaderboard | Visible | Visible | Hidden | Hidden |

## Files Modified

| File | Type of Change |
|---|---|
| `src/components/jobs/JobReferralSection.tsx` | Remove fee column, simplify to reward-only display |
| `src/pages/JobDetail.tsx` | Remove `feePercentage` prop |
| `src/components/jobs/JobReferralBadge.tsx` | Remove `feePercentage` from `JobReferralChip` |
| `src/components/partner/edit/AdminNotesEditor.tsx` | Add role guard |
| `src/components/partner/CandidateNotesManager.tsx` | Block candidate access |
| `src/components/deals/DealCard.tsx` | Add role guard |
| `src/components/crm/CRMWeightedPipeline.tsx` | Add role guard |
| `src/components/crm/EnhancedKanbanColumn.tsx` | Add role guard |
| `src/components/companies/CompanyFinancialsTab.tsx` | Add role guard |
| `src/components/financial/CompanyFeeConfigDialog.tsx` | Add role guard |
| `src/components/financial/EmployeeCommissionsTable.tsx` | Add role guard |
| `src/components/revenue-ladder/TeamLeaderboard.tsx` | Add role guard |
