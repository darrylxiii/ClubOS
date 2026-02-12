

# Fix Radial Menu Centering (Final)

## Root Cause

The current approach sets `left: clampedX, top: clampedY` (the click point = top-left of the element), then uses Framer Motion `x: -radius, y: -radius` to translate it back. But when combined with `scale`, CSS applies the transforms in sequence relative to `transformOrigin`, causing the visual center to drift away from the click point during the scale animation.

## The Fix

Stop using translate transforms for centering entirely. Instead, set `left` and `top` directly to the already-offset position:

```
style={{
  left: clampedX - radius,   // was: left: clampedX + x: -radius
  top: clampedY - radius,    // was: top: clampedY + y: -radius
  transformOrigin: "center center",
}}
initial={{ scale: 0.6, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
exit={{ scale: 0.6, opacity: 0 }}
```

This way:
- The element's top-left is placed at `(clickX - 120, clickY - 120)`
- Its geometric center is exactly at the click point
- `transformOrigin: center center` makes `scale` expand from that center
- No translate transform exists, so there is zero interaction between translate and scale
- The center stays perfectly pinned at every animation frame

## File Changed

| File | Change |
|---|---|
| `src/components/ui/radial-menu.tsx` | Move centering offset into `left`/`top` style; remove `x`/`y` from initial/animate/exit |

