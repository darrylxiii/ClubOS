

# Fix ResumeFunnelDialog Issues and Audit Reminder System

## Problems Identified

1. **White-on-white "Start Fresh" button**: The `AlertDialogCancel` uses the `outline` variant (`bg-card/20 border-border/30 text-foreground`), which on the dark glass dialog background (`bg-card/80 backdrop-blur`) creates near-invisible contrast. The "Continue Where I Left Off" button uses `bg-primary` which is fine, but "Start Fresh" blends into the dialog.

2. **Dialog appears mid-flow**: The `ResumeFunnelDialog` triggers on component mount from localStorage (line 154-156 of FunnelSteps.tsx). If a user starts typing their email, triggers autosave (line 176), then refreshes the page, the dialog immediately interrupts them before they can even see the form. It should only show if the user had meaningful progress (step > 0 or multiple fields filled).

3. **Emoji in heading**: "👋 Welcome Back!" in `ResumeFunnelDialog.tsx` line 39 violates brand guidelines (no emojis in headings/toasts).

4. **Reminder emails**: Already fully implemented -- `send-funnel-reminder` (with second-touch differentiation) and `process-funnel-reminders` (hourly cron via pg_cron) are deployed and active. No changes needed here.

---

## Implementation Plan

### Task 1: Fix ResumeFunnelDialog button contrast
- File: `src/components/partner-funnel/ResumeFunnelDialog.tsx`
- Change `AlertDialogCancel` to include explicit styling: `className="sm:flex-1 border-border/60 bg-card/40 hover:bg-card/60 text-foreground"` so it is clearly visible against the dark glass dialog
- Change `AlertDialogAction` to use explicit primary styling that ensures contrast: `className="sm:flex-1 bg-primary text-primary-foreground hover:bg-primary/90"`

### Task 2: Only show resume dialog for meaningful progress
- File: `src/components/partner-funnel/FunnelSteps.tsx` (lines 154-157)
- Change the condition from `if (savedData && !savedData.completed)` to require meaningful progress: `if (savedData && !savedData.completed && (savedData.currentStep > 0 || (savedData.formData.contact_name && savedData.formData.contact_email)))`
- This prevents the dialog from appearing when the user only entered an email (Phase A only) -- they can just continue naturally
- If the user was on step 1 or 2, or had filled both name and email, the dialog is valuable

### Task 3: Remove emoji from dialog title
- File: `src/components/partner-funnel/ResumeFunnelDialog.tsx` line 39
- Change `👋 Welcome Back!` to `Welcome back` (lowercase "b", no emoji, no exclamation point per brand guidelines)

### Task 4: Add a brief delay before showing dialog
- File: `src/components/partner-funnel/FunnelSteps.tsx`
- Wrap the `setResumeDialogOpen(true)` in a `setTimeout` of ~500ms so the form renders first and the dialog appears as an overlay on top of visible content, rather than flashing before the user sees anything

---

## Files Changed
- `src/components/partner-funnel/ResumeFunnelDialog.tsx` (button styles, emoji removal)
- `src/components/partner-funnel/FunnelSteps.tsx` (resume dialog trigger conditions and timing)

## Reminder System Status
Already complete and operational:
- `supabase/functions/send-funnel-reminder/index.ts` -- sends branded emails with first/second touch differentiation
- `supabase/functions/process-funnel-reminders/index.ts` -- queries incomplete partials, sends reminders at 2h and 24h
- `pg_cron` job runs hourly to trigger the process function
- GDPR cleanup deletes incomplete partials after 7 days

