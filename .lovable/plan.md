

# 2030 UX Upgrade — Implementation Plan

9 features (excluding 3D Card Tilt per your request). Three batches, pure implementation details.

---

## Batch 1: Cinematic Motion Foundation

### Feature 1: View Transitions API for Route Changes

**Current**: `ProtectedLayout.tsx` uses `AnimatePresence` + framer-motion opacity fade (0→1, 150ms). Generic, flat.

**Implementation**:
- New file: `src/hooks/useViewTransition.ts`
  - Wraps `react-router-dom`'s `useNavigate` — returns a `navigateWithTransition(to)` function
  - Calls `document.startViewTransition(() => navigate(to))` when supported
  - Falls back to plain `navigate(to)` when unsupported (Firefox, older browsers)
  - Exports a `supportsViewTransitions` boolean
- Edit `src/components/ProtectedLayout.tsx`:
  - When View Transitions API is supported: remove `AnimatePresence` + `motion.div` wrapper entirely — the browser handles the cross-fade natively with `::view-transition-*` pseudo-elements
  - When unsupported: keep current framer-motion fade as fallback
- Add to `src/index.css`:
  ```css
  ::view-transition-old(root) {
    animation: 200ms ease-out fade-out, 200ms ease-out scale-out;
  }
  ::view-transition-new(root) {
    animation: 300ms ease-out fade-in, 300ms ease-out scale-in;
  }
  ```
  - Add `view-transition-name: page-header` to shared header elements and `view-transition-name: stat-card` to stat cards — enabling morph transitions between pages that share these elements

### Feature 2: Scroll-Linked Reveal Animations

**New file**: `src/components/ui/scroll-reveal.tsx`
- A wrapper component: `<ScrollReveal variant="fade-up" delay={0} stagger={0.08}>`
- Uses framer-motion's `useInView` (already exported from `src/lib/motion.ts`)
- Respects `MotionContext` — when `motionEnabled === false`, renders children immediately with no animation
- Respects `prefers-reduced-motion` media query
- Variants: `fade-up` (translateY 24px→0 + opacity), `fade-scale` (scale 0.95→1 + opacity), `blur-in` (blur 8px→0 + opacity)

**Integration**:
- `CandidateHome.tsx`: Replace manual `motion.div {...fade}` blocks with `<ScrollReveal>` wrappers — each section reveals as user scrolls
- `AdminHome.tsx`, `PartnerHome.tsx`: Wrap each `DashboardSection` in `<ScrollReveal>`
- Settings pages: Wrap each section

### Feature 3: Animated Number Component

**New file**: `src/components/ui/animated-number.tsx`
- `<AnimatedNumber value={n} format={(v) => v.toLocaleString()} />`
- Uses `useSpring` from framer-motion for physics-based counting (spring stiffness 50, damping 25)
- Triggers animation when element enters viewport via `useInView`
- Respects `MotionContext`
- Replaces the 3 duplicate `AnimatedNumber`/`useAnimatedCounter` implementations scattered across `UnifiedStatsBar.tsx`, `PlacementRevenueWidget.tsx`, and `hooks/useAnimatedCounter.ts`

**Integration**:
- `UnifiedStatsBar.tsx`: Delete inline `AnimatedNumber` function, import from `ui/animated-number`
- `KPISummaryWidget.tsx`: Use `<AnimatedNumber>` for all KPI values
- `PipelineSnapshot.tsx`: Use for pipeline stage counts
- `RevenueLadderHero.tsx`: Replace `AnimatedDigits` with `<AnimatedNumber format={v => '€' + v.toLocaleString()}>`

---

## Batch 2: Login + Loading Polish

### Feature 4: Cinematic Login Experience

**Edit**: `src/pages/Auth.tsx`
- Background: Add CSS `@property`-animated gradient mesh behind the auth card — subtle, slowly morphing radial gradients using CSS custom properties + `@keyframes`. Defined in `index.css`.
- Card entrance: Wrap the `<Card>` in `motion.div` with `initial={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}` → `animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}` with spring physics
- Input focus enhancement: Add a CSS class `.auth-input-glow` that applies an animated `box-shadow` ring on `:focus` (pulsing 2s infinite, subtle glow using `--ring` color)
- Submit button: Add a CSS gradient sweep animation on hover (gradient position animates left→right over 600ms)
- Success transition: After successful login (before `navigate('/home')`), animate the card: `scale: 0.95, opacity: 0, filter: 'blur(4px)'` over 300ms, then navigate

**Add to `src/index.css`**:
```css
@property --mesh-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
@keyframes mesh-rotate { to { --mesh-angle: 360deg; } }
.auth-mesh-bg { ... }
.auth-input-glow:focus { box-shadow animation }
.auth-btn-sweep { background-size: 200% 100%; animation on hover }
```

### Feature 5: Skeleton-to-Content Crossfade

**New file**: `src/components/ui/skeleton-crossfade.tsx`
- `<SkeletonCrossfade loading={isLoading} skeleton={<MySkeleton />}>{content}</SkeletonCrossfade>`
- When `loading` transitions from `true→false`: skeleton fades out (opacity 1→0, scale 1→0.98) while content fades in (opacity 0→1, scale 0.98→1), overlapping for 200ms
- Uses `AnimatePresence` with `mode="popLayout"` for simultaneous exit/enter
- Respects `MotionContext`

