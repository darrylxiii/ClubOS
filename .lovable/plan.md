

# Revenue & Growth: Inline Expand/Collapse (No Modal)

## What changes

Replace the Dialog/modal approach with an inline expand/collapse within the same card. The full analytics content slides open below the compact summary when the user clicks "Expand", and collapses back when they click "Collapse".

## Single file change: `src/components/clubhome/RevenueGrowthWidget.tsx`

1. Remove the `Dialog`, `DialogContent`, `DialogTitle` imports and the entire `<Dialog>` block (lines 401-427)
2. Change the Maximize2 button to toggle `expanded` state (already does this), and swap the icon to `ChevronUp` when expanded
3. Below the compact `<CardContent>` section (after line 398), add the full `<RevenueFullContent>` wrapped in an animated collapse container:

```text
Card
  |-- gradient bar
  |-- Header (period pills + expand/collapse button)
  |-- Compact content (always visible):
  |     revenue number + delta + sparkline + pipeline one-liner
  |-- Expanded content (animated slide, only when expanded):
        metrics strip, full chart, growth grid,
        pipeline intelligence, forecasting
```

4. The animation uses `framer-motion`'s `AnimatePresence` + `motion.div` with `height: auto` transition (same pattern used elsewhere in the codebase) for a smooth slide-open effect
5. When expanded, the button shows `ChevronUp`; when collapsed, shows `ChevronDown`

No other files change. The component API stays identical.

