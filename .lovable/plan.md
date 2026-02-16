

# Temporarily Lock Google and Apple Sign-In Buttons

## What This Does

Replaces the Google and Apple OAuth buttons on the login/signup page with disabled "updating" state buttons that clearly communicate these sign-in methods are temporarily unavailable, while keeping email/password login fully functional.

## Changes

### Modified file: `src/pages/Auth.tsx`

Replace the two OAuth buttons (lines 672-689) with disabled versions that show a maintenance message:

- Google button: disabled, muted styling, shows "Google -- updating" with a small refresh/wrench icon
- Apple button: disabled, muted styling, shows "Apple -- updating" with a small refresh/wrench icon
- Add a subtle note below: "Social sign-in temporarily unavailable. Use email to log in."
- Remove the `onClick` handlers from both buttons (or just add `disabled` prop)
- Use `opacity-50 cursor-not-allowed` styling to signal the locked state clearly

No other files need to change. The handler functions can stay in the code -- they just won't be reachable while the buttons are disabled. This makes re-enabling them later a one-line change (remove `disabled`).

## Technical Details

The buttons get:
- `disabled` prop added
- Extra Tailwind classes: `opacity-50 cursor-not-allowed`
- Label text changed to include " -- updating"
- A small `RefreshCw` or `Wrench` icon from lucide-react added
- A `p` tag below the buttons with muted helper text

One file modified, zero new files, easy to revert.

