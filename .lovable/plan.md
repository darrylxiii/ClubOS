

## Final Fixes: Border Alignment + Collapsed Logo Size

### Issue 1: Border Misalignment

**Current state:**
- Header: `h-14 sm:h-16` (56-64px tall), border at bottom
- Logo container: `h-28` (112px tall), border at bottom

The logo container's bottom border is at 112px, while the header's bottom border is at 64px. They don't align.

**Fix:** Change logo container height to match header: `h-14 sm:h-16`

---

### Issue 2: Collapsed Logo Too Small

Looking at your screenshots, the collapsed QC icon appears noticeably smaller than the "Q" in the expanded wordmark.

**Current:** `h-12` (48px)
**Fix:** Increase to `h-14` (56px) to better match the visual weight of the expanded wordmark

---

### Issue 3: Expanded Logo Must Shrink to Fit

Since the container will now be `h-16` (64px) instead of `h-28` (112px), the expanded wordmark must also shrink.

**Current:** `h-28` (112px) - won't fit
**Fix:** `h-16` or `h-14` to fit within the smaller container

This will make the Q in the wordmark smaller, but that's unavoidable if we want border alignment. The collapsed icon at `h-14` should now be closer in visual weight.

---

## File to Modify

`src/components/AnimatedSidebar.tsx`

```tsx
{/* Logo container - matching header height for border alignment */}
<div className="h-14 sm:h-16 flex items-center justify-center px-4 border-b border-border/20 relative z-header overflow-hidden">
  
  {/* Full wordmark - visible when expanded */}
  <motion.div ...>
    <img src={logoLightShort} className="hidden dark:block h-14 sm:h-16" />
    <img src={logoDarkShort} className="dark:hidden block h-14 sm:h-16" />
  </motion.div>

  {/* QC icon - visible when collapsed (bigger now) */}
  <motion.div ...>
    <img src={logoLight} className="hidden dark:block h-14" />
    <img src={logoDark} className="dark:hidden block h-14" />
  </motion.div>
  
</div>
```

---

## Result

| Element | Before | After |
|---------|--------|-------|
| Logo container height | h-28 (112px) | h-14 sm:h-16 (56-64px) |
| Expanded wordmark | h-28 (112px) | h-14 sm:h-16 (56-64px) |
| Collapsed icon | h-12 (48px) | h-14 (56px) |
| Border alignment | Misaligned | ✓ Aligned with header |

The bottom border of the logo section will now sit at the exact same vertical position as the bottom border of the main header, creating a continuous visual line.

