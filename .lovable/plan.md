
# Sidebar Stability Audit - Full Report & Hardening Plan

## Current Architecture Analysis

The sidebar consists of these key components:

| Component | Location | Purpose |
|-----------|----------|---------|
| `AnimatedSidebar.tsx` | `src/components/` | Main sidebar with desktop/mobile variants |
| `AppLayout.tsx` | `src/components/` | Parent layout consuming the sidebar |
| `navigation.config.ts` | `src/config/` | Navigation group definitions |
| `RoleContext.tsx` | `src/contexts/` | Role-based navigation filtering |
| `useNavigationState.ts` | `src/hooks/` | Group expand/collapse state |
| `use-mobile.tsx` | `src/hooks/` | Mobile breakpoint detection |

---

## Identified Vulnerabilities

### 1. Global Window Object Anti-Pattern (Critical)
**File:** `AnimatedSidebar.tsx` lines 82-85

The sidebar exposes toggle functions via the global `window` object:
```typescript
if (typeof window !== 'undefined') {
  (window as any).__toggleSidebar = () => setOpen(!open);
  (window as any).__getSidebarOpen = () => open;
}
```

**Problems:**
- Stale closures: The `open` value captured in the closure becomes stale after state updates
- Race conditions: Multiple components polling/setting state through window creates sync issues
- No cleanup: These assignments persist even after component unmount
- SSR incompatibility: `window` access during render phase

**Evidence:** The `AppLayout.tsx` polls this with a 100ms interval (line 64), which can cause state desync.

### 2. Polling-Based State Sync (High Risk)
**File:** `AppLayout.tsx` lines 55-67

```typescript
useEffect(() => {
  const syncSidebarState = () => {
    if (typeof window !== 'undefined' && (window as any).__getSidebarOpen) {
      const isOpen = (window as any).__getSidebarOpen();
      setMobileMenuOpen(isOpen);
    }
  };
  const interval = setInterval(syncSidebarState, 100);
  return () => clearInterval(interval);
}, []);
```

**Problems:**
- 100ms polling is inefficient and causes stale reads
- Creates memory pressure and battery drain on mobile
- Race condition between poll and actual state change

### 3. Framer Motion AnimatePresence Without Key Stability
**File:** `AnimatedSidebar.tsx` lines 122-166, 392-434

Using `AnimatePresence` with conditional rendering but keys depend on transient state:
```typescript
<AnimatePresence mode="wait">
  {open ? (
    <motion.div key="expanded">...</motion.div>
  ) : (
    <motion.div key="collapsed">...</motion.div>
  )}
</AnimatePresence>
```

**Problem:** Rapid open/close toggles can cause animation state corruption when exit animations overlap with enter animations.

### 4. No Error Boundary Around Sidebar
The sidebar is rendered directly in `AppLayout.tsx` without protection:
```typescript
<Sidebar logoLight={...} logoDark={...}>
  {navigationGroups.map((group) => (
    <SidebarGroup key={group.title} group={group} />
  ))}
</Sidebar>
```

**Problem:** Any error in navigation config, role context, or child components crashes the entire layout.

### 5. Context Throw Without Fallback
**File:** `AnimatedSidebar.tsx` lines 27-32

```typescript
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};
```

**Problem:** If called outside provider (which can happen during fast navigation or HMR), throws and crashes.

### 6. Role Context Race Condition
**File:** `RoleContext.tsx` + `AppLayout.tsx`

The navigation is computed based on `currentRole`:
```typescript
const navigationGroups = useMemo(
  () => getNavigationForRole(currentRole),
  [currentRole]
);
```

**Problem:** If `currentRole` changes rapidly (role switching, session refresh), the sidebar re-renders with potentially undefined navigation groups.

### 7. Mobile Sidebar Z-Index Conflicts
**File:** `AnimatedSidebar.tsx`

Multiple z-index values scattered across components:
- Sidebar overlay: `z-[80]`
- Mobile sidebar: `z-[90]`
- Header in AppLayout: `z-[100]`
- Desktop sidebar: `z-[110]`

**Problem:** Inconsistent layering can cause clickthrough issues on certain devices.

### 8. useIsMobile Returns Undefined Initially
**File:** `use-mobile.tsx` lines 6, 18

```typescript
const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);
// ...
return !!isMobile; // undefined -> false on first render
```

**Problem:** On initial render, `isMobile` is `undefined`, converted to `false`. This causes a flash of desktop UI on mobile devices before hydration completes.

---

## Hardening Plan

### Phase 1: Eliminate Global Window Pattern (Critical)

Replace the window-based communication with proper React patterns:

1. **Create a shared sidebar context** that both `AnimatedSidebar` and `AppLayout` can consume
2. **Lift state up** to `AppLayout` and pass down as controlled props
3. **Remove polling interval** - use direct state binding instead

**New Architecture:**
```text
AppLayout (owns sidebar open state)
  └── SidebarProvider (provides state + toggle)
        ├── Sidebar (consumes state)
        └── Header (consumes toggle function)
```

### Phase 2: Add Sidebar-Specific Error Boundary

Create `SidebarErrorBoundary.tsx` with:
- Graceful fallback showing collapsed icon-only sidebar
- Error logging to monitoring system
- Auto-recovery attempt after 3 seconds
- Manual retry button

### Phase 3: Stabilize Animation Layer

1. Add `layoutId` to motion components for stable identity
2. Use `AnimatePresence` with `initial={false}` to prevent mount animations
3. Add `onAnimationComplete` handlers to prevent overlapping animations
4. Debounce toggle function (300ms) to prevent rapid fire

### Phase 4: Safe Context Access

Create `useSidebarSafe()` hook:
```typescript
export const useSidebarSafe = () => {
  const context = useContext(SidebarContext);
  return context ?? { open: false, setOpen: () => {}, toggle: () => {} };
};
```

### Phase 5: Fix Mobile Detection Hydration

Initialize `isMobile` with SSR-safe default based on `navigator.userAgent` where available, or use CSS media queries as truth source.

### Phase 6: Navigation Config Validation

Add runtime validation to `getNavigationForRole()`:
```typescript
if (!role || !['candidate', 'partner', 'admin', 'strategist'].includes(role)) {
  console.warn('[Navigation] Invalid role, defaulting to candidate');
  return getNavigationForRole('candidate');
}
```

### Phase 7: Z-Index Standardization

Create CSS custom properties:
```css
--z-sidebar-overlay: 80;
--z-sidebar-mobile: 90;
--z-header: 100;
--z-sidebar-desktop: 110;
--z-modal: 120;
```

---

## Implementation Summary

| File | Changes |
|------|---------|
| `src/components/AnimatedSidebar.tsx` | Remove window globals, add safe context, debounce toggle, stabilize animations |
| `src/components/AppLayout.tsx` | Remove polling, lift state, add SidebarErrorBoundary wrapper |
| `src/components/SidebarErrorBoundary.tsx` | New file - sidebar-specific error boundary |
| `src/hooks/use-mobile.tsx` | Fix hydration flash with SSR-safe initial value |
| `src/hooks/useNavigationState.ts` | Add error handling for localStorage access |
| `src/config/navigation.config.ts` | Add validation and fallback for invalid roles |
| `src/index.css` | Add z-index CSS custom properties |

---

## Expected Outcome

After implementation:
1. Sidebar state is fully React-controlled (no window globals)
2. Errors in sidebar components are isolated and recoverable
3. Animations are stable even under rapid user interaction
4. Mobile/desktop transitions are smooth without layout flash
5. Navigation gracefully handles invalid or loading role states
6. Z-index layering is predictable and consistent
