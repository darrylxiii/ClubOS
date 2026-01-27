
# Logo Squeezing Fix - Full Audit and Resolution

## Problem Identified

The Quantum Club logo appears "squeezed" because several pages are using the **wrong logo assets**. The pages are importing the SHORT icon versions (`quantum-logo-*-transparent.png`) instead of the FULL text logo versions (`quantum-club-logo.png` and `quantum-logo-dark.png`).

### Asset Clarification

| Asset File | What It Is | When to Use |
|------------|-----------|-------------|
| `quantum-logo-dark-transparent.png` | QC clover ICON (black) | Collapsed sidebar, favicons |
| `quantum-logo-light-transparent.png` | QC clover ICON (white) | Collapsed sidebar, favicons |
| `quantum-club-logo.png` | FULL "Quantum CLUB" text logo (black) | Light theme headers, auth pages |
| `quantum-logo-dark.png` | FULL "Quantum CLUB" text logo (white) | Dark theme headers, auth pages |

### Current Incorrect Usage

| File | Current Import | Issue |
|------|----------------|-------|
| `Auth.tsx` | `quantum-logo-*-transparent.png` with `w-32 h-32` | Using SHORT icon with forced square dimensions |
| `PartnerFunnel.tsx` | `quantum-logo-*-transparent.png` with `h-28` | Using SHORT icon for header |
| `CandidateOnboarding.tsx` | `quantum-logo-*-transparent.png` with `h-28` | Using SHORT icon for header |
| `PendingApproval.tsx` | `quantum-logo-*-transparent.png` with `h-28` | Using SHORT icon for header |
| `PartnershipSubmitted.tsx` | `quantum-logo-*-transparent.png` with `h-28` | Using SHORT icon for header |
| `Install.tsx` | `quantum-logo-*-transparent.png` with `w-14 h-14` | Using SHORT icon with forced square |
| `NotFound.tsx` | `quantum-logo-*-transparent.png` with `h-12` | Using SHORT icon |

---

## Implementation Plan

### 1. Fix Auth.tsx (Lines 46-47, 484-487)

**Change imports from:**
```tsx
import quantumLogoLight from "@/assets/quantum-logo-light-transparent.png";
import quantumLogoDark from "@/assets/quantum-logo-dark-transparent.png";
```

**To:**
```tsx
import quantumLogoLight from "@/assets/quantum-logo-dark.png";     // White logo for dark theme
import quantumLogoDark from "@/assets/quantum-club-logo.png";      // Black logo for light theme
```

**Update logo render (line 484-487):**
```tsx
<div className="flex items-center justify-center mb-2">
  <img src={quantumLogoDark} alt="The Quantum Club" className="h-24 w-auto dark:hidden" />
  <img src={quantumLogoLight} alt="The Quantum Club" className="h-24 w-auto hidden dark:block" />
</div>
```
- Remove fixed `w-32 h-32` (forces square)
- Use `h-24 w-auto` to maintain aspect ratio

### 2. Fix PartnerFunnel.tsx (Lines 9-10, 42-50, 77-85)

**Change imports:**
```tsx
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";
```

**Update logo render:**
```tsx
<img 
  src={quantumLogoDark} 
  alt="Quantum Club" 
  className="h-20 w-auto dark:hidden"
/>
<img 
  src={quantumLogoLight} 
  alt="Quantum Club" 
  className="h-20 w-auto hidden dark:block"
/>
```
- Add `w-auto` to preserve aspect ratio

### 3. Fix CandidateOnboarding.tsx (Lines 8-9, 35-43, 75-83)

**Change imports:**
```tsx
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";
```

**Update logo render:**
```tsx
<img src={quantumLogoDark} alt="Quantum Club" className="h-20 w-auto dark:hidden" />
<img src={quantumLogoLight} alt="Quantum Club" className="h-20 w-auto hidden dark:block" />
```

### 4. Fix PendingApproval.tsx (Lines 8-9, 78-79)

**Change imports:**
```tsx
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";
```

**Update logo render:**
```tsx
<img src={quantumLogoDark} alt="Quantum Club" className="h-20 w-auto dark:hidden" />
<img src={quantumLogoLight} alt="Quantum Club" className="h-20 w-auto hidden dark:block" />
```

### 5. Fix PartnershipSubmitted.tsx (Lines 7-8, 37-45)

**Change imports:**
```tsx
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";
```

**Update logo render:**
```tsx
<img src={quantumLogoDark} alt="Quantum Club" className="h-20 w-auto dark:hidden" />
<img src={quantumLogoLight} alt="Quantum Club" className="h-20 w-auto hidden dark:block" />
```

### 6. Fix Install.tsx (Lines 17-18, 87-96)

**Change imports:**
```tsx
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";
```

**Update logo render:**
```tsx
<div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
  <img src={quantumLogoDark} alt="The Quantum Club" className="h-16 w-auto dark:hidden" />
  <img src={quantumLogoLight} alt="The Quantum Club" className="h-16 w-auto hidden dark:block" />
</div>
```

### 7. Fix NotFound.tsx (Lines 6-7, 74-82)

**Change imports:**
```tsx
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";
```

**Update logo render:**
```tsx
<img src={quantumLogoDark} alt="The Quantum Club" className="h-12 w-auto object-contain dark:hidden" />
<img src={quantumLogoLight} alt="The Quantum Club" className="h-12 w-auto object-contain hidden dark:block" />
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Switch to full logo imports, change `w-32 h-32` to `h-24 w-auto` |
| `src/pages/PartnerFunnel.tsx` | Switch to full logo imports, add `w-auto` |
| `src/pages/CandidateOnboarding.tsx` | Switch to full logo imports, add `w-auto` |
| `src/pages/PendingApproval.tsx` | Switch to full logo imports, add `w-auto` |
| `src/pages/PartnershipSubmitted.tsx` | Switch to full logo imports, add `w-auto` |
| `src/pages/Install.tsx` | Switch to full logo imports, change dimensions |
| `src/pages/NotFound.tsx` | Switch to full logo imports, add `w-auto` |

---

## Key Fixes Applied

1. **Correct asset files** - Use `quantum-club-logo.png` (black full logo) and `quantum-logo-dark.png` (white full logo) instead of the transparent icon files
2. **Preserve aspect ratio** - Always use `w-auto` with a fixed height to prevent squeezing
3. **Consistent sizing** - Use appropriate heights for each context (h-20 for headers, h-24 for auth, h-12 for compact areas)

---

## Testing Checklist

After implementation, verify on these pages in BOTH light and dark modes:
1. `/auth` - Login page - logo should show full "Quantum CLUB" text
2. `/onboarding` - Candidate onboarding - logo in header
3. `/partner-funnel` - Partner request - logo in header
4. `/pending-approval` - Pending approval page - logo in header
5. `/partnership-submitted` - Submission confirmation - logo in header
6. `/404` - Not found page - logo in header
7. `/install` - PWA install page - logo in card
8. Main app sidebar - Verify expanded state still shows correct logo
