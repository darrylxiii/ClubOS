

# Job Creation Dialog — Fix + Audit

## The Core Bug: Company Selector Locked for Admins

**Root cause**: Line 737 in `CreateJobDialog.tsx`:
```
disabled={isSubmitting || !!companyId}
```
When `companyId` is passed as a prop (which happens from `PartnerJobsHome`, `JobManagement`, `CompanyPage`), the company dropdown is disabled for ALL roles including admin. Admins should always be able to change the company.

**Fix**: Change the disabled condition to only lock for non-admin/strategist roles:
```
disabled={isSubmitting || (!!companyId && isPartner)}
```

This way partners stay locked to their company, but admins/strategists can switch to any partner.

---

## Audit Findings

### What Works Well
- 5-step wizard flow (Basics, Location, Compensation, Details, Review) is clean
- Draft persistence with `useJobFormDraft`
- Close confirmation with unsaved changes
- Role-based field visibility (Stealth, Pipeline, Fees hidden from partners)
- Auto-submit for review with admin task creation for partner submissions
- Ctrl+Enter shortcut on review step
- Multi-location input with geocoding
- File uploads (JD + supporting docs)
- Tag input with comma/paste support for requirements/nice-to-have

### Issues to Fix

1. **Company selector locked for admins** (critical — the reported bug)

2. **`fetchCompanies` has no role-based filtering** — It fetches ALL active companies. For partners, it should only show companies they're a member of (via `company_members`). Currently partners could theoretically select a different company if `companyId` were not locked. The lock masks this bug. We should add proper filtering for partners while unlocking for admins.

3. **No company search/filter** — If there are many partner companies, the `SelectContent` becomes a long unfiltered list. Should add a searchable combobox for admins.

4. **`resetForm` does not clear `jobLocations`** — Line 698 sets `setJobLocations([])` which is correct. Actually this is fine.

5. **Review step description truncation** — Line 1125 truncates at 150 chars with `…`. Good, but the requirements/nice-to-have only show count, not the actual items. Users can't verify what they entered without going back.

6. **No "Responsibilities" or "Benefits" fields** — The `JobFull` type supports `responsibilities` and `benefits` arrays but the create dialog doesn't expose them.

---

## Implementation Plan

### Fix 1: Unlock company selector for admins
- Change line 737 disabled condition to `disabled={isSubmitting || (!!companyId && isPartner)}`
- When admin changes company, update `formData.company_id` accordingly

### Fix 2: Role-based company fetching
- For admin/strategist: fetch all active companies (current behavior — correct)
- For partners: filter by `company_members` table to only show companies they belong to
- Update `fetchCompanies` to branch based on `isPartner`

### Fix 3: Searchable company selector for admins
- Replace `Select` with a searchable combobox (using `cmdk` which is already installed) so admins can quickly find partner companies when the list grows

### Fix 4: Show requirements/nice-to-have details in Review
- In `renderStep4`, show actual tag items instead of just count

These are focused, targeted fixes. The dialog is otherwise well-built.

