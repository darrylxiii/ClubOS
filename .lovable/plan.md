
# "Request Access" Popup with Two Options

## What Changes

The "Request Access" text on the Auth page stays as-is, but instead of being a link it becomes a button that opens a glassmorphic dialog/modal. Inside the modal: a heading, two full-width buttons ("For Members" and "For Partners"), and a close/cancel option.

## Technical Details

### Modified file: `src/pages/Auth.tsx`

1. Replace lines 696-700: Change the `Link` to a `button` that toggles local state (`showAccessDialog`).

2. Add a `Dialog` (from existing `@/components/ui/dialog`) that renders when `showAccessDialog` is true, containing:
   - `DialogHeader` with title "Request Access"
   - Two full-width `Button` components stacked vertically:
     - **For Members** -- navigates to `/onboarding`
     - **For Partners** -- navigates to `/partner`
   - Uses `useNavigate` for routing on click, closes dialog after navigation

3. Add `useState` for `showAccessDialog` and import `useNavigate` (likely already imported), plus `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` from the existing UI library.

No new files, no new routes, no database changes. One file modified, roughly 30 lines added.
