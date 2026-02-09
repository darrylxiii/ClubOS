

# Fix: Remove Tab Border + Eliminate Dead Space Above Tabs

## Issues

1. **Ugly black border behind tabs**: The `TabsList` component has `border border-border/40` and `shadow-[var(--shadow-glass-sm)]` which creates a visible dark border around the tab bar on the dark background.

2. **Dead space above admin tabs**: The admin view has `py-8` (32px top padding) on the container plus a title "Jobs" that only shows on the "All Jobs" tab context -- the other tabs have no title relevance. The sticky wrapper also adds `py-3` padding. Combined, this creates ~100px of dead space above the tabs.

3. **Only "Jobs" shown as title**: The `<h1>Jobs</h1>` is static and does not change per tab.

## Changes

### File 1: `src/components/ui/tabs.tsx` (site-wide)

Remove the border and shadow from `TabsList` so it blends cleanly into its container:

```
Before: bg-card/80 backdrop-blur-[var(--blur-glass)] border border-border/40 p-1 text-muted-foreground shadow-[var(--shadow-glass-sm)]
After:  bg-card/80 backdrop-blur-[var(--blur-glass)] p-1 text-muted-foreground
```

This removes `border border-border/40` and `shadow-[var(--shadow-glass-sm)]`.

### File 2: `src/pages/Jobs.tsx` (admin/partner view, lines 437-442)

1. **Remove the static "Jobs" title** -- the active tab already communicates context
2. **Reduce container padding** from `py-8` to `pt-2 pb-8` to eliminate the dead space
3. **Add a dynamic title** that changes based on the active tab, integrated into the sticky bar alongside the tabs

The sticky wrapper becomes:

```tsx
<div className="sticky top-14 sm:top-16 z-30 bg-background/95 backdrop-blur-lg pt-3 pb-2 -mx-4 px-4 border-b border-border/10">
  <div className="flex items-center justify-between mb-2">
    <h1 className="text-lg text-foreground font-bold uppercase tracking-tight">
      {dynamic title based on activeHubTab}
    </h1>
  </div>
  <TabsList>...</TabsList>
</div>
```

Dynamic titles: All Jobs, Applications, Closed Jobs, Analytics, Intelligence, Interactions.

This puts the title inside the sticky bar so it scrolls with the tabs and eliminates the dead space above.

## Result

- No black border around tabs (site-wide)
- Zero dead space above admin tabs
- Each tab shows its own contextual title
- Clean, tight layout matching the "Calm Command Center" aesthetic

