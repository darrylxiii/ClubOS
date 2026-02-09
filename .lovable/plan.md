
# Fix: Finance Hub Tab Navigation Not Accessible

## Root Cause

The `TabsList` component's base class includes `inline-flex h-10` which constrains the tab container to a single fixed-height row. Although the FinanceHub override adds `h-auto flex flex-wrap`, the 9 tab triggers are either being clipped or not rendering visibly due to layout conflicts between the base inline-flex behavior and the flex-wrap override.

## Solution

Replace the current `flex-wrap` approach with a **CSS Grid layout**, which is the proven pattern used across the codebase for multi-tab navigation (used in `CandidateAnalytics`, `JobDashboard`, `DealsPipeline`, etc.). Grid layout explicitly allocates space for every tab, eliminating any overflow/clipping issues.

Additionally, wrap the `TabsList` in a horizontally scrollable container as a fallback for very narrow screens.

## Changes

### File: `src/pages/admin/FinanceHub.tsx`

Update the TabsList from:
```tsx
<TabsList className="h-auto flex flex-wrap gap-1 bg-muted/50 p-1">
```

To:
```tsx
<div className="overflow-x-auto -mx-1 px-1">
  <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 h-auto gap-1 bg-muted/50 p-1">
    ...tabs...
  </TabsList>
</div>
```

This ensures:
- On small screens: horizontal scroll with all tabs visible
- On medium screens: 3-column then 5-column grid wrapping
- On large screens: all 9 tabs in a single row via 9-column grid

### File: `src/pages/admin/SecurityHub.tsx`

Apply the same fix (currently only has `flex-wrap` with no `h-auto` or `flex` override, making it even more broken):
```tsx
<TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-3 md:grid-cols-6 h-auto gap-1 bg-muted/50 p-1">
```

### File: `src/pages/admin/TranslationsHub.tsx`

Same pattern applied for consistency across all 3 hubs.

## Technical Detail

The CSS Grid approach works because:
- `grid` is an explicit display mode that overrides `inline-flex` cleanly via tailwind-merge
- `grid-cols-N` allocates exact space per tab -- no overflow/clipping possible
- `h-auto` lets multi-row grids expand vertically on smaller screens
- The `overflow-x-auto` wrapper provides a fallback for edge-case screen widths
