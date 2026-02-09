
# Fix: Tab Navigation Visibility + Page Titles (Site-Wide)

## Root Causes Identified

### 1. Tabs are invisible in dark mode
The `TabsList` component uses `bg-card/30` (30% opacity of `hsl(0 0% 15%)`) which is nearly transparent on dark backgrounds. Combined with `text-muted-foreground` at 65% lightness, the tab labels blend into the background -- exactly what the screenshot shows.

### 2. No page title on the Jobs Command Center
The admin/partner view at `/jobs` jumps straight into the `<TabsList>` with no heading. There is no "Jobs" title visible.

### 3. Tabs not sticky -- scroll under header
The tab bar inside `/jobs` is inside the scrollable `<main>` area. When content is long, tabs scroll away and can end up underneath the fixed header (z-header: 100).

## Fix Plan (2 files)

### File 1: `src/components/ui/tabs.tsx` (site-wide fix)

**TabsList** -- Increase background opacity and ensure proper contrast:

```
Before: bg-card/30 backdrop-blur-[var(--blur-glass)] border border-border/20
After:  bg-card/80 backdrop-blur-[var(--blur-glass)] border border-border/40
```

This changes the background from 30% to 80% opacity site-wide, making tab labels readable on every page in both light and dark mode. The border also gets bumped from 20% to 40% for definition.

**TabsTrigger** -- Increase active state opacity:

```
Before: data-[state=active]:bg-card/60
After:  data-[state=active]:bg-card
```

Active tab gets a solid background for clear selection indication.

### File 2: `src/pages/Jobs.tsx` (admin command center)

**Add page title** above the tabs for the admin/partner view:

```tsx
<h1 className="text-heading-2xl text-foreground font-black uppercase tracking-tight">
  Jobs
</h1>
```

**Make the tab bar sticky** so it stays visible when scrolling:

```tsx
<div className="sticky top-14 sm:top-16 z-30 bg-background/95 backdrop-blur-lg py-3 -mx-4 px-4 border-b border-border/20">
  <TabsList className="h-auto flex-wrap">
    ...
  </TabsList>
</div>
```

This pins the tabs below the fixed header, with a backdrop blur background so content scrolls behind it cleanly.

## Result

- Tab labels visible in both light and dark mode across the entire platform
- Jobs page has a clear "JOBS" title matching brand typography
- Tab navigation stays pinned and accessible while scrolling
- No z-index conflicts with the header (tabs use z-30, header uses z-header/100)
