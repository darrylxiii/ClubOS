

# Unify Partner Funnel UI/UX + Fix Strategy Call Link

## Overview

Apply the ExitIntentPopup's glass aesthetic (icon headers, benefit cards, clean buttons) to the ResumeFunnelDialog and PartnershipSubmitted page. Change the strategy call button to link to `/book/darryl`.

---

## Task 1: ResumeFunnelDialog -- Match ExitIntentPopup Style

**File:** `src/components/partner-funnel/ResumeFunnelDialog.tsx`

- Add `glass max-w-md` class to `AlertDialogContent`
- Add Clock icon next to title, use `text-xl flex items-center gap-2`
- Restructure info card into icon + text rows inside `bg-muted/50 rounded-lg p-4 space-y-2`
- Match footer buttons: both `flex-1`, cancel with subtle styling, action with primary

---

## Task 2: PartnershipSubmitted -- Glass Styling + /book/darryl

**File:** `src/pages/PartnershipSubmitted.tsx`

- Add `glass` class to the main Card
- Scale CheckCircle icon from `w-20 h-20` down to `w-12 h-12`
- Add a next-steps benefit list using `bg-muted/50 rounded-lg p-4 space-y-2` with icon + text rows
- **Change "Book a Strategy Call" href** from `https://cal.com/thequantumclub/strategy-call` to `/book/darryl`
- Change from `<a>` with `target="_blank"` to a regular link (internal route, no new tab)

---

## Task 3: PartnerRequestTracker -- Glass Class Alignment

**File:** `src/components/partner-funnel/PartnerRequestTracker.tsx`

- Ensure Card instances use `glass` class consistently

---

## What Does NOT Change

- ExitIntentPopup (already the reference)
- FunnelSteps form, validation, email verification
- Analytics, GTM, RLS policies
- Edge functions

