

# Home Page UI/UX Overhaul: From 40/100 to 90+ 

## Current Problems

1. **Opaque card stacking**: Every widget (NextBestAction, QuickStats x3, ApplicationPipeline, QuickActions, FeaturedJobs x3) uses default `Card` with solid `bg-card` backgrounds. This creates 8-10 opaque rectangles stacked vertically, killing the glass/depth effect from `DynamicBackground`.
2. **Redundant data display**: `QuickStats` shows "Active Applications" and "Profile Strength" -- both are already shown in `CandidateQuickActions` and `NextBestActionCard`. Triple rendering of the same concepts.
3. **Wasteful grid layout**: The 2-column grid (ApplicationPipeline + QuickActions) uses bordered Cards inside a bordered section, creating nested box-in-box layers.
4. **No breathing room**: Every section has thick borders, shadows, and card headers with uppercase bold text + left accent bars -- it all competes for attention simultaneously.
5. **Feed comparison**: `/feed` works because it has one narrow column (`max-w-3xl mx-auto`), minimal card chrome, and content floats over the background video. Home has edge-to-edge opaque blocks that mask the background entirely.

## Design Philosophy (Apple-like)

- **Content floats on glass, not inside boxes.** Remove card borders and opaque backgrounds. Use `glass-subtle` or transparent containers.
- **One primary CTA per viewport.** The QUIN NextBestAction is the hero -- everything else is secondary.
- **Reduce to essentials.** Remove QuickStats entirely (redundant). Merge its data into the existing widgets.
- **Generous whitespace.** Use `max-w-5xl mx-auto` to center content like Feed does, instead of edge-to-edge sprawl.

## Changes

### 1. Home.tsx -- Restructure layout

- Replace edge-to-edge `w-full px-4 sm:px-6 lg:px-8` with centered `max-w-5xl mx-auto px-4 sm:px-6 py-8`
- Remove `QuickStats` import and render entirely (it duplicates data)
- Remove the loading skeleton's `container mx-auto` pattern to match
- Simplify the 2-column grid to a single clean flow

### 2. NextBestActionCard.tsx -- Make it the glass hero

- Replace `Card` + `glass-strong border-2` with a simpler `glass-subtle` wrapper
- Remove the thick `border-2` and priority-colored backgrounds (`bg-orange-500/5`, etc.)
- Use a clean borderless glass surface so it blends into the background
- Keep the framer-motion entrance animation

### 3. ApplicationStatusTracker.tsx -- Remove card chrome

- Replace `Card className="border-border/50 shadow-sm hover:shadow-md"` with `glass-subtle` class
- Remove the heavy `CardHeader` with uppercase bold title + accent bar
- Use a simpler section heading (lighter weight, no accent bar)
- Individual application items: remove inner border/bg layers, use only subtle `glass-subtle` or transparent hover states

### 4. CandidateQuickActions.tsx -- Borderless glass grid

- Replace outer `Card` with a plain `div` or `glass-subtle` container
- Remove `CardHeader` with accent bar; use a simple text label
- Action buttons: use `glass-subtle` backgrounds instead of default Button variants with borders

### 5. FeaturedJobs.tsx -- Lighter presentation

- Remove the heavy "Featured Opportunities" heading bar
- Use a minimal section label
- JobCard: Apply `glass-subtle` instead of default `Card` with `hover:shadow-lg`

### 6. QuickStats.tsx -- No changes needed (will be removed from Home)

The component stays for other pages that may use it, but it will no longer be imported on `/home`.

## Visual Result

```text
Before (current):                    After (target):
+--[full width]--+                   +---[max-w-5xl]---+
|[OPAQUE CARD]   |                   |                  |
| Welcome Header |                   | Welcome, John    |
|[OPAQUE CARD]   |                   |                  |
| QUIN Action    |                   | ~glass~ QUIN     |
|[OPAQUE CARD x3]|                   |                  |
| Stats Stats Sta|                   | ~glass~ Pipeline |
|[OPAQUE][OPAQUE]|                   |  item            |
| Pipeline|Quick |                   |  item            |
|[OPAQUE x3]     |                   |                  |
| Job Job Job    |                   | ~glass~ Actions  |
+---------+------+                   |  btn  btn        |
  8-10 opaque layers                 |                  |
  zero glass feeling                 | ~glass~ Jobs     |
                                     +------------------+
                                       5-6 glass layers
                                       background visible
```

## Technical Details

| File | Change | Lines affected |
|------|--------|----------------|
| `src/pages/Home.tsx` | Remove QuickStats, center layout | ~10 lines |
| `src/components/clubhome/NextBestActionCard.tsx` | glass-subtle, remove border-2 | ~5 lines |
| `src/components/candidate/ApplicationStatusTracker.tsx` | glass-subtle, simplify header | ~15 lines |
| `src/components/candidate/CandidateQuickActions.tsx` | glass-subtle, remove card chrome | ~10 lines |
| `src/components/jobs/FeaturedJobs.tsx` | lighter heading | ~3 lines |
| `src/components/jobs/JobCard.tsx` | glass-subtle card style | ~3 lines |

Total: ~46 lines modified across 6 files. Zero new dependencies. Zero breaking changes.

