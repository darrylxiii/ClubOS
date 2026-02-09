

# Lock Apple and LinkedIn Login Buttons with "Coming Soon"

## What Changes

The Apple and LinkedIn sign-in buttons on the Auth page (`src/pages/Auth.tsx`, lines 695-717) will be visually locked with a professional, luxury-styled treatment:

- Buttons become non-clickable (disabled state)
- Reduced opacity with a subtle locked appearance
- A small "Coming Soon" badge overlaid on each button
- A lock icon replaces or supplements the existing icon
- No toast or error if clicked -- simply inert

## Design Approach

Each button gets wrapped in a `relative` container. The button itself receives `opacity-50 cursor-not-allowed pointer-events-none` styling. A small badge positioned at the top-right corner reads "Coming Soon" with a lock icon, styled with `bg-muted text-muted-foreground text-[10px] font-semibold uppercase tracking-wider` and a subtle border -- consistent with the refined luxury aesthetic.

## Technical Details (1 file)

### `src/pages/Auth.tsx`

**Lines 695-717** -- Replace the two active buttons with locked versions:

```tsx
{/* Apple - Coming Soon */}
<div className="relative">
  <Button
    type="button"
    variant="outline"
    disabled
    className="w-full h-14 rounded-2xl font-semibold opacity-40 cursor-not-allowed"
  >
    <svg ...>{/* Apple icon */}</svg>
    {t('signInWith', { provider: t('oauth.apple') })}
  </Button>
  <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
    <Lock className="h-2.5 w-2.5" />
    Coming Soon
  </div>
</div>

{/* LinkedIn - Coming Soon */}
<div className="relative">
  <Button
    type="button"
    variant="outline"
    disabled
    className="w-full h-14 rounded-2xl font-semibold opacity-40 cursor-not-allowed"
  >
    <svg ...>{/* LinkedIn icon */}</svg>
    {t('signInWith', { provider: t('oauth.linkedin') })}
  </Button>
  <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
    <Lock className="h-2.5 w-2.5" />
    Coming Soon
  </div>
</div>
```

- Add `Lock` to the existing lucide-react import
- Remove `onClick={handleAppleAuth}` and `onClick={handleLinkedInAuth}` from the buttons
- The `handleAppleAuth` and `handleLinkedInAuth` functions remain in code (no deletion) so they are ready to re-enable later

