# Admin Candidate UI/UX Findings (saved for later)

## Visual Hierarchy & Layout
- Large dark “dead‑space” behind the avatar – add subtle gradient or background illustration.
- Progress badge (“0 % Complete”) is detached – wrap badge, email, and a small “Complete profile” button inside a compact flex container with a light card background.
- Action buttons are all the same size – use primary/secondary styling, make “Edit Profile” primary, add icons.
- Tab bar low contrast – increase active‑tab border thickness, use brand accent color, add hover background highlight.

## Information Density & Scannability
- Header layout lopsided – center name block or push actions to far right for balance.
- Email plain text – turn into a `mailto:` link with underline and envelope icon.
- No visual separation before “Career Preferences” – add thin divider and larger heading.

## Accessibility (WCAG AA)
- Low contrast for secondary text – raise contrast to ≥ 4.5:1.
- Focus outlines hidden – ensure visible focus ring on buttons/links.
- Icon‑only buttons lack ARIA labels – add `aria-label="Back to list"`, `aria-label="Edit profile"`.

## Micro‑Interactions & Feedback
- Buttons only change color – add scale‑up (1.02) and shadow transition.
- Tab switches instant – apply fade‑in or slide‑right animation.
- No loading skeletons – insert skeleton loaders for async data sections.

## Performance‑Related UI
- Glass‑morphic background blur 24px is GPU‑heavy – reduce to 12px.
- Progress badge uses full‑width flex – switch to `inline‑flex`.

## “Top 0.1 %” Checklist (quick wins)
- ✅ Consistent dark‑mode palette
- ✅ Glass‑morphic cards
- ✅ Responsive layout
- ✅ Accessible focus outlines
- ✅ Micro‑animations on hover/click
- ❌ High‑contrast secondary text
- ❌ Primary/secondary button hierarchy
- ❌ Skeleton loaders for async sections
- ❌ ARIA labels on icon‑only controls
- ❌ Progress badge visually grouped with CTA

## Next Steps
1. Apply visual tweaks (gradient background, badge grouping, button hierarchy) – CSS changes in the component rendering the header.
2. Update accessibility attributes – add `aria-label`s and focus rings in JSX.
3. Add skeleton loaders for data‑fetching sections.
4. Adjust contrast in Tailwind config or CSS variables.
5. Fine‑tune blur intensity in global CSS.

---
*Full HTML source captured by the browser sub‑agent is available in the earlier report for deeper inspection.*
