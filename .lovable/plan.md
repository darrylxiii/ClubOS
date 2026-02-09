
# Fix: Remove Black Tab Box + Clean Up Titles

## 3 Issues to Fix

### 1. Black box behind tabs (site-wide)
The `TabsList` in `tabs.tsx` uses `bg-card/80` which renders as a dark rectangular box behind the tab items. Fix: make it fully transparent so tabs float cleanly on the page background.

### 2. Duplicate "APPLICATIONS" title above tabs
The sticky bar in `Jobs.tsx` (line 440-442) renders a dynamic title like "APPLICATIONS" above the tab row. But each embedded page (e.g., CompanyApplications) already renders its own large title like "APPLICATIONS HUB" with subtitle. This creates redundancy. Fix: remove the dynamic title from the sticky bar entirely.

### 3. Dead space above tabs
The sticky bar has padding (`pt-3 pb-2`) and the removed title leaves empty space. Fix: tighten to minimal padding.

## Changes

### File 1: `src/components/ui/tabs.tsx`
Make `TabsList` background transparent -- remove `bg-card/80 backdrop-blur-[...]`:

```
Before: "inline-flex h-10 items-center justify-center rounded-md bg-card/80 backdrop-blur-[var(--blur-glass)] p-1 text-muted-foreground"
After:  "inline-flex h-10 items-center justify-center rounded-md p-1 text-muted-foreground"
```

### File 2: `src/pages/Jobs.tsx` (lines 439-468)
- Remove the `<h1>` dynamic title block (lines 440-442)
- Tighten sticky wrapper padding from `pt-3 pb-2` to `py-2`

The sticky bar becomes just the tab triggers with no title, no black box, minimal padding.

## Result
- No dark box behind tabs anywhere on the platform
- No duplicate title above the tabs -- each tab's embedded page provides its own title and subtitle (e.g., "APPLICATIONS HUB / Manage all candidates...")
- Tight, clean tab navigation matching the Calm Command Center aesthetic
