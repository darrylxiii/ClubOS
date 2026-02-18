

# Revenue & Growth: Collapsed + Expanded Mode

## What changes

Split the current widget into two views inside the same component:

### Collapsed (default on dashboard)
A compact card showing only the essentials:
- Premium gradient top bar (keep)
- Total Revenue number with delta badge
- Mini sparkline (60px tall, inline)
- Period selector pills
- "Expand" button (Maximize icon) in the header

Roughly 120px tall -- fits naturally in the dashboard flow.

### Expanded (dialog/modal)
Clicking the expand button opens a Dialog containing the full current widget:
- All metrics strip (Avg/Placement, Per Working Day, Best Month, Placements)
- Full 200px interactive chart
- Growth indicators grid
- Pipeline intelligence section
- Forecasting strip
- Period selector stays interactive inside the modal

The dialog uses the existing `Dialog` component, full-width on mobile, max-w-3xl on desktop.

## Technical approach

### Single file change: `src/components/clubhome/RevenueGrowthWidget.tsx`

1. Add `const [expanded, setExpanded] = useState(false)` state
2. Extract the full content (lines 200-373) into a `RevenueFullContent` inner component
3. The default render shows a compact card with:
   - Header with period pills + expand button (Maximize2 icon)
   - Total revenue + delta + mini inline sparkline (reuse chartData, 60px height)
   - Weighted pipeline value (one line)
4. Wrap `RevenueFullContent` in a `<Dialog open={expanded} onOpenChange={setExpanded}>` that renders the full analytics view
5. Inside the dialog, include the period selector so users can interact without closing

No changes needed to `AdminHome.tsx` -- the component API stays the same.
