
# Light/Dark Theme Fix - Comprehensive Site-Wide Audit

## Overview
This plan addresses all theme visibility issues across The Quantum Club application, with the primary issue being the QC logo showing white-on-white in light mode. The audit identifies 15+ locations where logos and theme-sensitive elements need fixes.

---

## Root Cause Analysis

### Logo Asset Naming Convention (SWAPPED/CONFUSING)
The current naming convention in the codebase is **inverted**, causing confusion:
- `quantum-logo-light-transparent.png` = WHITE logo (for dark backgrounds)
- `quantum-logo-dark-transparent.png` = BLACK logo (for light backgrounds)

This means:
- Light theme needs `quantumLogoDark` (black logo)
- Dark theme needs `quantumLogoLight` (white logo)

### Current Issues Found

| Location | Issue | Theme Affected |
|----------|-------|----------------|
| Auth.tsx | Uses single SVG logo `/quantum-logo.svg` - may not have proper contrast | Both |
| PartnerFunnel.tsx | Logo classes appear correct but need verification | Light |
| CandidateOnboarding.tsx | Logo classes appear correct but need verification | Light |
| PendingApproval.tsx | Logo classes appear correct but need verification | Light |
| NotFound.tsx | Uses `resolvedTheme` conditional - references non-existent `/quantum-logo-dark.png` | Both |
| Install.tsx | Uses single SVG `/quantum-logo.svg` - no theme variant | Both |
| AppLayout.tsx | Mobile header uses correct pattern | OK |
| AnimatedSidebar.tsx | Desktop sidebar logo swap logic is **inverted** (lines 133-162, 243-251) | Both |
| ForgotPassword.tsx | No logo, uses icon only | OK |

---

## Implementation Plan

### 1. Fix Auth.tsx Logo
**File:** `src/pages/Auth.tsx`
**Lines:** 46, 484

Replace single SVG with theme-aware dual logos:
```tsx
// Add imports
import quantumLogoLight from "@/assets/quantum-logo-light-transparent.png";
import quantumLogoDark from "@/assets/quantum-logo-dark-transparent.png";

// Replace logo render (around line 484)
<div className="flex items-center justify-center mb-2">
  <img 
    src={quantumLogoDark} 
    alt="The Quantum Club" 
    className="w-32 h-32 dark:hidden" 
  />
  <img 
    src={quantumLogoLight} 
    alt="The Quantum Club" 
    className="w-32 h-32 hidden dark:block" 
  />
</div>
```

### 2. Fix NotFound.tsx Logo Reference
**File:** `src/pages/NotFound.tsx`
**Lines:** 74-78

Replace with proper asset imports (current references non-existent public files):
```tsx
// Add imports
import quantumLogoLight from "@/assets/quantum-logo-light-transparent.png";
import quantumLogoDark from "@/assets/quantum-logo-dark-transparent.png";

// Replace logo (lines 74-78)
<img
  src={quantumLogoDark}
  alt="The Quantum Club"
  className="h-12 w-auto object-contain dark:hidden"
/>
<img
  src={quantumLogoLight}
  alt="The Quantum Club"
  className="h-12 w-auto object-contain hidden dark:block"
/>
```

### 3. Fix Install.tsx Logo
**File:** `src/pages/Install.tsx`
**Lines:** 85-89

Add theme-aware logo:
```tsx
// Add imports
import quantumLogoLight from "@/assets/quantum-logo-light-transparent.png";
import quantumLogoDark from "@/assets/quantum-logo-dark-transparent.png";

// Replace single logo with dual (lines 85-89)
<img 
  src={quantumLogoDark} 
  alt="The Quantum Club" 
  className="w-14 h-14 dark:hidden"
/>
<img 
  src={quantumLogoLight} 
  alt="The Quantum Club" 
  className="w-14 h-14 hidden dark:block"
/>
```

### 4. Fix AnimatedSidebar.tsx Logo Logic (CRITICAL)
**File:** `src/components/AnimatedSidebar.tsx`

The sidebar logo logic is **inverted** in multiple places:

**Desktop Sidebar (lines 133-142 - EXPANDED state, lines 154-163 - COLLAPSED state):**
Current code shows `logoLightShort` for dark mode and `logoDarkShort` for light mode in EXPANDED state.

This appears correct based on the inverted naming, but the COLLAPSED state (lines 154-163) shows:
- `logoLight` in dark mode
- `logoDark` in light mode

And `AppLayout.tsx` passes:
- `logoLight` = `quantum-logo-dark.png` (white logo)
- `logoDark` = `quantum-club-logo.png` (black logo)

The naming is extremely confusing. We need to verify each logo file visually and ensure:
- Light theme → Black/dark-colored logo visible
- Dark theme → White/light-colored logo visible

**Mobile Sidebar (lines 243-251):**
Same issue - need to verify the swap is correct.

### 5. Verify PartnerFunnel.tsx, CandidateOnboarding.tsx, PendingApproval.tsx
**Files:** All three pages

Current pattern (appears correct):
```tsx
<img src={quantumLogoDark} className="h-28 dark:hidden" />
<img src={quantumLogoLight} className="h-28 hidden dark:block" />
```

This shows:
- `quantumLogoDark` (black logo) on light theme ✓
- `quantumLogoLight` (white logo) on dark theme ✓

**No changes needed** if the asset files are correctly named.

---

## Summary of Files to Modify

| File | Action |
|------|--------|
| `src/pages/Auth.tsx` | Add theme-aware dual logo |
| `src/pages/NotFound.tsx` | Fix logo references to use imported assets |
| `src/pages/Install.tsx` | Add theme-aware dual logo |
| `src/components/AnimatedSidebar.tsx` | Verify and potentially fix logo swap logic |

---

## Technical Notes

### Correct Pattern for Theme-Aware Logos
```tsx
// Light theme: show dark/black logo (visible on white background)
<img src={darkLogo} className="dark:hidden" />

// Dark theme: show light/white logo (visible on dark background)
<img src={lightLogo} className="hidden dark:block" />
```

### Asset File Clarification
Based on naming convention:
- `quantum-logo-dark-transparent.png` = BLACK logo (use in light mode)
- `quantum-logo-light-transparent.png` = WHITE logo (use in dark mode)
- `quantum-club-logo.png` = BLACK full logo (use in light mode)
- `quantum-logo-dark.png` = WHITE full logo (use in dark mode)

---

## Testing Checklist

After implementation, verify on these pages in BOTH light and dark modes:
1. `/auth` - Login page
2. `/onboarding` - Candidate onboarding
3. `/partner-funnel` - Partner request
4. `/pending-approval` - Pending approval page
5. `/404` - Not found page
6. `/install` - PWA install page
7. Main app sidebar (collapsed and expanded states)
8. Mobile menu header