**Integration**: Apply to `UnifiedStatsBar` loading state, `PipelineSnapshot`, and `KPISummaryWidget`.

### Feature 6: Haptic Feedback Sweep

**No new files** — just add 1-line `haptics.impact('light')` calls to existing components:
- `MobileBottomNav.tsx`: `onClick` → add `impact('light')` before `navigate()`
- `NotificationBell.tsx`: on sheet open → `impact('light')`
- `GlobalSpotlightSearch.tsx`: on result selection → `impact('light')`
- `AnimatedSidebar.tsx`: on mobile nav item tap → `impact('light')`
- Form submit success handlers (Auth, profile save): `notification('success')`

Each component imports `useHaptics` and calls the appropriate method. Already works — just never wired up.

---

## Batch 3: Performance + Ambient Delight

### Feature 7: Smart Route Preloading

**New file**: `src/hooks/useRoutePrediction.ts`
- Tracks route visit frequency in `localStorage` (simple `{ path: count }` map)
- On home page mount: preloads top 3 most-visited route chunks via dynamic `import()` inside `requestIdleCallback`
- Exports `prefetchRoute(path)` for hover-triggered preloading

**Edit**: `src/components/AnimatedSidebar.tsx`
- On `onMouseEnter` / `onTouchStart` of each nav item: call `prefetchRoute(item.path)` which triggers `import()` for that route's lazy chunk
- This means by the time the user clicks, the JS is already downloaded — zero loading flash

**Route map**: A simple object mapping paths to their lazy import functions (extracted from the route files — `/jobs` → `() => import('@/pages/Jobs')`, etc.)

### Feature 8: Cursor Trail (Desktop Only)

**New file**: `src/components/ui/cursor-trail.tsx`
- A 6px circle that follows the cursor with spring physics (`useSpring` from framer-motion, stiffness 150, damping 15)
- `position: fixed`, `pointer-events: none`, `z-index: 9999`
- Color: `hsl(var(--foreground) / 0.15)` — barely visible, just adds fluidity
- Only renders on `pointer: fine` (desktop) via `matchMedia`
- Disabled when `motionEnabled === false` or `prefers-reduced-motion: reduce`
- Uses `requestAnimationFrame` for mouse tracking, `useSpring` for the trailing position

**Mount**: In `AppLayout.tsx`, render `<CursorTrail />` once.

### Feature 9: Ambient Micro-Sounds

**New file**: `src/hooks/useMicroSounds.ts`
- Uses Web Audio API (`AudioContext`) to generate sounds procedurally — no audio files
- Functions: `playClick()` (50ms sine 800Hz, gain 0.03), `playSuccess()` (two ascending tones 600→900Hz, 80ms each, gain 0.04), `playToggle()` (20ms square 1000Hz, gain 0.02)
- All sounds are extremely quiet — subliminal UI texture
- Gated by a `sound-effects-enabled` localStorage flag (default: `false` — opt-in)
- Lazy-creates `AudioContext` on first interaction (browser policy compliance)

**New file**: `src/components/ui/sound-toggle.tsx`
- A small toggle in the settings area (next to MotionToggle in header)
- Volume icon, toggles `sound-effects-enabled`

**Integration**: Add `playClick()` to `MobileBottomNav` taps, `playSuccess()` to form submissions, `playToggle()` to theme/motion toggles. Each is 1 line alongside the haptic calls.

---

## Files Summary

| Batch | File | Action |
|-------|------|--------|
| 1 | `src/hooks/useViewTransition.ts` | New |
| 1 | `src/components/ProtectedLayout.tsx` | Edit — conditional View Transitions |
| 1 | `src/index.css` | Edit — add `::view-transition-*`, mesh keyframes |
| 1 | `src/components/ui/scroll-reveal.tsx` | New |
| 1 | `src/components/clubhome/CandidateHome.tsx` | Edit — use ScrollReveal |
| 1 | `src/components/clubhome/AdminHome.tsx` | Edit — use ScrollReveal |
| 1 | `src/components/clubhome/PartnerHome.tsx` | Edit — use ScrollReveal |
| 1 | `src/components/ui/animated-number.tsx` | New |
| 1 | `src/components/clubhome/UnifiedStatsBar.tsx` | Edit — use AnimatedNumber |
| 2 | `src/pages/Auth.tsx` | Edit — cinematic entrance |
| 2 | `src/components/ui/skeleton-crossfade.tsx` | New |
| 2 | `src/components/MobileBottomNav.tsx` | Edit — add haptics |
| 2 | `src/components/NotificationBell.tsx` | Edit — add haptics |
| 2 | `src/components/AnimatedSidebar.tsx` | Edit — add haptics |
| 3 | `src/hooks/useRoutePrediction.ts` | New |
| 3 | `src/components/AnimatedSidebar.tsx` | Edit — hover preload |
| 3 | `src/components/ui/cursor-trail.tsx` | New |
| 3 | `src/hooks/useMicroSounds.ts` | New |
| 3 | `src/components/ui/sound-toggle.tsx` | New |
| 3 | `src/components/AppLayout.tsx` | Edit — mount CursorTrail + SoundToggle |

No database changes. No new dependencies.

