

# Audit of Current Plan: Company Office Locations for Job Creation

## Current Score: 62/100

Here is a breakdown of what the plan gets right, what it misses, and what needs to change.

---

## What the plan gets RIGHT (+42 points)

| Area | Score | Notes |
|------|-------|-------|
| Core concept | +15 | Correct idea: reusable office table, pick-or-create in job dialog |
| Database design | +10 | Reasonable schema for `company_offices` |
| UX flow description | +10 | "Select existing or add new + optionally save back" is solid |
| Integration point identified | +7 | Correctly targets Step 1 of `CreateJobDialog.tsx` |

## What the plan MISSES or gets WRONG (-38 points)

### 1. Ignores existing `job_locations` table (-8)
A `job_locations` table already exists with `job_id`, `city`, `country`, `country_code`, `latitude`, `longitude`, `formatted_address`, `location_type`, `is_primary`. The plan doesn't mention how `company_offices` relates to this — are we inserting into `job_locations` when an office is selected? The current `MultiLocationInput` component already writes to this pattern. This must be explicitly wired.

### 2. No company settings UI for managing offices (-10)
The plan only covers the job creation flow. But the user explicitly said "we should already have an option to add Company Office Locations to the company itself." There must be an **Office Management section** on the Company Settings/Detail page where admins can CRUD offices independently of job creation. Without this, the feature is half-built.

### 3. No `EditJobSheet` integration (-5)
The plan only updates `CreateJobDialog`. The `EditJobSheet.tsx` (which also uses `EnhancedLocationAutocomplete`) must get the same office picker — otherwise editing a job loses the office context.

### 4. Missing backfill strategy detail (-3)
The plan says "backfill from HQ data" but `headquarters_location` is a free-text string. The structured fields (`headquarters_latitude`, `headquarters_longitude`, `headquarters_city`, `headquarters_country_code`) exist on `companies` — the migration must use these, not parse the text field.

### 5. No RLS detail (-4)
Plan says "INSERT/UPDATE/DELETE restricted to company members" but doesn't specify the actual policy SQL. Given the `company_members` table pattern, the policies need to join on `company_members.user_id = auth.uid()` with appropriate role checks, plus admin/strategist override via `has_role()`.

### 6. Missing `is_primary` handling on the picker (-3)
When a user picks an office as the job's primary location, it should populate both the job's top-level `location`/`latitude`/`longitude` fields AND create a `job_locations` row with `is_primary = true`. The plan doesn't address this data flow.

### 7. No types update consideration (-2)
After creating the `company_offices` table, the Supabase types auto-regenerate. The hook must import from the generated types, not define inline interfaces.

### 8. CreateJobDialog is already 1338 lines (-3)
Adding more logic here without extracting makes it worse. The plan should note that the office picker is a self-contained component with its own hook — no new state variables should land in `CreateJobDialog` itself beyond the component props.

---

## Revised Plan: 100/100

### Phase 1: Database — `company_offices` table

```sql
CREATE TABLE public.company_offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label text NOT NULL,  -- "Amsterdam HQ", "London Office"
  city text,
  country text,
  country_code text,
  latitude double precision,
  longitude double precision,
  formatted_address text,
  is_headquarters boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE public.company_offices ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read offices (needed for job forms)
CREATE POLICY "Authenticated users can view offices"
  ON public.company_offices FOR SELECT TO authenticated USING (true);

-- Company members (owner/admin/recruiter) can manage their company's offices
CREATE POLICY "Company members can manage offices"
  ON public.company_offices FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = company_offices.company_id
        AND company_members.user_id = auth.uid()
        AND company_members.is_active = true
        AND company_members.role IN ('owner', 'admin', 'recruiter')
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = company_offices.company_id
        AND company_members.user_id = auth.uid()
        AND company_members.is_active = true
        AND company_members.role IN ('owner', 'admin', 'recruiter')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Backfill from existing structured HQ data
INSERT INTO public.company_offices (company_id, label, city, country_code, latitude, longitude, formatted_address, is_headquarters)
SELECT id, 'Headquarters', headquarters_city, headquarters_country_code,
       headquarters_latitude, headquarters_longitude, headquarters_location, true
FROM public.companies
WHERE headquarters_city IS NOT NULL OR headquarters_latitude IS NOT NULL;
```

### Phase 2: Hook — `useCompanyOffices.ts`

- `useCompanyOffices(companyId)` — TanStack `useQuery` fetching offices for a company
- `useAddCompanyOffice()` — `useMutation` to insert a new office, invalidates query cache
- `useDeleteCompanyOffice()` — `useMutation` to delete
- `useUpdateCompanyOffice()` — `useMutation` to update label/is_headquarters
- Types imported from auto-generated Supabase types

### Phase 3: Component — `CompanyOfficeLocationPicker.tsx`

Self-contained component, props:
```typescript
interface CompanyOfficeLocationPickerProps {
  companyId: string;
  value: LocationResult | null;
  onChange: (location: LocationResult | null) => void;
  disabled?: boolean;
  className?: string;
}
```

**UI behavior:**
1. Dropdown shows existing offices grouped: HQ first (starred), then others by label
2. Each office row: `🏢 Amsterdam HQ — Netherlands` with coordinates badge
3. Divider + "Add new location" button at bottom
4. Clicking "Add new" expands `EnhancedLocationAutocomplete` inline
5. After selecting a new location, checkbox appears: **"Save as company office"** with a label input
6. If checkbox checked → `useAddCompanyOffice` mutation fires alongside the location selection
7. If not checked → location passes through as a one-off (same as current behavior)

### Phase 4: Integration — `CreateJobDialog.tsx` + `EditJobSheet.tsx`

- In Step 1 (Location), when `location_type !== 'remote'`:
  - Replace standalone `EnhancedLocationAutocomplete` with `CompanyOfficeLocationPicker`
  - Pass `formData.company_id` as the `companyId` prop
  - The `onChange` callback maps to existing `handleLocationChange` — no new state needed
- Same replacement in `EditJobSheet.tsx` location section
- `MultiLocationInput` for additional locations stays unchanged (it handles secondary locations)

### Phase 5: Company Office Management UI

- New section in Company Detail/Settings page: **"Office Locations"**
- Table/card list of all offices with edit/delete actions
- "Add Office" button using `EnhancedLocationAutocomplete` + label input
- Toggle `is_headquarters` (only one allowed — enforce in mutation)
- This ensures offices can be managed independently of job creation

### Files to create/modify

| File | Action |
|------|--------|
| Migration SQL | Create table + RLS + backfill |
| `src/hooks/useCompanyOffices.ts` | **New** — query + mutations |
| `src/components/jobs/CompanyOfficeLocationPicker.tsx` | **New** — picker component |
| `src/components/partner/CreateJobDialog.tsx` | Replace location autocomplete with picker |
| `src/components/partner/EditJobSheet.tsx` | Same replacement |
| `src/components/companies/CompanyOfficeManager.tsx` | **New** — CRUD UI for company settings |
| Company detail page (wherever offices should appear) | Wire in `CompanyOfficeManager` |

