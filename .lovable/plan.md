

# Fix: Mobile Layout Not Filling Viewport Width

## Root Cause

The `RadialMenuProvider` component wraps `<main>` inside a bare unstyled `<div>`:

```text
AppLayout flex container (flex-row, w-full)
  |
  +-- DynamicBackground (fixed, no flex space)
  +-- header (fixed, no flex space)
  +-- DesktopSidebar (hidden on mobile)
  +-- RadialMenuProvider
  |     |
  |     +-- <div onContextMenu={...}>   <-- UNSTYLED FLEX ITEM (no flex-1!)
  |           |
  |           +-- <main class="flex-1 min-w-0 ...">   <-- flex-1 is MEANINGLESS here
  |                 |
  |                 +-- page content
  +-- CommandPalette (portal)
  +-- ClubAIVoice (portal)
```

The problem: that intermediate `<div>` is a flex item in the AppLayout's row-direction flex container. It has **no flex properties**, so it defaults to `flex: 0 1 auto` -- meaning it **will not grow** to fill available space. Its width is determined by content width, not viewport width.

The `flex-1` on `<main>` has no effect because its parent (the bare `<div>`) is not a flex container -- it's just a regular block element.

On desktop, the content happens to be wide enough to appear normal, but on mobile (narrower viewport), the content area visibly fails to stretch to the full viewport width.

## Fix (2 changes)

### 1. RadialMenuProvider wrapper div (the actual fix)

**File: `src/components/ui/radial-menu-provider.tsx` (line 55)**

Change:
```tsx
<div onContextMenu={handleContextMenu}>{children}</div>
```

To:
```tsx
<div onContextMenu={handleContextMenu} className="flex-1 min-w-0 flex flex-col">
  {children}
</div>
```

This makes the wrapper a proper flex item that fills the container, AND makes it a flex container itself so `<main>`'s `flex-1` works correctly.

### 2. Remaining redundant AppLayout wrappers (secondary cleanup)

54 page files still wrap themselves in `<AppLayout>` despite being rendered inside `ProtectedLayout` (which already provides AppLayout). This causes double sidebar rendering on desktop and wasted layout on mobile. The highest-impact pages to fix in this batch:

- `ModuleManagement.tsx` -- AppLayout + container max-w-5xl
- `ClubDJ.tsx` -- AppLayout + container max-w-7xl
- `SocialManagement.tsx` -- AppLayout + container mx-auto
- `Academy.tsx` -- AppLayout + container max-w-7xl
- `Jobs.tsx` -- AppLayout (already fluid width)
- `CompanyJobsDashboard.tsx` -- AppLayout
- `UnifiedTasks.tsx` -- AppLayout
- `TimeTrackingPage.tsx` -- AppLayout
- `MeetingHistory.tsx` -- AppLayout
- `MeetingInsights.tsx` -- AppLayout

For each: remove the `<AppLayout>` wrapper and replace any `container mx-auto` / `max-w-*xl` with `w-full px-4 sm:px-6 lg:px-8`.

## Technical Details

The fix applies the same refactoring pattern used in Batch 1 and 2. The RadialMenuProvider change is the critical one that makes the mobile content area fill the viewport. The AppLayout cleanup prevents double sidebar rendering and ensures consistent fluid layouts.

## Risk

Low. The RadialMenuProvider change only adds flex properties to an existing wrapper div. The AppLayout cleanup follows the same proven pattern from earlier batches.
