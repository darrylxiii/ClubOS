

# Fix: Mobile Layout Broken Across All Pages

## Root Cause

In `index.html` (lines 147-150), there is a global CSS rule:

```css
.absolute {
  contain: layout style paint;
  will-change: transform;
}
```

This targets **every element** with Tailwind's `absolute` utility class across the entire application. The `contain: layout style paint` declaration is extremely destructive because:

- `contain: layout` prevents absolutely-positioned elements from influencing their parent's layout and from being visible outside their own box
- Hundreds of components use Tailwind's `absolute` class for overlays, dropdowns, centered logos, tooltips, modals, mobile sidebar backdrops, and more
- On mobile specifically, this breaks the sidebar overlay, the centered header logo, dropdown menus, popover content, and any content that relies on absolute positioning to layer above other elements

This single rule is why "the content is all the same as browser" -- it effectively breaks CSS containment for all overlays and responsive layout elements that use absolute positioning.

## Fix

### Step 1: Remove the destructive global `.absolute` rule from `index.html`

**File: `index.html` (lines 146-150)**

Remove:
```css
/* Prevent absolute elements from causing layout shifts */
.absolute {
  contain: layout style paint;
  will-change: transform;
}
```

This rule was added as a performance optimization but it conflicts with Tailwind's `absolute` utility class. The `optimize-paint` class in `index.css` already provides an opt-in version (`contain: layout style paint`) for components that actually need it.

### Step 2: Verify no other global containment rules exist

The `content-auto` classes in `index.css` (lines 837-868) are fine -- they are opt-in utility classes, not global selectors. No changes needed there.

---

## Why This Is The Only Change Needed

- The `AppLayout` flex structure is correct (`min-h-screen flex w-full` container, `flex-1 min-w-0` main)
- The mobile sidebar, header, and overlay code are all correct
- The CRM page and other pages use proper responsive classes (`w-full px-4 sm:px-6 lg:px-8`)
- The `#root` styles are correct (`width: 100%`, no contain)
- The viewport meta tag is correct (`width=device-width, initial-scale=1.0`)

The only problem is that global `.absolute` containment rule silently breaking layout for every absolutely-positioned element on every page.

## Risk

None. Removing this rule restores standard CSS behavior. Components that genuinely need paint containment can use the existing `.optimize-paint` utility class on a case-by-case basis.
