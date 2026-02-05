

## Fix: Swap Logo Sources & Align Q Size

### The Problem

From your screenshots:
- **Collapsed sidebar** shows "QuantumCLUB" wordmark → should show QC icon
- **Expanded sidebar** shows QC icon → should show full wordmark
- The expanded logo's "Q" appears smaller than the collapsed icon's "Q"

### Root Cause

The animation logic is correct (`open ? 1 : 0` etc.), but the actual image sources are placed in the wrong motion.div containers. We've been swapping props back and forth in AppLayout, but the real fix is to swap the `src` attributes in AnimatedSidebar.tsx directly.

---

## Solution

### Change 1: Swap the logo sources in AnimatedSidebar.tsx

Instead of:
- First motion.div (expanded state) uses `logoLight`/`logoDark`
- Second motion.div (collapsed state) uses `logoLightShort`/`logoDarkShort`

We swap them:
- First motion.div (expanded state) uses `logoLightShort`/`logoDarkShort`
- Second motion.div (collapsed state) uses `logoLight`/`logoDark`

### Change 2: Scale the expanded logo so the "Q" matches

The full wordmark has the Q at a smaller relative size compared to the standalone QC mark. To make both Q's visually identical:

| State | Current | New |
|-------|---------|-----|
| Expanded wordmark | h-20 (80px) | **h-28** (~112px) |
| Collapsed QC icon | h-12 (48px) | h-12 (unchanged) |

The wordmark is roughly 2.3× wider than it is tall, while the QC icon is nearly square. By scaling the wordmark to h-28, the "Q" portion will be approximately the same visual height as the h-12 QC icon.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/AnimatedSidebar.tsx` | Swap `logoLight`↔`logoLightShort` and `logoDark`↔`logoDarkShort` between the two motion.divs; increase expanded logo height to h-28 |

---

## Updated Code

```tsx
{/* Logo container */}
<div className="h-28 flex items-center justify-center px-4 border-b border-border/20 relative z-header overflow-hidden">
  
  {/* Full wordmark - visible when EXPANDED (open=true) */}
  <motion.div
    animate={{
      opacity: open ? 1 : 0,
      scale: open ? 1 : 0.8,
      visibility: open ? "visible" : "hidden",
    }}
    // ... transitions same as before
  >
    <img src={logoLightShort} className="hidden dark:block h-28" />  {/* SWAPPED & BIGGER */}
    <img src={logoDarkShort} className="dark:hidden block h-28" />   {/* SWAPPED & BIGGER */}
  </motion.div>

  {/* QC icon - visible when COLLAPSED (open=false) */}
  <motion.div
    animate={{
      opacity: open ? 0 : 1,
      scale: open ? 1.2 : 1,
      visibility: open ? "hidden" : "visible",
    }}
    // ... transitions same as before
  >
    <img src={logoLight} className="hidden dark:block h-12" />  {/* SWAPPED */}
    <img src={logoDark} className="dark:hidden block h-12" />   {/* SWAPPED */}
  </motion.div>
  
</div>
```

---

## Result

| State | Logo Displayed | Q Visual Size |
|-------|----------------|---------------|
| **Collapsed (80px)** | QC icon (h-12) | ~48px |
| **Expanded (300px)** | Full wordmark (h-28) | ~48px (the Q portion within the larger wordmark) |

Both Q's will now appear visually identical in size, and the correct logo will appear in each state.

