

# Fix: Smooth Logo Transition on Sidebar Expand/Collapse

## Problem Understood

When the sidebar expands, the small QC icon doesn't smoothly transition into the full logo. Instead, the small icon persists/lingers during the expansion, making the transition feel broken.

**Root cause:** Animation timing mismatch and `AnimatePresence mode="wait"`:

| Animation | Duration |
|-----------|----------|
| Sidebar width | 300ms |
| Logo exit | 150ms |
| Logo enter | 150ms (after exit completes) |

With `mode="wait"`, the exit must complete before enter starts, creating a 300ms total logo transition that fights with the sidebar width animation. The user sees the small logo hanging around too long.

---

## Solution

Replace the dual-element crossfade approach with a **single morphing container** using Framer Motion's `layout` animation. Both logos remain in the DOM but we animate scale and opacity to create a seamless morph effect.

**Key changes:**
1. Remove `AnimatePresence mode="wait"` - no waiting for exit
2. Use **overlapping opacity transitions** so one fades out while the other fades in simultaneously
3. Sync animation duration with sidebar width (300ms)
4. Add `position: absolute` layering so both logos occupy the same space during transition

---

## Implementation

**File:** `src/components/AnimatedSidebar.tsx`

**Updated Logo Section (lines 211-258):**

```typescript
{/* Logo - Morphing container */}
<div className="h-16 flex items-center justify-center px-4 border-b border-border/20 relative overflow-hidden">
  {/* Full logo - visible when expanded */}
  <motion.div
    className="absolute flex items-center justify-center"
    initial={false}
    animate={{
      opacity: open ? 1 : 0,
      scale: open ? 1 : 0.8,
    }}
    transition={{
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    }}
  >
    <img
      src={logoLight}
      alt="The Quantum Club"
      className="hidden dark:block h-10"
    />
    <img
      src={logoDark}
      alt="The Quantum Club"
      className="dark:hidden block h-10"
    />
  </motion.div>

  {/* Small QC icon - visible when collapsed */}
  <motion.div
    className="absolute flex items-center justify-center"
    initial={false}
    animate={{
      opacity: open ? 0 : 1,
      scale: open ? 1.2 : 1,
    }}
    transition={{
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    }}
  >
    <img
      src={logoLightShort}
      alt="QC"
      className="hidden dark:block h-10"
    />
    <img
      src={logoDarkShort}
      alt="QC"
      className="dark:hidden block h-10"
    />
  </motion.div>
</div>
```

---

## How It Works

| State | Full Logo | QC Icon |
|-------|-----------|---------|
| **Collapsed** | opacity: 0, scale: 0.8 | opacity: 1, scale: 1 |
| **Expanding** | opacity: 0→1, scale: 0.8→1 | opacity: 1→0, scale: 1→1.2 |
| **Expanded** | opacity: 1, scale: 1 | opacity: 0, scale: 1.2 |

Both animations run simultaneously over 300ms (matching sidebar width), creating the illusion that the QC icon "grows into" the full logo.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AnimatedSidebar.tsx` | Replace AnimatePresence crossfade with simultaneous opacity/scale morphing animation |

---

## Visual Result

1. **Collapsed:** Small QC icon visible
2. **Expanding:** QC icon fades out + scales up slightly, full logo fades in + scales from 80% to 100%
3. **Expanded:** Full "QuantumCLUB" logo visible

The transition is perfectly synchronized with the sidebar width animation (300ms), creating a smooth, polished morph effect.

