

# Fix: Convert UserEditDrawer from Bottom Drawer to Right-Side Sheet

## Problem
The `UserEditDrawer` uses the `Drawer` component (bottom sheet), which slides up from the bottom of the screen. This causes z-index issues where it renders underneath other page content, and the bottom-sheet UX feels unprofessional for an admin editing panel with this much content.

## Solution
Convert from `Drawer` to `Sheet` (right-side sliding panel) with a polished, professional layout.

## Changes

### `src/components/admin/users/UserEditDrawer.tsx` — Full rewrite
- Replace all `Drawer*` imports with `Sheet*` equivalents (`Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter`, `SheetClose`)
- Use `<SheetContent side="right" className="w-[480px] sm:max-w-[480px] overflow-y-auto">` for a proper right-panel
- Restructure the layout with clear visual sections using cards/containers for "System Roles", "Company Memberships", and "Account Actions"
- Add a sticky header with user avatar initial + name + email + account status badge
- Add a sticky footer with Save/Cancel buttons
- The scrollable content area sits between header and footer using `flex-1 overflow-y-auto`
- Sheet uses Portal rendering which guarantees correct z-index above all page content

No other files need changes — the props interface (`open`, `onClose`, `onSaved`) stays identical.

