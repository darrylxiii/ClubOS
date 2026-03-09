

# Fix: Show "Already a Member" message on `/onboarding` for logged-in users

## Problem
When a logged-in, approved candidate visits `/onboarding`, line 47 redirects them to `/club-home` (which doesn't exist — it should be `/home`). Instead of silently redirecting, the user wants a friendly message telling them they're already a member, with a CTA to invite friends.

## Solution
In `CandidateOnboarding.tsx`, replace the redirect logic (lines 45-52) with a state flag (`isAlreadyMember`). When set, render a branded card instead of the onboarding form:

- Heading: "You're already a member!"
- Subtitle: "You've completed onboarding. Explore your dashboard or invite a friend to join The Quantum Club."
- Two buttons: **Go to Dashboard** (`/home`) and **Invite a Friend** (`/invite` or relevant invite route)
- Keep the same page layout/branding (logo, theme toggle, background)

### Files to modify
1. **`src/pages/CandidateOnboarding.tsx`**
   - Add `isAlreadyMember` state (default `false`)
   - On line 46-47: instead of `navigate('/club-home')`, set `isAlreadyMember = true`
   - Remove the `navigate('/pending-approval')` fallback for pending users (keep that redirect)
   - In the render: if `isAlreadyMember`, show an "Already a member" card with dashboard + invite links
   - Fix the `/club-home` reference to `/home` for any remaining paths

2. **`src/pages/OAuthOnboarding.tsx`** — fix both `/club-home` references to `/home` (lines 79, 467) as a safety measure

