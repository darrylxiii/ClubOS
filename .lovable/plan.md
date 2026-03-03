

# Full Audit: CreateJobDialog — Score 78/100

## What is working well (+78)
- Multi-step wizard structure is solid (5 steps, clear progression)
- RBAC guards properly hide Pipeline, Fee, and Stealth from partners
- Calendar date picker allows today (fixed)
- Title min-length is 2 (fixed)
- Description optional when file uploaded (fixed)
- AED currency added
- Task number uses timestamp (fixed)
- Mobile step labels visible
- Select dropdowns work inside Sheet (z-[100])
- Draft auto-save every 30s

## What is STILL BROKEN (-22 points)

### CRITICAL: Location Autocomplete Dropdown Invisible (-8)

**Root cause confirmed:** `EnhancedLocationAutocomplete` renders its `PopoverContent` at default `z-50` (from `popover.tsx`). The Sheet overlay is `z-[80]`. The dropdown renders BEHIND the overlay and is unclickable.

The Calendar PopoverContent was fixed with `z-[100] pointer-events-auto` (line 853), but no one applied the same fix to `EnhancedLocationAutocomplete`.

**Fix:** Add a `popoverClassName` prop to `EnhancedLocationAutocomplete` and pass `z-[100] pointer-events-auto` from `CreateJobDialog`. Alternatively, hard-code `z-[100]` directly in the `EnhancedLocationAutocomplete`'s `PopoverContent` since it should always render above overlays.

**Files:** `src/components/ui/enhanced-location-autocomplete.tsx` (line 338-339)

### CRITICAL: No Close Confirmation (-5)

`handleClose` (line 666-670) silently saves draft and closes. For a form that takes 5-10 minutes to fill, accidentally closing it (clicking overlay, pressing Escape, clicking X) should prompt "Your progress is saved. Leave anyway?" using the existing `ExitIntentPopup` pattern already used in partner funnel and candidate onboarding.

**Fix:** Add `ConfirmDialog` or `ExitIntentPopup` pattern to `handleClose` when `hasUnsavedChanges` is true.

**File:** `src/components/partner/CreateJobDialog.tsx`

### HIGH: Draft Does Not Restore Full State (-4)

`useJobFormDraft` only saves `formData`, `requiredTools`, and `niceToHaveTools`. It does NOT save or restore:
- `requirements` (tag array)
- `niceToHave` (tag array)
- `startDate` (Date object)
- `jobLocations` (multi-location array)
- `currentStep` (which step user was on)
- `isStealthEnabled`, `stealthViewerIds`
- `pipelineType`, `feeConfig`

When a draft is restored, the user sees the basic form fields but loses all tag inputs, location data, and step progress. This makes the draft feature misleading — it says "Draft restored" but half the data is gone.

**Fix:** Extend `useJobFormDraft` to include `requirements`, `niceToHave`, `startDate`, `currentStep`, and `jobLocations` in the draft payload. On restore, set all these states.

**Files:** `src/hooks/useJobFormDraft.ts`, `src/components/partner/CreateJobDialog.tsx`

### MEDIUM: Salary Accepts Negative Values (-2)

The salary Input fields have `min="0"` HTML attribute but no Zod validation or step validation prevents negative numbers. A user can type `-50000` and submit it.

**Fix:** Add `.refine()` to `jobFormSchema` for `salary_min` and `salary_max` to reject values below 0. Also add step 2 validation.

**File:** `src/schemas/jobFormSchema.ts`

### MEDIUM: Remote Toggle Still Visible for Hybrid/Flexible (-2)

The `hideRemoteToggle` prop is only set to `true` when `location_type === 'onsite'` (line 813). For `hybrid` and `flexible`, the remote toggle in `MultiLocationInput` still appears. But the work model is already chosen via RadioCards in Step 1 — showing a second "Remote Position" toggle inside MultiLocationInput is confusing and contradictory. The work model cards already handle this. The toggle should be hidden for ALL location types in the CreateJobDialog context since the RadioCards supersede it.

**Fix:** Always pass `hideRemoteToggle={true}` in the CreateJobDialog, since the work model is already explicitly chosen.

**File:** `src/components/partner/CreateJobDialog.tsx` (line 813)

### LOW: No Keyboard Shortcuts (-1)

No `Ctrl+Enter` to submit from the last step. No `Escape` to go back a step (currently closes the Sheet entirely).

**Fix:** Add `onKeyDown` handler to the Sheet body: `Ctrl+Enter` on Step 4 triggers submit. Not blocking but good UX.

**File:** `src/components/partner/CreateJobDialog.tsx`

---

## Implementation Plan (10 fixes)

### Fix 1: Location Autocomplete z-index (CRITICAL)
**File:** `src/components/ui/enhanced-location-autocomplete.tsx` (line 338-339)
- Change the `PopoverContent` className to include `z-[100] pointer-events-auto`:
```
className="w-[var(--radix-popover-trigger-width)] p-0 overflow-hidden z-[100] pointer-events-auto"
```

