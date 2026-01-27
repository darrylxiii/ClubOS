
# Admin Strategist Assignment Management System

## Overview
This plan creates a comprehensive admin system for managing strategist assignments across both companies and candidates. The system will provide a centralized modal for bulk viewing/editing, plus inline assignment capabilities throughout the admin interface.

## Current State Analysis

| Entity | Current Assignment Method | Gap |
|--------|--------------------------|-----|
| Companies | Dropdown menu → StrategistAssignmentDialog | No centralized overview, no bulk management |
| Candidates | BulkActionsToolbar in AdminCandidates | No individual assignment dialog, no quick inline edit |

**Database Status:**
- All 15+ companies are currently assigned to Sebastiaan Brouwer (backfilled by trigger)
- The `company_strategist_assignments` table has proper schema with SLA configs
- Candidates use `assigned_strategist_id` in `candidate_profiles` table

---

## Implementation Components

### 1. Admin Strategist Management Modal (Centralized Hub)

A full-screen modal/page accessible from Admin dashboard showing:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ 👥 Strategist Assignment Manager                              [×]         │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌─── Tabs ───────────────────────────────────────────────────────────────┐ │
│ │ [Companies (15)]  [Candidates (247)]  [Strategist Workload]           │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌─── Companies Tab ──────────────────────────────────────────────────────┐ │
│ │ Search: [________________] [Industry ▼] [Unassigned Only □]           │ │
│ │                                                                        │ │
│ │ Company              │ Current Strategist  │ SLA │ Actions            │ │
│ │ ─────────────────────┼────────────────────┼─────┼────────────────────│ │
│ │ ABB                  │ Sebastiaan B.      │ 3d  │ [Change] [Remove]  │ │
│ │ Qualogy              │ Sebastiaan B.      │ 3d  │ [Change] [Remove]  │ │
│ │ HEARS                │ —                  │ —   │ [Assign]           │ │
│ │                                                                        │ │
│ │ [Bulk Assign Selected] [Export Assignments]                           │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌─── Candidates Tab ─────────────────────────────────────────────────────┐ │
│ │ Search: [________________] [Unassigned Only □] [Active Only □]        │ │
│ │                                                                        │ │
│ │ Candidate           │ Current Strategist  │ Status │ Actions          │ │
│ │ ────────────────────┼────────────────────┼────────┼──────────────────│ │
│ │ Sarah Chen          │ —                  │ Active │ [Assign]         │ │
│ │ Mark Liu            │ Sebastiaan B.      │ Active │ [Change]         │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌─── Strategist Workload Tab ────────────────────────────────────────────┐ │
│ │ Strategist          │ Companies │ Candidates │ Active Apps │ Capacity │ │
│ │ ────────────────────┼───────────┼────────────┼─────────────┼──────────│ │
│ │ Sebastiaan B.       │ 15        │ 10         │ 23          │ ██████░░ │ │
│ │ (Unassigned)        │ 0         │ 237        │ —           │ —        │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2. Add Company Dialog Enhancement

When creating a new company, add strategist assignment step:

```text
┌─────────────────────────────────────────────────────────┐
│ Add New Company                                    [×]  │
├─────────────────────────────────────────────────────────┤
│ Step 3 of 3: Assign Strategist                          │
│                                                         │
│ Company: TechCorp                                       │
│                                                         │
│ Assign Strategist *                                     │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [Select strategist...]                          ▼  │ │
│ │   ○ Sebastiaan Brouwer (15 companies, 10 cand.)   │ │
│ │   ○ Auto-assign (round-robin)                      │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ SLA Response Time: [3] days                             │
│ Commission Split:  [20] %                               │
│                                                         │
│ [← Back]                            [Create Company]    │
└─────────────────────────────────────────────────────────┘
```

### 3. Candidate Strategist Assignment Dialog

A dedicated modal for assigning strategist to individual candidates:

