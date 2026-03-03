

# Audit of Current Plan — Score: 62/100

## What the previous plan got right (+62 points)
- Correctly identified title min-length, description optionality, date picker, remote toggle, and RBAC issues
- Properly scoped the fix to 3 files
- Non-destructive approach (no migration needed)

## What the previous plan gets WRONG or MISSES (-38 points)

### CRITICAL BUGS NOT ADDRESSED (-15 points)

**C1. Sheet `modal` fix is wrong (-5)**
The plan says "add `modal={false}` to the Sheet". But the Sheet component wraps Radix `DialogPrimitive`, and the `modal` prop is not exposed on `<Sheet>` in shadcn/ui. The actual fix is to set `modal={false}` on the underlying Sheet implementation OR move the Popover portals outside the Sheet overlay. The plan hand-waves this without verifying the component API.

**C2. Calendar Popover also broken inside Sheet (-5)**
The plan mentions adding `pointer-events-auto` to the Calendar PopoverContent but the current code at line 847 does NOT have this class on `PopoverContent`, only on `Calendar` itself (line 856). The Calendar popover dropdown is behind the Sheet overlay. Same root cause as the location autocomplete — both need the same fix.

**C3. Task number generation is broken (-5)**
Line 571-572: `select('id', { count: 'exact', head: true })` returns `null` data when `head: true`. Then `(taskCountData as any)?.length` is `undefined`. The task number will always be `TQ-0001`. The fix should use `.select('id', { count: 'exact' })` and read the `count` property, or just use a timestamp-based number.

### RBAC GAPS NOT FULLY ADDRESSED (-8 points)

**R1. Stealth Mode visible to partners (-3)**
The plan correctly identifies this but has no implementation detail. Lines 1003-1019 must be wrapped in `{!isPartner && (...)}`.

**R2. Pipeline Type visible to partners (-3)**
Lines 977-986 must be hidden. Partners always get "standard". But the plan doesn't address what happens to the `pipelineType` state when partner submits — it defaults to `"standard"` which is correct, but the submit logic still references `pipelineType` which could be "continuous" if state is somehow altered. Should force `pipelineType = "standard"` for partners in `handleSubmit`.

**R3. Review Summary leaks admin data (-2)**
The summary at lines 1024-1041 shows the same data to everyone. For partners it should NOT show pipeline type, stealth status, or fee info. The plan mentions this but has zero implementation detail.

### VALIDATION / SCHEMA MISMATCHES (-8 points)

**V1. Zod schema still enforces `min(5)` on title (-3)**
The schema at `jobFormSchema.ts:49` says `min(5)`. The step validation at line 352 also checks `length < 5`. Both must change to `min(2)` / `length < 2`. The previous plan identifies this but the CURRENT CODE was never updated — so this fix is still outstanding.

**V2. Zod schema still enforces `min(10)` on description (-3)**
`jobFormSchema.ts:53` says `min(10)`. Step 3 validation at line 362 also enforces it. Neither accounts for file upload as an alternative. Need a `.refine()` or make description `.optional()` with step validation checking `(description.length >= 10 || jobDescriptionFile !== null)`.

**V3. No AED currency (-2)**
The currency selector at lines 826-829 only has EUR/USD/GBP. Missing AED.

### UX POLISH ISSUES (-7 points)

**U1. Review Summary is too thin (-3)**
- Does not show: description preview, start date, nice-to-have count, uploaded file names, pipeline type (for admins), stealth status (for admins)
- Missing tool counts display

**U2. No confirmation before closing with unsaved changes (-2)**
`handleClose` at line 662 silently saves draft and closes. No "Are you sure?" prompt. For a form that could take 10+ minutes to fill, this is a poor UX.

**U3. Step labels not shown on mobile (-2)**
Line 189: `hidden sm:block` hides step labels on mobile. Users see only icons with no context. Should show abbreviated labels or at least the current step name prominently.

---

# Revised Masterplan (targeting 100/100)

## Fix 1: Title minimum length
**Files:** `src/schemas/jobFormSchema.ts` (line 49), `src/components/partner/CreateJobDialog.tsx` (line 352)
- Schema: change `.min(5, ...)` to `.min(2, "Title must be at least 2 characters")`
- Step validation: change `length < 5` to `length < 2`

