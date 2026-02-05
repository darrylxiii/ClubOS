
## Goal (what will change)
Fix three things in the sidebar logo behavior:

1) **Correct logo mapping** so:
- **Collapsed** sidebar shows the **QC icon**
- **Expanded** sidebar shows the **full wordmark**

2) **Make the expanded wordmark bigger** (so the “Q” in the wordmark is not visually smaller than the collapsed QC icon).

3) **Ensure the collapsed QC icon is never visible once expanded**:
- It should fade out quickly during expansion, then become **non-rendered / non-visible** (no lingering, no overlap).

---

## What I found in the codebase (root causes)

### A) The logos are currently passed in swapped (this is why states look inverted)
In `src/components/AppLayout.tsx`, the `Sidebar` props are currently mapped like this:

- `logoLight={quantumClubLogoLightShort}`
- `logoDark={quantumClubLogoDarkShort}`
- `logoLightShort={quantumClubLogoLight}`
- `logoDarkShort={quantumClubLogoDark}`

But `src/components/AnimatedSidebar.tsx` *expects*:
- `logoLight/logoDark` = **full wordmark**
- `logoLightShort/logoDarkShort` = **QC icon**

So even if the animation logic is correct, the wrong assets get shown in each state.

### B) The current morph keeps both logos “present” (opacity-only), which can still look like the icon is visible
In `src/components/AnimatedSidebar.tsx`, both logos are `position: absolute` and animate opacity. Even at opacity ~0, due to timing and perception (and sometimes subpixel rendering), users can still perceive a “ghost” icon during/after expand.

To fully meet “collapsed logo should disappear once expanded logo is fully shown”, we need more than opacity:
- add **visibility/display gating** at the end of the animation so the hidden one is not paintable.

### C) Expanded logo size is smaller than desired
Currently the expanded logo images are `h-14` (56px). The collapsed icon is `h-12` (48px), but because the wordmark contains more content, the “Q” can appear smaller than the standalone QC mark.
We’ll increase the expanded wordmark size (and container height) so the Q reads larger.

---

## Implementation approach (what I will do)

### Step 1 — Fix the logo prop mapping (critical)
**File:** `src/components/AppLayout.tsx`

Update the `Sidebar` props so they match the expectation in `AnimatedSidebar.tsx`:

- `logoLight` / `logoDark` should receive the **full wordmark**
- `logoLightShort` / `logoDarkShort` should receive the **QC icon**

This alone fixes the “full logo in collapsed / small logo in expanded” inversion.

---

### Step 2 — Make the expanded wordmark bigger
**File:** `src/components/AnimatedSidebar.tsx`

Adjust:
- the logo container height (currently `h-20`)
- the expanded logo image height (currently `h-14`)

Proposed sizing target:
- Expanded wordmark: bump from `h-14` → **`h-18` or `h-20`** (we’ll pick the best visually in preview; likely `h-18` to avoid vertical crowding under the header)
- Container: keep enough room (e.g. `h-24` if we go `h-20`, or keep `h-20` if we go `h-18` and it still fits)

We’ll keep spacing discreet and luxury-clean (no cramped header).

---

### Step 3 — Ensure the collapsed QC icon is truly gone when expanded
**File:** `src/components/AnimatedSidebar.tsx`

We’ll keep the overlapping morph but add a **hard hide** after animation completes:

- For the QC icon container:
  - When `open === true`, animate `opacity` to 0 quickly (e.g. 150–200ms)
  - Then apply `transitionEnd: { visibility: 'hidden' }` (or `display: 'none'` if reliable in this component) so it no longer paints at all after the fade.
- For the full wordmark container:
  - When `open === false`, similarly hide it after fade-out.

Additionally:
- Add `aria-hidden` and `pointerEvents: 'none'` when hidden to prevent focus/hover artifacts.
- Keep durations aligned with sidebar width expansion (300ms), but allow the QC icon to exit earlier (so it doesn’t “hang around”).

**Behavior target (expanding):**
- 0–180ms: QC icon fades out
- 80–300ms: full wordmark fades in and scales to 1
- At ~180ms: QC icon becomes `visibility:hidden` (no lingering)
- At 300ms: expanded wordmark is fully visible, QC icon is not paintable

---

## Exact files to change
1) `src/components/AppLayout.tsx`
- Fix `Sidebar` prop mapping (full vs short assets)

2) `src/components/AnimatedSidebar.tsx`
- Increase expanded logo size
- Add visibility/display gating using Framer Motion `transitionEnd`
- Refine timing so the QC icon fully disappears before the wordmark is fully shown

---

## Acceptance criteria (how you’ll confirm it’s fixed)
1) **Collapsed state (80px)**
- Only QC icon visible
- Wordmark not visible at all

2) **Expanded state (300px)**
- Only full wordmark visible
- QC icon not visible at all (no ghosting)

3) **Transition**
- QC icon does not linger into the expanded state
- Expanded wordmark is visibly larger than before; the “Q” no longer reads smaller than the collapsed QC mark

4) **Dark/light themes**
- Correct assets appear in both themes

---

## Edge cases / risks (and how we avoid them)
- **Layout clipping:** Increasing logo height could clip inside the container. We’ll increase container height in tandem and keep `overflow-hidden` intentional.
- **Perceived ghosting:** Solved by using `visibility:hidden` (or `display:none`) after fade-out via `transitionEnd`, not just opacity.
- **Mobile header logo:** This change targets the desktop sidebar; the mobile header logo in `AppLayout.tsx` remains separate and will not be affected.

---

## De-scope (to keep this tight)
No new animation library, no redesign of the sidebar structure. This is strictly a logo mapping + animation hardening + sizing adjustment.

