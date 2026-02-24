

# Reduce Email Padding to Match New GIF's Built-in Whitespace

## What Changes

The new GIF already includes its own whitespace/breathing room, so the extra padding around and below it creates unnecessary gaps. Two padding values in `base-template.ts` will be reduced.

## Technical Details

### Modified file: `supabase/functions/_shared/email-templates/base-template.ts`

1. **Replace the uploaded GIF**: Copy the new file to `public/email-header.gif` (the URL in `email-config.ts` already points here, no config change needed).

2. **Line 183** -- Outer wrapper padding: reduce from `40px 20px` to `20px 16px`. This brings the entire email card closer to the top of the viewport.

3. **Line 215** -- Content area padding: reduce from `40px` to `24px 32px`. The top padding shrinks from 40px to 24px since the GIF already provides visual spacing. Side padding goes from 40px to 32px to keep text comfortable but not overly indented.

These two changes, combined with the smaller/tighter GIF, will make the email content visible much sooner when opened.

### No changes to:
- `email-config.ts` (URL unchanged)
- `components.ts` (no padding logic there)
- Any edge functions (they all consume `baseEmailTemplate`)

Two lines changed in one file, plus one asset replaced.

