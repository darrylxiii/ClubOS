
# Fix Radial Menu Centering (Definitive)

## Root Cause

The `motion.div` container has no explicit `width` or `height`. CSS `transformOrigin: "center center"` resolves relative to the element's **layout box**, which may not match the SVG's `size` exactly (browser rendering quirks, sub-pixel rounding, glass overlay div). This causes the scale animation to expand from a slightly wrong origin, drifting the center away from the cursor.

## The Fix

Set explicit `width` and `height` on the `motion.div` so `transformOrigin` resolves deterministically:

In `src/components/ui/radial-menu.tsx`, update the `motion.div` (line 176-191):

```tsx
<motion.div
  className="fixed z-[9999] outline-none"
  style={{
    left: clampedX - radius,
    top: clampedY - radius,
    width: size,
    height: size,
    transformOrigin: "center center",
  }}
  initial={{ scale: 0.6, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  exit={{ scale: 0.6, opacity: 0 }}
  transition={menuTransition}
  onKeyDown={handleKeyDown}
  role="menu"
  aria-label="Quick actions"
  tabIndex={-1}
>
```

Adding `width: size` and `height: size` guarantees the layout box is exactly 240x240, so "center center" is pixel-perfect at (120, 120) -- exactly at `clampedX, clampedY`.

## File Changed

| File | Change |
|---|---|
| `src/components/ui/radial-menu.tsx` | Add `width: size, height: size` to the motion.div style (2 lines added) |
