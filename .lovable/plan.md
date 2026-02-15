

# Fix Horizontal Overflow -- Proper Root Cause Fix

## The Problem

The previous fix (`overflow-x-hidden` on `<main>`) was a bandaid that clips content instead of fixing the actual layout math. Content is now pushed out of view on the right side.

## Root Cause

In `AppLayout.tsx` line 196, the `<main>` element has:
```
flex-1 w-full md:ml-20
```

On desktop this means:
- `w-full` forces `width: 100%` of the parent (the full viewport)
- `md:ml-20` adds `margin-left: 5rem` for the sidebar
- Total space needed: **100% + 5rem** -- overflows the viewport by exactly 5rem (80px, the sidebar width)

The `overflow-x-hidden` we added just hides that 5rem of content on the right side, which is why things appear cut off.

## The Fix

Two changes in `AppLayout.tsx`:

1. **On the `<main>` element (line 196):** Replace `w-full` with `min-w-0` and remove `overflow-x-hidden`
   - `flex-1` already handles sizing (grows to fill available space)
   - `min-w-0` is the standard flex overflow fix -- it allows the flex child to shrink below its content size
   - Without `w-full` forcing 100% width, the margin-left no longer causes overflow

2. **On the root `<div>` (line 108):** Add `overflow-hidden` to the outermost wrapper as a safety net
   - Prevents any edge cases from creating a body-level scrollbar
   - The root container should never scroll horizontally

### Before
```
<!-- Root -->
<div className="min-h-screen flex w-full bg-background">

<!-- Main -->
"flex-1 w-full md:ml-20 relative z-10 overflow-x-hidden"
```

### After
```
<!-- Root -->
<div className="min-h-screen flex w-full overflow-hidden bg-background">

<!-- Main -->
"flex-1 min-w-0 md:ml-20 relative z-10"
```

## Why This Works

- `flex-1` (which is `flex: 1 1 0%`) makes main grow to fill remaining space after the margin is accounted for
- `min-w-0` overrides the default `min-width: auto` on flex items, allowing content to shrink properly
- No content is clipped at the layout level -- components that need internal horizontal scroll (tables, code blocks) keep working with their own `overflow-x-auto`
- The root `overflow-hidden` is a safety net only -- the layout math is now correct so it should never activate

## File to Modify

| File | Change |
|---|---|
| `src/components/AppLayout.tsx` | Line 108: add `overflow-hidden` to root div. Line 196: replace `w-full overflow-x-hidden` with `min-w-0` |