### Fix 2: Close Confirmation Dialog
**File:** `src/components/partner/CreateJobDialog.tsx`
- Add state: `const [showCloseConfirm, setShowCloseConfirm] = useState(false)`
- Update `handleClose`: if `hasUnsavedChanges && submitStep === "idle"`, set `showCloseConfirm = true` instead of closing
- Add a `ConfirmDialog` (already exists in the project) at the bottom of the component:
  - Title: "Your progress is saved"
  - Description: "Your draft has been saved and will be restored next time you open this form."
  - Confirm: "Leave" / Cancel: "Continue editing"
  - On confirm: `saveDraft(); onOpenChange(false);`

### Fix 3: Extend Draft to Include Full State
**File:** `src/hooks/useJobFormDraft.ts`
- Extend `DraftData` interface to include: `requirements: string[]`, `niceToHave: string[]`, `startDateISO: string | null`, `currentStep: number`, `jobLocations: LocationInput[]`
- Update `saveDraft` to accept these additional params (add them as hook arguments)
- Update `loadDraft` return type accordingly

**File:** `src/components/partner/CreateJobDialog.tsx`
- Pass additional state to the draft hook
- On draft restore, set `requirements`, `niceToHave`, `startDate` (parse from ISO), `currentStep`, `jobLocations`

### Fix 4: Salary Negative Value Guard
**File:** `src/schemas/jobFormSchema.ts`
- Add a second `.refine()` to check that parsed salary_min and salary_max are >= 0 when provided

**File:** `src/components/partner/CreateJobDialog.tsx`
- Add step 2 validation: if salary_min or salary_max is provided and < 0, show error

### Fix 5: Always Hide Remote Toggle in CreateJobDialog
**File:** `src/components/partner/CreateJobDialog.tsx` (line 813)
- Change `hideRemoteToggle={formData.location_type === 'onsite'}` to `hideRemoteToggle={true}`
- The work model RadioCards in Step 1 already handle remote/hybrid/flexible/onsite. The toggle in MultiLocationInput is redundant in this context.

### Fix 6: Ctrl+Enter to Submit
**File:** `src/components/partner/CreateJobDialog.tsx`
- Add `onKeyDown` to the Sheet body div (line 1108):
```
onKeyDown={(e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && currentStep === TOTAL_STEPS - 1 && !isSubmitting) {
    handleSubmit();
  }
}}
```

### Fix 7: Summary Row Span Fix
**File:** `src/components/partner/CreateJobDialog.tsx` (line 1053)
- The description SummaryRow is inside a `grid-cols-2` which truncates long text. Change description to span full width:
```
{formData.description && (
  <div className="col-span-2">
    <SummaryRow label="Description" value={formData.description.length > 150 ? formData.description.slice(0, 150) + '...' : formData.description} />
  </div>
)}
```

### Fix 8: Reset Form on Close (non-complete)
**File:** `src/components/partner/CreateJobDialog.tsx` (line 292)
- In the `useEffect` for `open`, when `!open`, also call `resetForm()` to clear stale state from memory so re-opening starts fresh (draft will be loaded from localStorage if available):
```
} else {
  setCurrentStep(0);
  resetForm(); // Clear stale in-memory state
}
```

### Fix 9: Company Select Disabled When Pre-filled
**File:** `src/components/partner/CreateJobDialog.tsx` (line 684)
- If `companyId` prop is provided, disable the company Select:
```
disabled={isSubmitting || !!companyId}
```

### Fix 10: Tag Input Comma Support
**File:** `src/components/partner/CreateJobDialog.tsx` (TagInput component, lines 102-143)
- Update `onKeyDown` to also handle comma as a separator:
```
if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
```
- Also handle paste with comma-separated values:
```
onPaste={(e) => {
  e.preventDefault();
  const text = e.clipboardData.getData('text');
  const items = text.split(',').map(s => s.trim()).filter(s => s && !tags.includes(s));
  if (items.length) onChange([...tags, ...items]);
}}
```

---

## Files to Edit

| File | Fixes |
|------|-------|
| `src/components/ui/enhanced-location-autocomplete.tsx` | Fix 1 (z-index) |
| `src/hooks/useJobFormDraft.ts` | Fix 3 (extended draft) |
| `src/schemas/jobFormSchema.ts` | Fix 4 (salary validation) |
| `src/components/partner/CreateJobDialog.tsx` | Fixes 2, 3, 4, 5, 6, 7, 8, 9, 10 |

## What Does NOT Change
- Edge function `notify-admin-job-submitted`
- Database schema (no migration)
- Sheet component (`sheet.tsx`)
- All sub-components (ToolSelector, StealthJobToggle, PipelineTypeSelector, JobFeeConfiguration, MultiLocationInput)
- Popover base component (fix is in the consumer, not the base)