```text
┌─────────────────────────────────────────────────────────┐
│ Assign Strategist                                  [×]  │
├─────────────────────────────────────────────────────────┤
│ Candidate: Sarah Chen                                   │
│ Status: Active • Last activity: 2 days ago              │
│                                                         │
│ Current Strategist: (None assigned)                     │
│                                                         │
│ Select Strategist                                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ○ Sebastiaan Brouwer                               │ │
│ │   15 companies • 10 candidates • 85% capacity      │ │
│ │                                                     │ │
│ │ ○ (More strategists would appear here)             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Assignment Notes (optional):                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ High-priority candidate for fintech roles          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [Cancel]                                     [Assign]   │
└─────────────────────────────────────────────────────────┘
```

### 4. Inline Quick Assignment

Add quick-edit capability to existing components:

**In UnifiedCandidateCard:**
- Add small "Assign Strategist" button/icon next to candidate name
- Shows current strategist with ability to change inline

**In Companies table:**
- Show strategist column with current assignment
- Click to open quick-change popover

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/admin/StrategistManagementModal.tsx` | Main admin modal with tabs |
| `src/components/admin/StrategistCompanyTab.tsx` | Companies assignment tab content |
| `src/components/admin/StrategistCandidateTab.tsx` | Candidates assignment tab content |
| `src/components/admin/StrategistWorkloadTab.tsx` | Workload overview tab content |
| `src/components/admin/CandidateStrategistDialog.tsx` | Individual candidate assignment dialog |
| `src/hooks/useStrategistWorkload.ts` | Hook for calculating strategist capacity |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Admin.tsx` | Add "Manage Strategists" button to open modal |
| `src/components/admin/UnifiedCandidateCard.tsx` | Add inline strategist display/edit |
| `src/components/companies/AddCompanyDialog.tsx` | Add strategist assignment step |
| `src/pages/Companies.tsx` | Show strategist column in company list |
| `src/components/admin/companies/CompanyRowActions.tsx` | Already has dialog - enhance it |

---

## Database Changes

No schema changes required - existing tables support this:
- `company_strategist_assignments` - for company assignments
- `candidate_profiles.assigned_strategist_id` - for candidate assignments

---

## Technical Implementation

### Hook: useStrategistWorkload

```typescript
// Calculates workload for each strategist
interface StrategistWorkload {
  id: string;
  name: string;
  avatar_url: string;
  email: string;
  companyCount: number;
  candidateCount: number;
  activeApplications: number;
  capacityPercent: number; // 0-100
}
```

### Component: StrategistManagementModal

- Uses Radix Dialog for modal
- Three tabs via Radix Tabs
- React Query for data fetching
- Bulk selection with checkboxes
- Search/filter functionality
- Optimistic updates for smooth UX

### Integration Points

1. **Admin Dashboard**: "Manage Strategists" button in header
2. **Companies Page**: Strategist column visible for admins
3. **Candidates Page**: Inline assignment in cards + bulk toolbar
4. **Add Company Flow**: Step 3 strategist selection

---

## User Experience Flow

### Admin Assigning Strategist to New Company

1. Admin clicks "Add Company"
2. Fills company details (Step 1-2)
3. Step 3: Select strategist from dropdown with workload indicators
4. Creates company with assignment

### Admin Reassigning Strategist

1. Admin opens Strategist Management Modal
2. Selects Companies tab
3. Searches for company
4. Clicks "Change" → selects new strategist
5. Confirms change

### Admin Bulk Assigning Candidates

1. Admin opens Strategist Management Modal
2. Selects Candidates tab
3. Filters to "Unassigned Only"
4. Selects multiple candidates via checkboxes
5. Uses "Bulk Assign" dropdown to select strategist
6. All selected candidates updated

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Time to assign strategist to company | ~5 clicks (find company → dropdown → dialog) | 2 clicks from modal |
| Visibility of all assignments | None (must check each company) | Full overview in one place |
| Candidate assignment | Bulk only, no individual | Both bulk and individual |
| Workload balancing | Manual counting | Visual capacity indicators |

---

## Priority Order

1. **P0**: StrategistManagementModal with Companies tab (immediate need)
2. **P0**: CandidateStrategistDialog for individual assignment
3. **P1**: Add strategist step to AddCompanyDialog
4. **P1**: Workload tab for capacity planning
5. **P2**: Inline assignment in cards (nice-to-have polish)
