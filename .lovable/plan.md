

# Redesign: Integrated Urgency Meter into Card Design

## Problem
The UrgencyMeter currently looks "bolted on" — it sits as a separate badge in the badge row (`ml-auto`) and in `JobCardHeader`, disconnected from the card's visual hierarchy. It needs to feel like a native part of the card's DNA.

## Design Concept

### CompactJobCard — Urgency as a visual spine
Instead of a small badge tucked into the badge row, the urgency score becomes an **ambient visual element** integrated into the card itself:

1. **Left edge accent bar**: A thin vertical gradient bar (3px) on the left edge of the card, colored by urgency level (emerald → amber → red). This gives every card an instant visual urgency signal without reading any text.

2. **Score integrated into the header area**: Move the urgency score next to the company logo as a small circular indicator (like a notification dot but with the number inside), replacing the disconnected badge. The circle uses the urgency color as background with the score number in white/dark.

3. **Remove from badge row**: No longer a separate element floating with `ml-auto` — it's part of the card's identity.

4. **Admin popover unchanged**: Clicking the integrated circle still opens the same admin override popover.

### JobCardHeader — Score as part of the title line
Instead of being another badge in the flex-wrap row:

1. **Inline score pill**: Place a small colored circle with the score directly after the job title (before the external link icon), making it feel like a priority indicator that's part of the title.

2. **Left accent bar**: Same vertical bar treatment on the parent card for consistency.

### Visual Language
```text
┌─────────────────────────────────────┐
│▌  [Logo] [●7] Senior Developer     │  ← 3px colored left bar + score circle next to logo
│▌         Company Name               │
│▌         📍 Amsterdam               │
│▌                                    │
│▌  [Published] [Synced] [Action]     │  ← badges without urgency (it's above now)
│▌                                    │
│▌  Candidates  Days Open  Active     │
│▌  12 ~~~~     45d        3          │
│▌  ...                               │
└─────────────────────────────────────┘
```

## Changes

### 1. `UrgencyMeter.tsx` — New compact variant
- Add a `variant` prop: `'badge'` (current) | `'dot'` (new integrated style)
- `'dot'` variant: renders as a small circle (24x24) with the score number, colored background, no arc gauge. Clean, minimal.
- Keep the popover/tooltip behavior identical

### 2. `CompactJobCard.tsx` — Structural integration
- Add a left-edge urgency accent bar using a `div` with `absolute left-0 top-0 bottom-0 w-[3px]` colored by urgency
- Move UrgencyMeter from badge row to next to the Avatar, using `variant="dot"`
- Remove the `ml-auto` wrapper div from badge row

### 3. `JobCardHeader.tsx` — Title-line integration  
- Move UrgencyMeter from the badge flex-wrap row to inline after the CardTitle, using `variant="dot"`
- Add the same left-accent bar treatment (or pass urgency color as a prop to parent card)

### 4. Color utility
- Add a `getUrgencyAccentColor` helper in `jobUrgencyScore.ts` returning raw hex/hsl for the gradient bar (since Tailwind classes won't work for inline style gradients)

## Files Changed

| File | Change |
|------|--------|
| `src/components/jobs/UrgencyMeter.tsx` | Add `variant="dot"` — compact circular score indicator |
| `src/components/partner/jobs/CompactJobCard.tsx` | Left accent bar + move meter next to avatar |
| `src/components/partner/job-card/JobCardHeader.tsx` | Move meter inline with title |
| `src/lib/jobUrgencyScore.ts` | Add `getUrgencyAccentColor()` for inline style colors |

