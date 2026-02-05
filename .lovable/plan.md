
Goal: fix the sidebar logo behavior so (1) correct logo shows in each state, (2) the small QC icon fully disappears on expand, (3) the “Q” stays the same size between collapsed/expanded, and (4) the “Q” stays in the exact same position when opening.

What I found (root causes)
1) Logos are currently passed into the Sidebar with the props inverted
- In `src/components/AnimatedSidebar.tsx` the desktop logo area is explicitly:
  - Expanded (open=true) uses `logoLight` / `logoDark` (full wordmark)
  - Collapsed (open=false) uses `logoLightShort` / `logoDarkShort` (QC icon)
- But `src/components/AppLayout.tsx` currently passes:
  - `logoLight={quantumClubLogoLightShort}` and `logoLightShort={quantumClubLogoLight}`
  - This makes the full logo show in the collapsed state and the QC icon show in expanded state.

2) The “small logo doesn’t go away” effect is largely positioning, not just opacity
- The logo wrappers inside the desktop sidebar are `position: absolute` but not anchored (no `left/top/inset`), so they default to the top-left of the container.
- Because the container uses `justify-center`, but the absolutely-positioned elements don’t stretch full width, “centering” doesn’t actually happen.
- Result: during expansion you can visually perceive both marks (QC + wordmark) at different perceived positions, especially if one asset has transparent padding/whitespace.

3) “Keep Q in the exact same place” requires a left-anchored layout + left-origin scaling
- If we want the Q’s left edge to never move, both logo layers must share the same anchor point:
  - Same `left` offset
  - Same vertical centering
  - Scale animations must use `transform-origin: left center`

Plan (comprehensive fix)
Phase A — Correct the mapping (fix wrong logo in wrong state)
1) Revert the prop mapping in `src/components/AppLayout.tsx` so the Sidebar receives:
   - `logoLight={quantumClubLogoLight}` (full)
   - `logoDark={quantumClubLogoDark}` (full)
   - `logoLightShort={quantumClubLogoLightShort}` (QC)
   - `logoDarkShort={quantumClubLogoDarkShort}` (QC)
This alone restores correct assets per state.

Phase B — Make the transition “morph” correctly and eliminate the lingering QC mark
2) Update the DesktopSidebar logo block in `src/components/AnimatedSidebar.tsx` to use a deterministic anchor:
   - Create a single “logo stage” container: `relative` + fixed height
   - Render two absolutely-layered motion wrappers (wordmark + QC) with identical positioning:
     - `absolute left-4 top-1/2 -translate-y-1/2`
     - `pointer-events-none` so hidden layers never interfere
   - Make both wrappers stretch logically for layout stability if needed (optional): `right-4` but keep content aligned left.

3) Lock the “Q” position and size across states
   - Set both images to the same base height for the Q:
     - Use the same `h-*` on both QC and wordmark layers (e.g. `h-12`), then control perceived emphasis via scale/opacity rather than different intrinsic heights.
   - Use Framer Motion:
     - Wordmark: `transformOrigin: 'left center'`, `opacity: open ? 1 : 0`, `scale: open ? 1 : 0.98`
     - QC: `transformOrigin: 'left center'`, `opacity: open ? 0 : 1`, `scale: open ? 1.02 : 1`
   - Keep duration and easing identical to the sidebar width animation (0.3s) to avoid timing drift.

4) Ensure only one mark is visible at the end states
   - Add `aria-hidden` to the hidden layer (or conditional `display` once animation completes) if needed:
     - Typically opacity=0 is enough, but if asset alpha causes perceived “ghosting”, we can set:
       - QC wrapper `style={{ visibility: open ? 'hidden' : 'visible' }}` with a tiny delay, or use `onAnimationComplete`.
   - Start with opacity-only (cleanest), and only add visibility toggles if ghosting persists.

Phase C — Quick verification checklist (what we’ll test in preview)
5) Desktop (md+)
   - Collapsed: QC visible, wordmark fully hidden
   - Expanded: wordmark visible, QC fully hidden
   - Rapid hover in/out: no lingering layers, no flicker
   - “Q” does not shift horizontally between states

6) Mobile
   - Confirm mobile header logo remains unchanged (currently uses the QC short mark) and no regressions in the mobile slide-in sidebar.

Files that will change
- `src/components/AppLayout.tsx`
  - Fix the incorrect prop wiring for `logoLight/logoDark` vs `logoLightShort/logoDarkShort`
- `src/components/AnimatedSidebar.tsx`
  - Refactor the DesktopSidebar logo container to be left-anchored and use left-origin scaling so the Q stays fixed and the QC layer truly disappears

Risks / edge cases
- If the wordmark PNG includes extra transparent padding on the left, the “Q position” can still appear off. If that happens after Phase B, we’ll apply one of:
  - Slight `translateX` correction on the wordmark layer only, or
  - Replace the asset with a tightly-cropped version (best long-term), stored in `src/assets/` and swapped in imports.

Definition of done
- Correct logos per state (QC when collapsed, wordmark when expanded)
- QC layer does not remain visible when expanded
- “Q” stays the same size across states
- “Q” stays in the same position while opening/closing
