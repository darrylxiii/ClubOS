

# Fix Radial Menu Positioning and Hover Highlighting

## Bug 1: Menu Not Centered on Click Point

**Root cause**: Framer Motion controls the `transform` CSS property for its `scale` animation. The inline `style={{ transform: "translate(-50%, -50%)" }}` gets overwritten when framer-motion applies its own transform.

**Fix**: Use framer-motion's own `x` and `y` properties for the centering offset instead of CSS transform:

In `src/components/ui/radial-menu.tsx`, line 167-181:
- Remove `transform: "translate(-50%, -50%)"` from the `style` prop
- Add `x: "-50%"` and `y: "-50%"` to framer-motion's `animate` (and `initial`/`exit`) so the translation is composed with the scale properly

## Bug 2: Hover Highlight Drops When Cursor Passes Over Icon

**Root cause**: The SVG `<path>` wedge has `onMouseLeave={() => setActiveIndex(null)}` (line 218). When the cursor moves from the wedge path onto the icon `<foreignObject>` (which sits on top), the path fires `onMouseLeave`, clearing the highlight. The icon buttons only have `onFocus`, not `onMouseEnter`.

**Fix** in `src/components/ui/radial-menu.tsx`:
- Remove `onMouseLeave` from individual wedge `<path>` elements (line 218)
- Add `onMouseEnter={() => setActiveIndex(index)}` to each icon `<button>` element (around line 240-253)
- Add a single `onMouseLeave={() => setActiveIndex(null)}` on the parent `<svg>` element (line 183) so the highlight only clears when the cursor leaves the entire radial menu, not when it moves between wedge and icon within the same slice

## Files Modified

| File | Changes |
|---|---|
| `src/components/ui/radial-menu.tsx` | Fix transform centering via framer-motion x/y props; move onMouseLeave to SVG parent; add onMouseEnter to icon buttons |

