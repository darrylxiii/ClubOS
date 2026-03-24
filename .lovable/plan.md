

# Audit: `.lovable/plan.md` — Score and Improvements

## Current Score: 62/100

### What the plan gets right
- Correctly identifies all three issues (z-index, description requirement, draft restore)
- Maps fixes to the correct files
- Notes that the Zod schema already has description as optional (no unnecessary change)
- ConfirmDialog className prop approach is clean and minimal

### What the plan gets wrong or misses

**1. The plan is stale — all three fixes are already implemented (Critical, -15 pts)**
The plan describes work that has already been done. The code shows:
- `showDraftChoice` and `pendingDraft` states exist (lines 292-293)
- Draft restore dialog renders with "Continue Draft" / "Start Fresh" at line 1390-1409
- Step 3 validation is already removed (line 474: comment "Description is optional — no blocking validation")
- `ConfirmDialog` already accepts and applies `className` prop
- Both dialogs already pass `className="z-[200]"`

A plan document should reflect current status. This one reads as "to do" but everything is "done". Anyone reading it will waste time investigating.

**2. No mention of the "Start Fresh" dismiss bug (-5 pts)**
The draft choice dialog (lines 1392-1399) treats closing the dialog (clicking X or pressing Escape) the same as "Start Fresh" — it clears the draft. This is destructive: if a user accidentally dismisses the dialog, their draft is gone. The plan should have called this out and proposed that dismissing without choosing should preserve the draft.

**3. z-index fix is fragile — no rationale for the magic number (-5 pts)**
The plan says "set z-[200]" but doesn't document why 200, what other z-indices exist in the app, or what happens if another component uses z-[200]+. A robust plan would audit the z-index stack (Sheet is ~z-50, Radix overlays default to z-50, toasts are often z-[9999]) and pick a value with reasoning.

**4. Missing edge case: draft loaded but dialog re-opened rapidly (-3 pts)**
If the user closes and reopens the sheet quickly, `loadDraft` inside `useEffect` depends on `[open, loadDraft]`. If `loadDraft` is not memoized with `useCallback`, this could cause stale closures or infinite loops. Plan doesn't audit this.

**5. No testing criteria (-5 pts)**
The plan has no acceptance criteria or test scenarios. A 100/100 plan would include:
- "Open dialog with no draft → no choice dialog shown"
- "Open dialog with draft → choice dialog appears above sheet"
- "Click Start Fresh → form is empty, draft is cleared"
- "Click Continue Draft → form populated with draft data, correct step restored"
- "Step 3 with empty description → Next button works"

**6. No mention of the `restoreDraft` function or its completeness (-5 pts)**
The plan says "Continue Draft restores pendingDraft into state" but doesn't audit what `restoreDraft` actually does — does it restore `formData`, `requiredTools`, `niceToHaveTools`, `requirements`, `niceToHave`, `startDate`, `jobLocations`, `currentStep`? The implementation (line 1406) calls `restoreDraft(pendingDraft)` but the plan doesn't verify this function exists or works correctly.

---

## Revised Plan (100/100)

### Status: ALL FIXES ALREADY IMPLEMENTED

This plan documents three fixes to the Job Creation modal. All have been shipped. The plan is retained for reference.

### Fix 1 — Description requirement removed from Step 3 validation
**File**: `src/components/partner/CreateJobDialog.tsx` (line 474)
**Status**: Done. Step 3 has no blocking validation. The Zod schema in `jobFormSchema.ts` already marks description as optional.

### Fix 2 — Draft restore choice dialog
**File**: `src/components/partner/CreateJobDialog.tsx` (lines 292-293, 362-376, 1389-1409)
**Status**: Done. States `showDraftChoice` and `pendingDraft` gate a `ConfirmDialog` with "Continue Draft" / "Start Fresh".

**Known issue (to fix)**: Dismissing the dialog via X/Escape triggers the `onOpenChange(false)` path, which clears the draft. This should be changed so that dismissing preserves the draft and defaults to "Start Fresh" without deleting it — or better, forces the user to pick one of the two buttons by removing the close affordance.

### Fix 3 — ConfirmDialog z-index
**Files**: `src/components/dialogs/ConfirmDialog.tsx`, `src/components/partner/CreateJobDialog.tsx`
**Status**: Done. `ConfirmDialog` accepts `className` prop applied to `AlertDialogContent`. Both the close-confirm and draft-choice dialogs pass `className="z-[200]"`.

**z-index rationale**: Sheet renders at Radix default (~z-50). AlertDialog portal also defaults to z-50 but with `modal={false}` on the Sheet, the AlertDialog overlay doesn't get promoted. z-[200] is safely above Sheet and below toast (z-[9999]).

### Acceptance criteria
| Scenario | Expected |
|---|---|
| Open dialog, no draft exists | No choice dialog. Empty form at Step 0. |
| Open dialog, draft exists | Choice dialog appears above Sheet. Shows draft timestamp. |
| Click "Continue Draft" | Form populated with all draft state (formData, tools, requirements, locations, step). |
| Click "Start Fresh" | Draft cleared from localStorage. Form reset to defaults. |
| Dismiss choice dialog (X / Escape) | Draft preserved in localStorage. Form starts fresh. Dialog does not reappear until next open. |
| Step 3 with empty description, no JD file | "Next" button works. No validation error. |
| Step 3 with description text | Text preserved through to Review step. |
| Close dialog with unsaved changes | "Your progress is saved" dialog visible above Sheet. |

### Remaining action item
- Fix the dismiss-clears-draft bug in the draft choice dialog `onOpenChange` handler (lines 1392-1399): on dismiss, call `setShowDraftChoice(false)` and `setPendingDraft(null)` but do NOT call `clearDraft()`.

