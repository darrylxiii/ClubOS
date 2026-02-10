

# Fix: Tabs Not Visible in Finance Hub (and Security/Translations Hubs)

## Root Cause

The `TabsList` base component in `src/components/ui/tabs.tsx` hardcodes `inline-flex h-10`. This creates two problems:

1. **`h-10`** constrains the container to exactly 40px tall -- any tabs that wrap to a second row are clipped/invisible.
2. **`inline-flex`** conflicts with the `sm:grid` override. While `tailwind-merge` should handle this, the combination with `items-center justify-center` from the base creates layout conflicts where grid children collapse.

The result: only the first tab ("Dashboard") is visible; the remaining 8 are rendered but hidden by the fixed height.

## Solution

Two-part fix:

### 1. Update `src/components/ui/tabs.tsx` -- Remove rigid height constraint

Change the base `TabsList` styles from:
```
inline-flex h-10 items-center justify-center rounded-md p-1 text-muted-foreground
```
To:
```
inline-flex items-center rounded-md p-1 text-muted-foreground
```

Removing `h-10` and `justify-center` ensures the list can grow to fit wrapped content and does not fight with grid layouts.

### 2. Rewrite all three Hub `TabsList` sections for maximum clarity

Use explicit, non-conflicting class names that do not rely on tailwind-merge resolving conflicts with the base component.

**FinanceHub.tsx** (9 tabs):
```tsx
<div className="overflow-x-auto -mx-1 px-1">
  <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-9 h-auto gap-1 bg-muted/50 p-1 rounded-lg">
    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
    ...all 9 triggers...
  </TabsList>
</div>
```

**SecurityHub.tsx** (6 tabs):
```tsx
<div className="overflow-x-auto -mx-1 px-1">
  <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto gap-1 bg-muted/50 p-1 rounded-lg">
    ...6 triggers...
  </TabsList>
</div>
```

**TranslationsHub.tsx** (6 tabs):
```tsx
<div className="overflow-x-auto -mx-1 px-1">
  <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto gap-1 bg-muted/50 p-1 rounded-lg">
    ...6 triggers...
  </TabsList>
</div>
```

Key changes:
- Use `grid` directly (not `sm:grid`) so it applies at all breakpoints -- no `inline-flex` conflict
- `w-full` ensures full width at all sizes
- `h-auto` lets the grid expand for wrapped rows
- `grid-cols-3` on mobile gives a clean 3-column layout; scales up at wider breakpoints

## Files Changed (4 total)

1. `src/components/ui/tabs.tsx` -- Remove `h-10` and `justify-center` from base `TabsList`
2. `src/pages/admin/FinanceHub.tsx` -- Explicit grid classes on `TabsList`
3. `src/pages/admin/SecurityHub.tsx` -- Same pattern
4. `src/pages/admin/TranslationsHub.tsx` -- Same pattern

## Why This Fixes It

- `grid` as the display mode at all breakpoints means there is zero conflict with the base `inline-flex` (tailwind-merge cleanly replaces it)
- `h-auto` with no competing `h-10` means the container grows to fit all tab rows
- No reliance on breakpoint-conditional display switching (`sm:grid`) that was failing to override the base styles

