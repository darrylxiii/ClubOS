

# Fix: Job Creation Modal — Full Audit and Fixes

## Issues Found

1. **Draft popup renders behind the Sheet** — The Sheet uses `modal={false}`, so the `ConfirmDialog` (AlertDialog) appears behind it. The AlertDialog z-index conflicts with the Sheet's z-index.

2. **Description is required (shouldn't be)** — Step 3 validation (line 478-482) blocks progression unless description is >= 10 chars or a JD file is uploaded. The Zod schema also marks description as optional but the step validation overrides that. User only needs a title to create a job.

3. **No draft restore choice** — When opening the dialog with an existing draft (line 362-374), it auto-restores without asking. User wants a choice: "Continue from last draft" or "Start fresh".

## Fix Plan

### File: `src/components/partner/CreateJobDialog.tsx`

**Fix 1 — Remove description requirement from Step 3 validation**
- Delete the Step 3 validation block (lines 478-482) that requires description or JD file
- Step 3 becomes fully optional — no blocking validation

**Fix 2 — Add draft restore choice dialog**
- Add a new state `showDraftChoice` (boolean) and `pendingDraft` (stores the loaded draft)
- In the `useEffect` on open: instead of auto-restoring, check if a draft exists. If yes, set `showDraftChoice = true` and store the draft in `pendingDraft`
- Render a second `ConfirmDialog` (or inline AlertDialog) with:
  - Title: "Continue where you left off?"
  - Description: "You have an unsaved draft from [time ago]. Would you like to continue or start fresh?"
  - "Continue Draft" button → restores `pendingDraft` into state
  - "Start Fresh" button → calls `clearDraft()` and `resetForm()`

**Fix 3 — Fix ConfirmDialog z-index (renders behind Sheet)**
- The Sheet uses `modal={false}`, causing AlertDialog to render behind it
- Add a high z-index className to the ConfirmDialog's AlertDialogContent, or switch the Sheet to `modal={true}` only when showing the confirm dialog
- Simplest fix: pass a `className` prop through ConfirmDialog to set `z-[200]` on AlertDialogContent, ensuring it renders above the Sheet (which is at z-50)

### File: `src/components/dialogs/ConfirmDialog.tsx`

- Add an optional `className` prop that gets applied to `AlertDialogContent` so callers can control z-index

### File: `src/schemas/jobFormSchema.ts`

- No changes needed — description is already optional in the Zod schema

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/partner/CreateJobDialog.tsx` | Remove Step 3 description requirement; add draft choice dialog with "Continue" / "Start Fresh"; pass high z-index to ConfirmDialogs |
| `src/components/dialogs/ConfirmDialog.tsx` | Accept optional `className` prop for AlertDialogContent |

