

## Goal

Create a **sticky user profile section** at the bottom of the sidebar that:
1. Always stays visible at the bottom, regardless of scroll position
2. Overlays menu content when there's overflow
3. Has a subtle fade gradient above it to signal "more items below"

---

## Current Architecture

```text
DesktopSidebar
├── Logo Container (h-14/h-16, border-bottom)
└── Content (flex-1, overflow-y-auto)
    ├── SidebarGroup (Social)
    ├── SidebarGroup (Communication)
    ├── SidebarGroup (Learning)
    ├── ...
    └── SidebarFooter ← Currently scrolls with content
```

---

## Proposed Architecture

```text
DesktopSidebar (flex-col, relative)
├── Logo Container (h-14/h-16, border-bottom)
├── Scrollable Menu Area (flex-1, overflow-y-auto)
│   ├── SidebarGroup (Social)
│   ├── SidebarGroup (Communication)
│   ├── ...
│   └── Spacer (padding-bottom to prevent content hiding behind footer)
├── Fade Gradient Overlay (absolute, pointer-events-none)
└── User Profile Footer (sticky/absolute bottom, z-10)
```

---

## Implementation Plan

### Step 1: Restructure DesktopSidebar

**File:** `src/components/AnimatedSidebar.tsx`

Split the sidebar content into two parts:
- **Scrollable navigation container** - receives only navigation groups as children
- **Fixed footer section** - positioned absolutely at bottom with higher z-index

### Step 2: Pass Footer Separately

**File:** `src/components/AppLayout.tsx`

Instead of rendering `SidebarFooter` as a child of `Sidebar`, pass it as a dedicated prop:

```tsx
<Sidebar
  logoLight={...}
  footer={
    <SidebarFooter
      userName={firstName}
      userInitial={firstName[0].toUpperCase()}
      userAvatarUrl={userProfile?.avatar_url || null}
      onSignOut={signOut}
      profilePath={profilePath}
    />
  }
>
  {navigationGroups.map((group) => (
    <SidebarGroup key={group.title} group={group} />
  ))}
</Sidebar>
```

### Step 3: Update Sidebar Component Props

**File:** `src/components/AnimatedSidebar.tsx`

Add `footer?: ReactNode` prop to `SidebarProps`, `DesktopSidebarProps`, and `MobileSidebarProps`.

### Step 4: Update DesktopSidebar Layout

**File:** `src/components/AnimatedSidebar.tsx`

```tsx
const DesktopSidebar = ({ children, footer, ... }) => {
  return (
    <motion.aside className="... relative">
      {/* Logo */}
      <div className="h-14 sm:h-16 ...">...</div>
      
      {/* Scrollable Menu Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-4 relative">
        <div className="pb-20"> {/* Space for footer */}
          {children}
        </div>
      </div>
      
      {/* Fade gradient - sits above scrollable content */}
      <div 
        className="absolute bottom-20 left-0 right-0 h-16 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to bottom, transparent, hsl(var(--card)/0.95))'
        }}
      />
      
      {/* Fixed Footer - always visible */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur-sm border-t border-border/10">
        {footer}
      </div>
    </motion.aside>
  );
};
```

### Step 5: Update MobileSidebar Layout

**File:** `src/components/AnimatedSidebar.tsx`

Apply the same pattern to the mobile sidebar for consistency.

### Step 6: Adjust Footer Styling

**File:** `src/components/AnimatedSidebar.tsx`

The `SidebarFooter` component's wrapper will need slight padding adjustments since it's now in a fixed position container.

---

## Visual Behavior

| Scroll Position | User Profile | Fade Gradient |
|-----------------|--------------|---------------|
| Top (no scroll) | Visible at bottom | Visible (subtle) |
| Middle | Visible at bottom, menu scrolls behind | Visible |
| Bottom | Visible at bottom | Fades as last items approach |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AnimatedSidebar.tsx` | Add `footer` prop; restructure DesktopSidebar and MobileSidebar layouts; add fade gradient |
| `src/components/AppLayout.tsx` | Pass `SidebarFooter` as `footer` prop instead of child |

---

## Technical Details

**Gradient Implementation:**
```css
background: linear-gradient(
  to bottom,
  transparent 0%,
  hsl(var(--card) / 0.3) 30%,
  hsl(var(--card) / 0.9) 100%
);
```

**Z-index Stack:**
- Scrollable content: default (z-0)
- Fade gradient: z-10
- User profile footer: z-20

**Footer Height:** ~80px (20 in Tailwind = `pb-20` / `bottom-20` / `h-20`)

---

## Acceptance Criteria

1. User profile section stays fixed at bottom when scrolling menu items
2. Menu items scroll behind/under the user profile
3. Subtle fade gradient appears above user profile to hint at more content
4. Works in both collapsed and expanded states
5. Works on both desktop and mobile sidebars
6. Dark and light themes render correctly
7. No layout shift or flicker during sidebar expand/collapse

