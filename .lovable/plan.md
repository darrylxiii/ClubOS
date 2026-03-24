

# Fix: Location Picker Death Loop + Save Multi-Locations to Backend

## Problem

When creating a non-remote job, the **Primary Location** field uses `CompanyOfficeLocationPicker`, which opens a Popover containing the office list. If no offices exist, clicking "Add new location" renders `EnhancedLocationAutocomplete` *inside* that Popover. The autocomplete's own suggestion dropdown (also a Popover/Portal) cannot display properly because it's nested inside another Popover — clicks on suggestions close the outer popover, or the dropdown simply doesn't render visibly. Result: user can never select a location, can never pass Step 1 validation, infinite loop.

## Fix Plan

### 1. Eliminate nested popover in CompanyOfficeLocationPicker

**File**: `src/components/jobs/CompanyOfficeLocationPicker.tsx`

When `addingNew` is true, render the location search form **below the trigger button** (inline, outside the Popover) instead of inside the PopoverContent. This removes the nested-popover problem entirely.

- Close the Popover when switching to `addingNew` mode
- Show the `EnhancedLocationAutocomplete` + "Save as office" checkbox in a bordered card below the picker button
- The autocomplete's suggestion dropdown now renders at the top level with no interference

### 2. Handle empty-offices state gracefully

**File**: `src/components/jobs/CompanyOfficeLocationPicker.tsx`

When `offices.length === 0` and not loading:
- Auto-enter `addingNew` mode (skip the empty dropdown entirely)
- Show a helpful message: "No offices yet — search for a location below"

### 3. Save additional locations to `job_locations` table

**File**: `src/components/partner/CreateJobDialog.tsx`

After the job is created (line ~645), insert both the primary location and all `jobLocations` entries into the `job_locations` table:

```
// Insert primary location
INSERT INTO job_locations (job_id, location_type, city, country_code, latitude, longitude, formatted_address, is_primary)

// Insert additional locations from jobLocations array
```

This uses the existing `job_locations` table schema (already created in migrations). No schema changes needed.

### 4. Minor wizard improvements found during audit

**File**: `src/components/partner/CreateJobDialog.tsx`

- When `location_type` changes away from `remote`, clear the auto-set "Remote" location string so the user must pick a real location
- Add the `jobLocations` to the Review step summary (Step 4) so users can see all locations before submitting

## Files to Change

| File | Change |
|------|--------|
| `src/components/jobs/CompanyOfficeLocationPicker.tsx` | Move "add new" form out of Popover into inline section; auto-enter add mode when no offices |
| `src/components/partner/CreateJobDialog.tsx` | Insert `jobLocations` into `job_locations` table on submit; clear location when switching from remote; show locations in review |

No database migrations needed — `job_locations` table already exists with the correct schema.

