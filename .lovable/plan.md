

# Fix: Widen the Auth Card

## Problem
The `motion.div` wrapper around the card has no width constraint, so the card only grows to fit its content. `max-w-2xl` acts as a ceiling but the content is narrower.

## Fix
Add `w-full max-w-2xl` to the `motion.div` wrapper so it stretches to 672px, and the card inside fills it with `w-full`.

### File: `src/pages/Auth.tsx`
- Line 579: Change `className="relative z-10"` to `className="relative z-10 w-full max-w-2xl"`
- Line 584: Keep `w-full` on Card but remove `max-w-2xl` from it (it's now on the parent)

