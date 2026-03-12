

# Audit: Partners Without Company See All Jobs

## Root Cause

There are two layered issues causing Mark (marc@icon-amsterdam.com) and any partner without a properly resolved `companyId` to see all jobs:

### Issue 1 — Frontend Logic Gap (CRITICAL)

In `src/pages/Jobs.tsx` line 75:
```typescript
const isAdminOrPartner = (role === 'partner' || role === 'admin') && (userCompanyId || role === 'admin');
```

If a partner's `companyId` is `null` (e.g. `profiles.company_id` not set, even if `company_members` exists), `isAdminOrPartner` evaluates to `false`. The partner **falls through to the candidate view** (line 446), which runs an unfiltered query fetching ALL non-stealth jobs from the database.

### Issue 2 — RLS Too Permissive for SELECT (MEDIUM)

The `can_view_stealth_job` function allows ANY authenticated user to see ALL non-stealth jobs. This is correct for candidates (they need to browse jobs to apply), but means there's no database-level guard preventing partners from seeing other companies' jobs.

### Issue 3 — `companyId` Source is Legacy Field (ROOT CAUSE)

`RoleContext.tsx` line 33 reads `companyId` from `prefetch.profile?.company_id` — the legacy `profiles.company_id` column. Per project architecture, company membership should come from `company_members` table. If `profiles.company_id` is NULL but `company_members` has a valid entry, the partner appears "unassigned."

**Mark's data:** He has `profiles.company_id = b56e7de1...` (ICON) AND a `company_members` entry. So his specific case may be intermittent or resolved. But the systemic bug remains for any partner where `profiles.company_id` is NULL.

---

## Proposed Fix

### Change 1 — `src/contexts/RoleContext.tsx` (line 33)
Resolve `companyId` from `company_members` table (via prefetch data) instead of the legacy `profiles.company_id` field. Fall back to `profiles.company_id` if `company_members` data isn't available.

### Change 2 — `src/pages/Jobs.tsx` (lines 75, 446)
Add an explicit guard: when `role === 'partner'` and `companyId` is null, render a "No company assigned" empty state instead of falling through to the candidate job browser. The empty state should say something like: *"Your account isn't linked to a company yet. Please contact your admin or our team to get set up."*

### Change 3 — `src/components/partner/PartnerJobsHome.tsx` (line 140-164)
Add a defensive guard: if `companyId` is null and role is not admin, return early with an empty state instead of querying all jobs.

### Change 4 — Prefetch query enhancement
Ensure the role prefetch query includes the user's `company_members` record so `RoleContext` can use it as the primary source for `companyId`.

---

## Data Check

Mark's data looks correct in the DB — he has both `profiles.company_id` and `company_members` pointing to ICON. His issue may have been a timing/cache problem, but the systemic vulnerability exists for any partner where these diverge.

## Files Changed

| File | Change |
|------|--------|
| `src/contexts/RoleContext.tsx` | Resolve companyId from company_members (prefetch) with profiles.company_id fallback |
| `src/pages/Jobs.tsx` | Add partner-without-company empty state guard |
| `src/components/partner/PartnerJobsHome.tsx` | Add null companyId defensive guard with empty state |
| Prefetch hook (wherever role prefetch lives) | Include company_members data in prefetch |

