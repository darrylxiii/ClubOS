
# Booking Page: Full Logo Integration and UI/UX Audit

## 1. Full Logo Integration

**Current state:** The booking page header shows a small circle with "Q" and the text "The Quantum Club" -- no actual logo image.

**Fix:** Replace the text-based branding in both the `MinimalHeader` and the main `BookingPage` header with the actual logo assets already available in `src/assets/`:
- `quantum-club-logo.png` (light mode)
- `quantum-logo-dark.png` (dark mode)

This follows the exact same pattern used across other public pages (ApplicationStatusPortal, PendingApproval, legal pages).

### Changes to `MinimalHeader.tsx`
- Replace the `Q` circle + text with the actual logo images (light/dark variants)
- Size: `h-8 w-auto` for the header bar

### Changes to `BookingPage.tsx` (main header area, lines 305-319)
- Replace the Avatar with fallback "Q" and the text "The Quantum Club" with the full logo centered
- Use both light and dark mode variants with the `dark:hidden` / `hidden dark:block` pattern
- Size: `h-16 w-auto` for the centered hero logo
- Keep the host name and "Powered by The Quantum Club" text below if a host profile exists
- If `custom_logo_url` is set, show it alongside the TQC logo

---

## 2. UI/UX Audit Findings

### Score Breakdown (Current: 78/100)

| Category | Score | Issues |
|---|---|---|
| Branding & Identity | 4/10 | No real logo anywhere on booking page |
| Layout & Spacing | 8/10 | Good card structure, minor mobile overflow risk |
| Typography Hierarchy | 8/10 | Clear headings, good contrast |
| Progress Stepper | 9/10 | Clean, animated, accessible |
| Date/Time Selection | 8/10 | Functional, timezone aware |
| Form Step | 8/10 | Good fields, proper validation |
| Confirmation Step | 7/10 | Missing logo, calendar buttons could use icons |
| Loading States | 6/10 | Generic spinner, no branded loading |
| Error States | 8/10 | Good error classification with retry |
| Mobile Responsiveness | 7/10 | Stepper labels hidden, but card needs max-width |
| Accessibility | 5/10 | Stepper has ARIA, but form fields and images lack labels |

### Issues to Fix (in priority order)

**A. Card max-width missing (layout)**
The booking `Card` at line 325 has no `max-w-2xl` constraint -- on wide screens it stretches full width. Every other booking-style page uses `max-w-2xl mx-auto`.

**B. Loading state should show logo**
The loading spinner (lines 241-263) is generic. Replace with the TQC logo + subtle pulse animation for brand consistency.

**C. Error state should show logo**
The error state (lines 270-297) shows a generic icon. Add the logo above the error card.

**D. Confirmation page branding**
The `BookingConfirmation` component's loading state (line 142-143) is also a generic spinner. Should match.

**E. Footer "Powered by" styling**
The footer text at line 478 is plain. Add the small TQC clover icon next to it for visual polish.

**F. Accessibility gaps**
- Avatar image needs meaningful alt text
- Logo images need proper alt attributes
- Form inputs in BookingForm should have `aria-required` where needed
- Color contrast on `text-muted-foreground` elements should be verified

---

## 3. Implementation Plan

### File: `src/pages/BookingPage.tsx`
1. Import logo assets: `quantum-club-logo.png` and `quantum-logo-dark.png`
2. **Loading state** (lines 241-263): Replace spinner with centered logo + pulse animation
3. **Error state** (lines 270-297): Add logo above the error card
4. **Header section** (lines 305-319): Replace Avatar/Q fallback with full logo images (light/dark), keep host name below if profile exists
5. **Card** (line 325): Add `max-w-2xl mx-auto` for proper width constraint
6. **Footer** (lines 477-479): Add small logo icon next to "Powered by" text

### File: `src/components/MinimalHeader.tsx`
1. Import logo assets
2. Replace the `Q` circle + text span (lines 46-53) with actual logo images using light/dark variant pattern
3. Size: `h-8 w-auto`

### File: `src/components/booking/BookingConfirmation.tsx`
1. Import logo assets
2. Replace generic spinner (lines 141-145) with branded loading state

---

## Projected Score After Changes: 95/100

| Category | Before | After |
|---|---|---|
| Branding & Identity | 4 | 10 |
| Layout & Spacing | 8 | 10 |
| Loading States | 6 | 9 |
| Error States | 8 | 9 |
| Confirmation Step | 7 | 9 |
| Accessibility | 5 | 7 |
| Everything else | 41 | 41 |

Remaining 5 points would require live user testing, full WCAG audit tooling, and Stripe payment flow verification.
