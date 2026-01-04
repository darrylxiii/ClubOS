# Accessibility Checklist

This document provides a comprehensive checklist for ensuring WCAG 2.1 AA compliance across The Quantum Club platform.

## Pre-Commit Checklist

### 1. ARIA Labels (P0 - Critical)

- [ ] All icon-only buttons have `aria-label` attributes
- [ ] All form inputs have associated labels
- [ ] All images have meaningful `alt` text
- [ ] Decorative images use `alt=""` or `aria-hidden="true"`
- [ ] Complex components have appropriate ARIA roles

```tsx
// Icon button example
<Button 
  variant="ghost" 
  size="icon" 
  aria-label="Close dialog"  // ✅ Required
>
  <X className="h-4 w-4" aria-hidden="true" />
</Button>

// Form input example
<Label htmlFor="email">Email Address</Label>
<Input id="email" type="email" aria-describedby="email-hint" />
<p id="email-hint" className="text-sm text-muted-foreground">
  We'll never share your email.
</p>
```

---

### 2. Keyboard Navigation (P0 - Critical)

- [ ] All interactive elements are focusable via Tab
- [ ] Focus order follows visual/logical order
- [ ] Escape key closes modals/popups
- [ ] Arrow keys navigate within components (menus, tabs)
- [ ] Enter/Space activates buttons and links
- [ ] No keyboard traps (except intentional focus traps)

```tsx
// Focus trap for modals
useEffect(() => {
  if (isOpen) {
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    // Focus first element
    focusableElements?.[0]?.focus();
  }
}, [isOpen]);
```

---

### 3. Focus Indicators (P0 - Critical)

- [ ] All focusable elements have visible focus rings
- [ ] Focus rings meet 3:1 contrast ratio
- [ ] Focus rings are not removed (no `outline: none` without replacement)

```css
/* Default focus ring - already in globals */
:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

---

### 4. Color Contrast (P0 - Critical)

| Element Type | Minimum Ratio |
|-------------|---------------|
| Normal text (<18px) | 4.5:1 |
| Large text (≥18px bold or ≥24px) | 3:1 |
| UI components | 3:1 |
| Non-text (icons, borders) | 3:1 |

- [ ] Primary text meets 4.5:1 ratio
- [ ] Muted text meets 4.5:1 ratio
- [ ] Error/success states meet contrast requirements
- [ ] Interactive elements have sufficient contrast

**Tools for testing:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Axe DevTools browser extension
- Lighthouse accessibility audit

---

### 5. Screen Reader Support (P1 - High)

- [ ] Dynamic content updates use live regions
- [ ] Loading states are announced
- [ ] Error messages are announced
- [ ] Page title updates on navigation

```tsx
// Live region for announcements
import { useAnnounce } from "@/hooks/useAnnounce";

const { announce } = useAnnounce();

// On successful action
announce("Profile saved successfully", "polite");

// On error
announce("Error: Failed to save profile", "assertive");
```

---

### 6. Semantic HTML (P1 - High)

- [ ] Use `<button>` for actions, not `<div>` or `<span>`
- [ ] Use `<a>` for navigation links
- [ ] Use heading hierarchy (`<h1>` → `<h2>` → `<h3>`)
- [ ] Use landmark regions (`<header>`, `<main>`, `<nav>`, `<footer>`)
- [ ] Use `<ul>`/`<ol>` for lists

```tsx
// ✅ Correct
<button onClick={handleClick}>Submit</button>
<a href="/profile">View Profile</a>

// ❌ Incorrect
<div onClick={handleClick}>Submit</div>
<span onClick={handleNav}>View Profile</span>
```

---

### 7. Forms (P1 - High)

- [ ] All inputs have visible labels
- [ ] Required fields are indicated
- [ ] Error messages are associated with inputs
- [ ] Form validation errors are clear and specific
- [ ] Autocomplete attributes are used where appropriate

```tsx
<FormField 
  label="Password" 
  required
  error={errors.password?.message}
>
  <Input 
    type="password"
    autoComplete="new-password"
    aria-invalid={!!errors.password}
    aria-describedby="password-error"
  />
</FormField>
{errors.password && (
  <p id="password-error" role="alert" className="text-destructive">
    {errors.password.message}
  </p>
)}
```

---

### 8. Motion & Animation (P1 - High)

- [ ] Respect `prefers-reduced-motion`
- [ ] No auto-playing videos/animations (or provide controls)
- [ ] No content that flashes more than 3 times per second

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

### 9. Touch Targets (P1 - High)

- [ ] Interactive elements are at least 44x44px on mobile
- [ ] Adequate spacing between touch targets

```tsx
// Mobile touch target
<Button className="min-h-11 min-w-11">
  <Icon className="h-5 w-5" />
</Button>
```

---

### 10. Responsive Design (P2 - Medium)

- [ ] Content is readable at 200% zoom
- [ ] No horizontal scrolling at 320px width
- [ ] Text reflows without loss of content

---

## Testing Procedures

### Automated Testing

1. **Axe DevTools** - Run on every page
2. **Lighthouse** - Aim for 95+ accessibility score
3. **ESLint jsx-a11y** - Catches common issues in code

### Manual Testing

1. **Keyboard-only navigation**
   - Tab through entire page
   - Verify focus is visible at all times
   - Test all interactive elements with Enter/Space

2. **Screen reader testing**
   - Test with VoiceOver (Mac) or NVDA (Windows)
   - Verify all content is announced
   - Check reading order makes sense

3. **Zoom testing**
   - Test at 200% zoom
   - Verify all content is still accessible
   - Check for horizontal overflow

4. **Color contrast testing**
   - Use contrast checkers for all text
   - Test in both light and dark modes

---

## Common Issues & Fixes

### Missing `aria-label`

```tsx
// ❌ Problem
<Button size="icon"><X /></Button>

// ✅ Fix
<Button size="icon" aria-label="Close"><X /></Button>
```

### Non-accessible loading states

```tsx
// ❌ Problem
{loading && <div>Loading...</div>}

// ✅ Fix
{loading && (
  <div role="status" aria-live="polite">
    <LoadingSkeleton />
    <span className="sr-only">Loading content...</span>
  </div>
)}
```

### Missing form labels

```tsx
// ❌ Problem
<Input placeholder="Email" />

// ✅ Fix
<Label htmlFor="email">Email</Label>
<Input id="email" placeholder="email@example.com" />
```

### Div with onClick

```tsx
// ❌ Problem
<div onClick={handleClick}>Click me</div>

// ✅ Fix
<button onClick={handleClick}>Click me</button>
```

### Removed focus outline

```css
/* ❌ Problem */
button:focus { outline: none; }

/* ✅ Fix */
button:focus-visible { 
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Axe Accessibility Rules](https://dequeuniversity.com/rules/axe/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [Inclusive Components](https://inclusive-components.design/)

---

## Audit Schedule

| Audit Type | Frequency | Owner |
|------------|-----------|-------|
| Automated (Axe/Lighthouse) | Every PR | Developer |
| Manual keyboard testing | Weekly | QA |
| Screen reader testing | Bi-weekly | QA |
| Full accessibility audit | Quarterly | External |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Lighthouse Accessibility Score | ~75 | 95+ |
| ARIA Label Coverage | 40% | 100% |
| Automated Test Pass Rate | 80% | 100% |
| Keyboard Navigation Issues | Unknown | 0 |
