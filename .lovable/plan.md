
# Fix Horizontal Scroll on Candidate Page (and All Pages)

## Root Cause

The `AppLayout.tsx` `<main>` element (line 192-216) does not have `overflow-x: hidden` applied. It only conditionally sets `overflow-hidden` for messaging routes and `overflow-y-auto` for all other routes. This means any child content that bleeds horizontally (flex children, wide cards, tables, long text without word-break) creates a horizontal scrollbar across the entire page.

The candidate page at `/candidate/:candidateId` renders inside `AppLayout` using `container mx-auto px-4 max-w-7xl`, which itself is fine, but sub-components (hero section badges, skill tags, decision dashboard metrics, etc.) can push content wider than the viewport on certain screen sizes.

## Fix

**Single-line fix in `AppLayout.tsx`**: Add `overflow-x-hidden` to the `<main>` element's className so horizontal overflow is always clipped, regardless of route.

Current (line 196):
```
"flex-1 w-full md:ml-20 relative z-10",
```

Updated:
```
"flex-1 w-full md:ml-20 relative z-10 overflow-x-hidden",
```

This is safe because:
- Messaging routes already use `overflow-hidden` (both axes clipped)
- All other routes use `overflow-y-auto` for vertical scroll -- adding `overflow-x-hidden` does not interfere
- No page legitimately needs horizontal scrolling at the layout level (tables/code blocks handle their own `overflow-x-auto` internally within their containers)

## File to Modify

| File | Change |
|---|---|
| `src/components/AppLayout.tsx` | Add `overflow-x-hidden` to the `<main>` element className (line 196) |

## Technical Notes

- This is a global fix that prevents horizontal scroll on ALL authenticated pages, not just the candidate profile
- Components that need internal horizontal scroll (tables, code blocks, carousels) already have their own `overflow-x-auto` wrappers, so they will continue to scroll horizontally within their bounded containers
- The `DynamicBackground` already has `overflow-hidden` on its fixed container, so it is not the source of the issue
