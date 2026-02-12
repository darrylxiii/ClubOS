

# Fix Double Menu and Pre-Highlighted Wedge on Open

## Bug 1: Double Menu

**Root cause**: In `radial-menu.tsx` line 160-163, the backdrop's `onContextMenu` calls `onClose()` but the event keeps bubbling. It reaches the provider's `div onContextMenu` in `radial-menu-provider.tsx` line 42, which calls `openMenu()` — so the menu closes and instantly reopens.

**Fix in `src/components/ui/radial-menu.tsx`**:
- Add `e.stopPropagation()` to the backdrop's `onContextMenu` handler so the event never reaches the provider

## Bug 2: Cursor Lands on a Wedge on Open

**Root cause**: The menu scales from 0.6 to 1.0. During that spring animation, the wedge paths expand outward through the cursor's resting position, triggering `onMouseEnter` on a wedge path before the user moves the mouse.

**Fix in `src/components/ui/radial-menu.tsx`**:
- Wrap the SVG in a container with `pointer-events: none` initially
- After the open animation completes (~200ms), flip to `pointer-events: auto`
- Use a `useEffect` with a short timeout tied to the `items` mount to enable pointer events after the spring settles
- This ensures the cursor rests cleanly in the center circle with nothing highlighted until the user deliberately moves to a wedge

## Files Modified

| File | Change |
|---|---|
| `src/components/ui/radial-menu.tsx` | Add `e.stopPropagation()` to backdrop contextmenu; delay pointer-events on SVG wedges until animation settles |

