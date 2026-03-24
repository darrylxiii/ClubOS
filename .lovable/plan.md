

# Multi-Company Ownership — Full Implementation Plan

## Summary

Enable users (especially founders) to be owners/admins of multiple companies. Add a company switcher to the sidebar, persist the active company selection, and ensure all 12+ pages that consume `companyId` work seamlessly.

## Current Single-Company Bottlenecks

1. **`useAuthPrefetch`** — `.limit(1).maybeSingle()` on `company_members`, returns only one membership
2. **`RoleContext`** — stores single `companyId` state, no `switchCompany` method
3. **`useUserCompany`** — `.limit(1)`, returns oldest membership only
4. **12 pages/hooks** destructure `{ companyId } = useRole()` and filter data by it:
   - `PartnerHome`, `SLADashboard`, `PartnerBilling`, `BillingDashboard`, `IntegrationsManagement`, `AuditLog`, `EnhancedAnalytics`, `CompanyApplications`, `Jobs`, `PartnerTargetCompanies`, `useAggregatedReviewQueue`, `EmployeeProfileManager`

## Architecture

```text
┌─────────────────────────────────────┐
│ useAuthPrefetch                     │
│  fetch ALL company_members (no limit)│
│  fetch active_company_id from prefs │
│  return companyMemberships[]        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ RoleContext                         │
│  companyId (active — backward compat)│
│  companies[] (all memberships)      │
│  switchCompany(id)                  │
│  persist to user_preferences        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ CompanySwitcher (sidebar, above     │
│  user footer, only if 2+ companies) │
└─────────────────────────────────────┘
```

## Changes

### 1. Database Migration
Add `active_company_id` column to `user_preferences`:
```sql
ALTER TABLE public.user_preferences
ADD COLUMN active_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
```

### 2. `src/hooks/useAuthPrefetch.ts`
- Remove `.limit(1).maybeSingle()` on `company_members` query; use full select returning array
- Change `companyMembership` (singular) to `companyMemberships` (array) in the return type
- Include `active_company_id` from preferences result
- Keep backward compat: also export `companyMembership` as first item for consumers that haven't migrated

### 3. `src/contexts/RoleContext.tsx`
- Add to context type:
  - `companies: Array<{ company_id: string; role: string; company_name?: string }>` 
  - `switchCompany: (companyId: string) => Promise<void>`
- Resolve active company: `preferences.active_company_id` → first membership → null
- `switchCompany()`: update state + upsert `user_preferences.active_company_id`
- `companyId` continues to return the active company (zero breaking changes for all 12 consumers)

### 4. `src/hooks/useUserCompany.ts`
- Remove `.limit(1)`, return all memberships
- Accept optional `activeCompanyId` to filter, or return the full array
- `EmployeeProfileManager` (only consumer) adjusted accordingly

### 5. `src/components/CompanySwitcher.tsx` (NEW)
- Compact dropdown showing all user companies with name + role badge
- Active company has a checkmark
- Clicking another company calls `switchCompany(id)` from RoleContext
- Only renders when `companies.length > 1`
- Uses company logo via existing `CompanyLogo` component when available

### 6. `src/components/AnimatedSidebar.tsx` / `src/components/AppLayout.tsx`
- Insert `CompanySwitcher` above the `SidebarFooter` in the sidebar
- Pass it through the existing sidebar footer slot or add a new slot above it

### 7. Zero Breaking Changes for Consumers
All 12 pages that do `const { companyId } = useRole()` continue to work identically — they receive the *active* company ID. No changes needed in:
- `PartnerHome`, `SLADashboard`, `PartnerBilling`, `BillingDashboard`, `IntegrationsManagement`, `AuditLog`, `EnhancedAnalytics`, `CompanyApplications`, `Jobs`, `PartnerTargetCompanies`, `useAggregatedReviewQueue`

### 8. Query Invalidation on Company Switch
- When `switchCompany` is called, invalidate all React Query caches that include `companyId` in their query key
- This ensures all partner pages refetch data for the newly selected company
- Use `queryClient.invalidateQueries({ predicate: (query) => ... })` pattern

## Key Design Decisions

- **Backward compatible**: `companyId` from `useRole()` = active company. No consumer changes.
- **Persistence**: `active_company_id` in `user_preferences` survives refresh/cross-device.
- **Fallback**: No active company set → defaults to first membership (current behavior).
- **Admin/Strategist**: These roles don't filter by `companyId` (they see everything), unaffected.
- **Role per company**: Each `company_members` row has its own `role` — the company-level role context updates on switch.

## Files Changed

| File | Change |
|------|--------|
| **Migration** | Add `active_company_id` to `user_preferences` |
| `src/hooks/useAuthPrefetch.ts` | Fetch all memberships; include `active_company_id` |
| `src/contexts/RoleContext.tsx` | Add `companies[]`, `switchCompany()`, query invalidation |
| `src/hooks/useUserCompany.ts` | Remove `.limit(1)`, return all memberships |
| `src/components/CompanySwitcher.tsx` | **New** — dropdown in sidebar |
| `src/components/AppLayout.tsx` | Integrate CompanySwitcher above sidebar footer |

