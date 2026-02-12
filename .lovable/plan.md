

# Fix Radial Menu Centering — Use Pixel Offsets

## Root Cause

Framer Motion's percentage-based `x: "-50%"` and `y: "-50%"` compute the offset from the element's **rendered** dimensions, which shift during the `scale: 0.6 -> 1.0` spring animation. A scaled-down element has a smaller computed size, so `-50%` of that smaller size yields a smaller offset — the center drifts during the transition and can land off-target.

## Fix

Replace the percentage-based offset with **exact pixel values**. Since `size` is always known (240px), the offset is simply `-size / 2` = `-120` pixels in both axes. This is constant regardless of scale.

In `src/components/ui/radial-menu.tsx`, change `initial`, `animate`, and `exit` on the motion.div (lines 182-184):

```
// Before
initial={{ scale: 0.6, opacity: 0, x: "-50%", y: "-50%" }}
animate={{ scale: 1, opacity: 1, x: "-50%", y: "-50%" }}
exit={{ scale: 0.6, opacity: 0, x: "-50%", y: "-50%" }}

// After
initial={{ scale: 0.6, opacity: 0, x: -radius, y: -radius }}
animate={{ scale: 1, opacity: 1, x: -radius, y: -radius }}
exit={{ scale: 0.6, opacity: 0, x: -radius, y: -radius }}
```

Where `radius = size / 2 = 120`. Pixel values don't change with scale, so the menu center stays pinned to the click coordinates at every animation frame.

Additionally, add `transformOrigin: "center center"` to ensure the scale animation expands outward from the center, not from a corner.

## File Modified

| File | Change |
|---|---|
| `src/components/ui/radial-menu.tsx` | Replace `x: "-50%", y: "-50%"` with `x: -radius, y: -radius` in initial/animate/exit; add `transformOrigin: "center center"` |

