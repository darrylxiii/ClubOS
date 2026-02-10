

# Fix: Invisible Tab Triggers in Finance, Security, and Translations Hubs

## Root Cause

The tabs ARE rendering in a grid layout. The problem is a **contrast/visibility issue**, not a layout issue:

- Inactive tab triggers use `text-muted-foreground` (from the base `TabsTrigger` component)
- The `TabsList` wrapper uses `bg-muted/50` as its background
- On the dark theme, these two colors are nearly identical, making inactive tabs invisible
- Only the active tab ("Dashboard") is visible because it receives `data-[state=active]:bg-card` + `data-[state=active]:text-foreground` which provide contrast

Additionally, the `overflow-x-auto -mx-1 px-1` wrapper div adds unnecessary complexity. Working hubs (AssessmentsHub, HiringIntelligenceHub, BulkOperationsHub) use a simple pattern without this wrapper.

## Solution

1. **Remove the wrapper div** -- Use the exact same simple pattern as working hubs
2. **Add explicit text color to inactive tabs** -- Ensure `text-foreground/70` on the `TabsTrigger` elements so they are readable against the muted background
3. **Apply consistently** across all three broken hubs

## Changes

### File 1: `src/pages/admin/FinanceHub.tsx`

Replace the entire tab navigation block (lines 55-68) with:
```tsx
<Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
  <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-9 bg-muted/50 p-1 rounded-lg h-auto gap-1">
    <TabsTrigger value="dashboard" className="text-foreground/70 data-[state=active]:text-foreground">Dashboard</TabsTrigger>
    <TabsTrigger value="pipeline" className="text-foreground/70 data-[state=active]:text-foreground">Deal Pipeline</TabsTrigger>
    <TabsTrigger value="revenue-ladder" className="text-foreground/70 data-[state=active]:text-foreground">Revenue Ladder</TabsTrigger>
    <TabsTrigger value="fees" className="text-foreground/70 data-[state=active]:text-foreground">Company Fees</TabsTrigger>
    <TabsTrigger value="revenue-shares" className="text-foreground/70 data-[state=active]:text-foreground">Revenue Shares</TabsTrigger>
    <TabsTrigger value="expenses" className="text-foreground/70 data-[state=active]:text-foreground">Expenses</TabsTrigger>
    <TabsTrigger value="reconciliation" className="text-foreground/70 data-[state=active]:text-foreground">Reconciliation</TabsTrigger>
    <TabsTrigger value="moneybird" className="text-foreground/70 data-[state=active]:text-foreground">Moneybird</TabsTrigger>
    <TabsTrigger value="pipeline-settings" className="text-foreground/70 data-[state=active]:text-foreground">Pipeline Settings</TabsTrigger>
  </TabsList>
  ...TabsContent stays the same...
</Tabs>
```

Key changes:
- Remove the `<div className="overflow-x-auto -mx-1 px-1">` wrapper entirely
- Add `className="space-y-6"` to `Tabs` root for spacing (matches working hubs)
- Add `text-foreground/70 data-[state=active]:text-foreground` to every `TabsTrigger` so inactive tabs are visible at 70% opacity

### File 2: `src/pages/admin/SecurityHub.tsx`

Same pattern applied -- remove wrapper, add trigger text classes:
```tsx
<TabsList className="grid w-full grid-cols-3 md:grid-cols-6 bg-muted/50 p-1 rounded-lg h-auto gap-1">
```

### File 3: `src/pages/admin/TranslationsHub.tsx`

Same pattern applied.

## Why This Works

- The working hubs (AssessmentsHub, BulkOperationsHub, HiringIntelligenceHub) all use `grid w-full grid-cols-N` directly on `TabsList` without any wrapper div
- Adding `text-foreground/70` ensures inactive tab text is always visible regardless of theme, while `data-[state=active]:text-foreground` makes the active tab stand out at full opacity
- Removing the scroll wrapper eliminates any potential clipping or layout collapse

## Files Changed (3 total)

1. `src/pages/admin/FinanceHub.tsx`
2. `src/pages/admin/SecurityHub.tsx`
3. `src/pages/admin/TranslationsHub.tsx`