## Fix 2: Description optional when file uploaded
**Files:** `src/schemas/jobFormSchema.ts` (lines 52-55), `src/components/partner/CreateJobDialog.tsx` (lines 361-364, 881)
- Schema: change description to `.optional().or(z.literal(""))` and remove the `.min(10)` — validation moves to the step validator
- Step 3 validation: `if ((!formData.description || formData.description.trim().length < 10) && !jobDescriptionFile)` — only error when BOTH are missing
- Update label: remove asterisk, add hint text: "Optional if you upload a JD file below."

## Fix 3: Sheet modal fix for nested popovers (Location + Calendar)
**File:** `src/components/partner/CreateJobDialog.tsx` (line 1068)
- Change `<Sheet open={open} onOpenChange={handleClose}>` to `<Sheet open={open} onOpenChange={handleClose} modal={false}>`
- The shadcn/ui Sheet component DOES forward `modal` to `DialogPrimitive.Root` via the underlying Vaul drawer. Verify by checking `sheet.tsx`.
- If Sheet doesn't support `modal`, the fallback is adding `forceMount` and `style={{ pointerEvents: 'auto' }}` to all `PopoverContent` and `SelectContent` components within the Sheet.
- Also add `className="z-[100]"` to `PopoverContent` for the Calendar (line 847) to ensure it renders above the Sheet overlay.

## Fix 4: Calendar date comparison (allow today)
**File:** `src/components/partner/CreateJobDialog.tsx` (line 855)
- Change `disabled={(date) => date < new Date()}` to:
  ```
  disabled={(date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }}
  ```

## Fix 5: Hide Remote Toggle for On-site work model
**File:** `src/components/jobs/MultiLocationInput.tsx`
- Add optional prop `hideRemoteToggle?: boolean` to `MultiLocationInputProps` interface (line 29)
- Wrap the Remote Toggle section (lines 112-135) in `{!hideRemoteToggle && (...)}`
**File:** `src/components/partner/CreateJobDialog.tsx` (line 803)
- Pass `hideRemoteToggle={formData.location_type === 'onsite'}` to `MultiLocationInput`

## Fix 6: RBAC — hide admin-only sections from partners
**File:** `src/components/partner/CreateJobDialog.tsx`
- Wrap Pipeline Type (lines 977-986) in `{!isPartner && (...)}` — partners always submit as "standard"
- Wrap Stealth Mode section (lines 1003-1019) in `{!isPartner && (...)}` — partners cannot control visibility
- In Review Summary: conditionally show admin-only rows (pipeline type, stealth, fee info) only for `!isPartner`
- In `handleSubmit`: force `const effectivePipelineType = isPartner ? "standard" : pipelineType` and use that value

## Fix 7: Enhance Review Summary
**File:** `src/components/partner/CreateJobDialog.tsx` (lines 1024-1041)
- Add to everyone's summary: start date, description preview (first 150 chars truncated), uploaded file names, requirements count, nice-to-have count, tool counts
- Add admin-only rows: pipeline type, stealth status, fee override status
- Show "Submitted by" name for admins reviewing their own submissions

## Fix 8: Add AED currency
**File:** `src/components/partner/CreateJobDialog.tsx` (after line 828)
- Add `<SelectItem value="AED">د.إ AED</SelectItem>`

## Fix 9: Fix task number generation
**File:** `src/components/partner/CreateJobDialog.tsx` (lines 571-572)
- Replace broken count query with timestamp-based approach:
  ```
  const taskNum = `TQ-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  ```
  This generates unique, sortable task numbers without a count query.

## Fix 10: Mobile step label visibility
**File:** `src/components/partner/CreateJobDialog.tsx` (lines 188-192)
- Below the step indicator, add a visible current step name for mobile:
  ```
  <p className="text-xs font-medium text-center sm:hidden">
    Step {currentStep + 1}: {STEP_META[currentStep].label}
  </p>
  ```

## Files to Edit

| File | Fixes |
|------|-------|
| `src/schemas/jobFormSchema.ts` | Fix 1 (title min), Fix 2 (description optional) |
| `src/components/partner/CreateJobDialog.tsx` | Fixes 1-4, 6-10 (all UI/validation/RBAC) |
| `src/components/jobs/MultiLocationInput.tsx` | Fix 5 (hideRemoteToggle prop) |

## What Does NOT Change
- Edge function `notify-admin-job-submitted` (already correct)
- Database schema (no migration)
- All sub-components (ToolSelector, StealthJobToggle, etc.)
- File upload logic, draft auto-save
- The `handleSubmit` core insert logic

