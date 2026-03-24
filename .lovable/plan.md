
# Multi-Company Ownership — Implementation

## Status: COMPLETE

Users (especially founders) can now be owners/admins of multiple companies with a seamless company switcher in the sidebar.

### Change 1 — Database Migration
Added `active_company_id` (uuid, FK to companies) to `user_preferences` to persist selected company across sessions.

### Change 2 — useAuthPrefetch multi-company
Removed `.limit(1).maybeSingle()` on `company_members` query. Now fetches ALL memberships with company names. Returns `companyMemberships[]` array + `activeCompanyId` from preferences. Backward-compat `companyMembership` still available as first item.

### Change 3 — RoleContext upgraded
Added `companies[]` array and `switchCompany(companyId)` method to context. Active company resolved from: `active_company_id` preference → first membership → legacy `profile.company_id`. On switch: optimistic state update → persist to DB → invalidate all company-dependent React Query caches. Realtime subscription also handles external company switches.

### Change 4 — useUserCompany returns array
Returns `UserCompany[]` instead of single company. All consumers updated (`EmployeeProfileManager` uses `[0]`).

### Change 5 — CompanySwitcher component (NEW)
Compact dropdown in sidebar footer area. Shows all companies with logos, names, and role badges. Active company has checkmark. Only renders when `companies.length >= 2`. Uses `CompanyLogoStatic` for performance.

### Change 6 — AppLayout integration
CompanySwitcher inserted above SidebarFooter in the sidebar.

### Zero Breaking Changes
All 12+ pages using `const { companyId } = useRole()` continue working unchanged — they receive the active company ID.
