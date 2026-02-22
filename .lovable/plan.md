

# Loading Screen Audit and Consolidation

## Complete Inventory of Loading Screens

Here are ALL distinct loading screen implementations currently in the project:

### 1. index.html Boot Loader (pre-React)
- **Where:** `index.html` lines 179-221
- **Look:** Dark background (`hsl(0 0% 5%)`), quantum logo (200x200), gold SVG spinner, "Loading Quantum OS..." text, plus a full error recovery UI if boot fails
- **When shown:** Before React even loads -- the very first thing users see

### 2. main.tsx Emergency Fallback
- **Where:** `src/main.tsx` lines 55-85
- **Look:** Dark background (`#0E0E10`), gold heading "Application Failed to Start", red error message, error stack trace, "Reset Cache" and "Try Safe Mode" buttons
- **When shown:** If React fails to initialize (critical crash). Replaces entire `<body>`

### 3. `PageLoader` component
- **Where:** `src/components/PageLoader.tsx`
- **Look:** Two states: (a) normal = delegates to `UnifiedLoader variant="page"` with spinning rings and logo; (b) after 15s timeout = card with red alert icon, "Unable to Load Application", reset cache buttons
- **When shown:** Suspense fallback for ALL lazy-loaded routes in `App.tsx` (~15 uses), `ProtectedLayout.tsx`, `ProtectedRoute.tsx`

### 4. `UnifiedLoader` (the main React loader)
- **Where:** `src/components/ui/unified-loader.tsx`
- **Look:** 4 variants:
  - `page`: Full-screen black background, centered quantum logo (80x80) with white spinning ring + reverse inner ring + drop shadow glow, optional "Loading Quantum OS..." text
  - `overlay`: Same as page but with backdrop blur over existing content
  - `section`: Gray `Loader2` spinner icon with tiny grayscale logo overlay, for in-page sections
  - `inline`: Tiny `Loader2` icon + text, for buttons/small elements
- **When shown:** Used in 18+ files across the app (ClubHome, Auth, JobDetail, PartnerWelcome, OAuthOnboarding, InviteAcceptance, etc.)

### 5. `LoadingSkeletons` collection
- **Where:** `src/components/LoadingSkeletons.tsx`
- **Look:** Gray shimmer rectangles (Skeleton components) shaped like the content they replace -- cards, tables, profiles, messages, calendars, settings, comments, activity feeds
- **When shown:** In-place content placeholders while data loads (270+ files use `Skeleton`)

### 6. Swipe Game `LoadingScreen`
- **Where:** `src/components/swipe-game/LoadingScreen.tsx`
- **Look:** Full-screen gradient, card with brain emoji, "Analyzing Your Personality..." heading, rotating fun facts, progress bar with percentage
- **When shown:** After completing the swipe game assessment, before showing results

### 7. `ProtectedProvidersLoader`
- **Where:** `src/contexts/ProtectedProviders.tsx` line 71
- **Look:** `UnifiedLoader variant="page" text="Initializing..."`
- **When shown:** While protected providers lazy-load

---

## What to Keep vs. Replace

### KEEP (no changes needed):
- **LoadingSkeletons** -- These are content-shaped placeholders (gray rectangles), not loading screens. They are a UX best practice and completely different from full-screen loaders
- **Swipe Game LoadingScreen** -- This is a feature-specific progress screen for the assessment game, not a generic loader. It shows actual progress with fun facts. Replacing it would break the game flow
- **`inline` variant of UnifiedLoader** -- Tiny spinner inside buttons/form elements. Not a "screen"

### REPLACE with sleek black + glowing logo:
1. **index.html Boot Loader** -- Replace the gold spinner and "Loading Quantum OS..." text with a subtle logo glow pulse
2. **main.tsx Emergency Fallback** -- Keep the error info but match the black + logo aesthetic
3. **PageLoader normal state** -- Already delegates to UnifiedLoader, will be fixed by fixing UnifiedLoader
4. **UnifiedLoader `page` variant** -- The core change: remove the spinning rings, just show the logo with a subtle glow pulse animation on pure black
5. **UnifiedLoader `overlay` variant** -- Same treatment but with backdrop blur
6. **UnifiedLoader `section` variant** -- Replace Loader2 spinner with a smaller, subtle logo pulse
7. **ProtectedProvidersLoader** -- Already uses UnifiedLoader, fixed automatically

## The Design: Sleek Black + Glowing Logo

The target aesthetic is:
- Pure black background (`#0E0E10`)
- Quantum Club logo centered
- Subtle white/gold glow that pulses in and out (opacity 0.4 to 1.0, smooth ease)
- No spinners, no text, no progress bars -- just the logo breathing
- For smaller section loaders: same logo, smaller, same glow

## Implementation

### File 1: `src/components/ui/unified-loader.tsx`
- Remove the spinning ring divs from `renderPageOrOverlay()`
- Replace with logo + CSS glow pulse animation (using framer-motion `animate={{ opacity }}`)
- Remove "Loading Quantum OS..." default text -- no text at all by default
- Keep the `text` prop functional so callers CAN pass text if needed (e.g., "Verifying reset link...")
- Update `section` variant: replace `Loader2` with smaller glowing logo
- Keep `inline` variant as-is (tiny spinner for buttons is correct UX)

### File 2: `index.html` (lines 179-184)
- Remove the SVG spinner element
- Remove the "Loading Quantum OS..." text paragraph
- Add a CSS `@keyframes glow-pulse` animation to the existing logo image
- Keep the boot-error recovery UI unchanged (it serves a real purpose)

### File 3: `src/main.tsx` (emergency fallback, lines 55-85)
- Update the inline HTML styling to use `#0E0E10` background consistently
- Add the quantum logo SVG to the error screen header (replace the gold text heading)
- Keep all error details and recovery buttons (they are essential)

### File 4: `src/components/PageLoader.tsx`
- The normal state already delegates to `UnifiedLoader`, so it gets fixed automatically
- The 15s error state: update background to match black aesthetic, keep the functional recovery buttons
- Remove the "Loading Quantum OS..." branding text since UnifiedLoader no longer shows it

### What does NOT change:
- No changes to `LoadingSkeletons.tsx` (content placeholders are not loading screens)
- No changes to `swipe-game/LoadingScreen.tsx` (game-specific progress UI)
- No changes to any of the 18+ files that call `UnifiedLoader` -- they just get the new look automatically
- All functional behavior (timeouts, error recovery, cache reset) stays intact

