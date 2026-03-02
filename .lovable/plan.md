

# Partner Funnel CRO Audit Scorecard: Current State

## Overall Score: 72/100

The system has dramatically improved from the original broken state. Here is the line-by-line scorecard of what scores full marks, what is partially done, and what is still missing.

---

## Scorecard Breakdown

### LEAD CAPTURE (20/20) -- COMPLETE
- [10/10] Email-first micro-step (Phase A / Phase B) -- implemented, working
- [5/5] Partial submissions table with upsert on email blur -- table exists, columns correct, upsert logic present
- [5/5] Resume from email link (`?resume=sessionId`) -- implemented with toast and state restoration

### ANALYTICS INTEGRITY (12/15) -- NEARLY COMPLETE
- [5/5] Funnel completion tracks step 2 (not 5) -- fixed
- [5/5] Step view deduplication via `trackedStepViews` ref Set -- fixed
- [2/5] `metadata JSONB` column on `funnel_analytics` -- column exists in DB (confirmed), hook writes `funnel_version: 3`. However, the hook still reads UTM params from `window.location.search` on every `trackStepView` call, which means resumed sessions (from `?resume=`) will record `utm_source=null` instead of the original ad UTM. The UTM persistence fix (saving to form_data) only applies to the final submission, not analytics events. Deduct 3 points.

### ABANDONMENT RECOVERY (13/15) -- NEARLY COMPLETE
- [5/5] `send-funnel-reminder` edge function -- exists, branded email, plain-text fallback, List-Unsubscribe, physical address
- [5/5] `process-funnel-reminders` edge function -- exists, multi-touch (touch 1 at 2h, touch 2 at 24h), `reminder_count` column present
- [3/5] pg_cron scheduled hourly -- EXISTS and ACTIVE. However, the cron job uses the **anon key** for authorization instead of `SUPABASE_SERVICE_ROLE_KEY`. The `process-funnel-reminders` function creates a service-role client internally using `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`, so the anon-key auth header on the HTTP call itself may still work since Supabase edge functions accept any valid JWT to start the function. But this is a security anti-pattern -- the cron trigger should use the service role key. Deduct 2 points.
- GDPR cleanup job: EXISTS, runs daily at 03:00, deletes incomplete partials older than 7 days. Full marks.

### CREDIBILITY AND TRUST (7/10) -- GOOD BUT NOT PERFECT
- [5/5] Social proof auto-detects placeholders ("TechCorp" etc.) and falls back to stats bar with live numbers. No fake testimonials shown.
- [2/5] Trust badges: "4.9/5 Rating" was removed and replaced with "24h Response" and "Zero Upfront Fees" -- good. But the `funnel_config.live_stats` values that power the stats bar (active_roles, partnerships_this_month) are still manually set in the DB. If they are 0, the stats bar renders nothing. Currently these values may be stale or zero. No mechanism to auto-update them from real data. Deduct 3 points.

### ABOVE-THE-FOLD AND LAYOUT (10/10) -- COMPLETE
- [5/5] Form card is above social proof in the page order -- confirmed in `PartnerFunnel.tsx` (line 174 vs 180)
- [3/3] Mobile "3 simple steps" badge instead of full strip -- confirmed (line 168-172)
- [2/2] "How it works" strip hidden on mobile (`hidden sm:flex`) -- confirmed

### CTA AND COPY (10/10) -- COMPLETE
- [3/3] Step 0 Phase A: "Get Started" -- confirmed
- [3/3] Step 0 Phase B: "Next: Your Hiring Needs" -- confirmed  
- [2/2] Step 2: "Submit -- Free, No Obligation" -- confirmed
- [2/2] Hero headline benefit-oriented ("Your shortlist... ready in 14 days") with "No upfront fees" prominent -- confirmed

### SUCCESS PAGE (8/10) -- NEARLY COMPLETE
- [5/5] PartnershipSubmitted.tsx: "Book a Strategy Call" (Cal.com link) + "Return to Website" (thequantumclub.com) -- confirmed, no auth-required links
- [3/3] SuccessConfetti.tsx: "Response within 24 hours" (not "19 minutes"), "You only pay for results" (not "No-Cure-No-Pay") -- confirmed
- [0/2] The `SuccessConfetti` component renders inside `FunnelSteps` at step 3 but then `FunnelSteps` also navigates to `/partnership-submitted/` on line 434. This means the user sees SuccessConfetti briefly, then gets navigated away to PartnershipSubmitted page which has its own success content. The SuccessConfetti component is effectively dead UI -- the confetti fires for ~3 seconds then the navigate kicks in. The user never sees the full SuccessConfetti card. Deduct 2 points.

### EXIT INTENT (5/5) -- COMPLETE
- [3/3] Fires on step 0 AND step 1 (`currentStep >= 0 && currentStep < 2`) -- confirmed
- [2/2] Step-aware copy: step 0 shows "Under 60 seconds" messaging, step 1 shows progress-saved messaging -- confirmed

### SEO AND STRUCTURED DATA (5/5) -- COMPLETE
- [3/3] Helmet with title, description, OG tags, canonical, robots -- confirmed
- [2/2] JSON-LD Organization schema with address, contactPoint, sameAs -- confirmed

### SPAM PREVENTION (5/5) -- COMPLETE
- [5/5] Honeypot field: hidden input, absolute positioned off-screen, aria-hidden, tabIndex -1, silently rejects if filled -- confirmed

### LEGACY CLEANUP (5/5) -- COMPLETE
- [3/3] ProgressSaver: stripped to minimal save indicator, no recovery dialog, no send-recovery-email -- confirmed
- [2/2] SessionRecoveryBanner: simplified to "Step X/3" welcome back banner, no legacy email function -- confirmed

### DE-SCOPED / DEAD CODE (0/5) -- ISSUES REMAIN
- [0/2] `FunnelAIAssistant.tsx`: The `handleQuickReply` race condition was supposedly removed but the `sendReply` function still exists as a separate path from `handleSend`. The dead code removal of `handleQuickReply` was done, but a new issue: `onKeyPress` is deprecated in React 18 (line 198). Should be `onKeyDown`. Minor but sloppy. Deduct 2 points.
- [0/3] The `send-funnel-reminder` edge function does NOT differentiate email copy for the second reminder. The `isSecondReminder` parameter is sent by `process-funnel-reminders` (line 77) but `send-funnel-reminder` does NOT read or use this parameter at all (line 14: it destructures `{ email, contactName, companyName, resumeUrl }` -- no `isSecondReminder`). The second touch email is identical to the first. Deduct 3 points.

---

## Issues to Fix to Reach 100/100

### Issue 1: Second reminder email uses identical copy (3 points)
`send-funnel-reminder/index.ts` line 14 does not destructure `isSecondReminder`. Both touches send the exact same email. The second touch should have a different subject line ("Last chance to finish your request") and more urgency in the body copy.

**Fix**: Update `send-funnel-reminder` to accept and use `isSecondReminder`, with a different subject line and body paragraph for the second touch.

### Issue 2: Cron job uses anon key (2 points)
The pg_cron job for `process-funnel-reminders-hourly` hardcodes the anon key in the Authorization header. While the edge function internally uses the service role key, the trigger itself should authenticate properly.

**Fix**: Update the cron job to use `current_setting('supabase.service_role_key')` or the service role key directly. This requires dropping and re-creating the cron job.

### Issue 3: SuccessConfetti is dead UI (2 points)
`FunnelSteps.tsx` renders `SuccessConfetti` at step 3 (line 740-747) but also navigates to `/partnership-submitted/` on line 434. The user sees confetti for 3 seconds then gets yanked to another page. Either keep the in-funnel success (remove the navigate) or remove SuccessConfetti and just navigate immediately.

**Fix**: Remove the `SuccessConfetti` render at step 3 and navigate immediately after successful submission. The `PartnershipSubmitted` page already has its own success content.

### Issue 4: Analytics UTMs are wrong on resumed sessions (3 points)
When a user resumes via `?resume=abc123`, the analytics `trackStepView` reads UTMs from `window.location.search` which now contains `resume=abc123`, not the original ad UTMs. The saved UTMs in `form_data._saved_utm_*` are only used on final submission, not on analytics events.

**Fix**: In `FunnelSteps.tsx`, after loading a resumed session, extract the saved UTMs from `form_data` and pass them to the analytics hook (or store them in a ref that `useFunnelAnalytics` can read).

### Issue 5: `live_stats` in funnel_config are static (3 points)
The stats bar shows "X active roles | Y partnerships" but these values are manually set in `funnel_config.live_stats`. They could be stale or zero.

**Fix**: Create a database function or scheduled job that auto-updates `funnel_config.live_stats` from actual table counts (e.g., count of active roles from `jobs` table, count of approved partner_requests from last 30 days).

### Issue 6: Deprecated `onKeyPress` in FunnelAIAssistant (1 point)
Line 198: `onKeyPress` is deprecated in React 18. Should be `onKeyDown`.

**Fix**: Change `onKeyPress` to `onKeyDown` on the chat input.

### Issue 7: No admin dashboard for partial leads (not scored, but mentioned in v3 plan)
The `funnel_partial_submissions` table has admin SELECT policy but no admin UI. This was proposed as "Task 2.5" in the v3 plan but not implemented. Not blocking for the funnel itself, but a missed operational feature.

---

## Implementation Plan to Reach 100/100

### Task 1: Fix second reminder email differentiation
- File: `supabase/functions/send-funnel-reminder/index.ts`
  - Destructure `isSecondReminder` from request body
  - When `isSecondReminder === true`:
    - Subject: "Last chance to finish your request, {name}"
    - Body: Add urgency paragraph: "Your saved progress will be removed soon. Complete your request now -- it takes less than 60 seconds."

### Task 2: Fix cron job auth key
- DB migration: Drop the existing cron job and recreate it with proper service role key auth using `current_setting('supabase.service_role_key')` or a corrected approach

### Task 3: Remove dead SuccessConfetti render
- File: `src/components/partner-funnel/FunnelSteps.tsx`
  - Remove the `case 3:` that renders `SuccessConfetti` (lines 740-748)
  - Remove the `if (currentStep === 3)` guard (lines 762-764)
  - The navigate on line 434 already handles the post-submission flow

### Task 4: Fix analytics UTMs on resumed sessions
- File: `src/components/partner-funnel/FunnelSteps.tsx`
  - After loading a resumed session, store the saved UTMs in a ref
  - Pass those UTMs to analytics events (or update the analytics hook to accept override UTMs)

### Task 5: Auto-update live_stats from real data
- DB migration: Create a function `update_funnel_live_stats()` that counts active roles and recent partnerships, then updates `funnel_config.live_stats`
- Schedule via pg_cron to run daily

### Task 6: Fix deprecated onKeyPress
- File: `src/components/partner-funnel/FunnelAIAssistant.tsx`
  - Line 198: Change `onKeyPress` to `onKeyDown`

---

## Priority Order

1. Task 1 (second reminder copy) -- highest impact, easy fix
2. Task 3 (remove dead SuccessConfetti) -- UX confusion fix
3. Task 2 (cron auth) -- security fix
4. Task 4 (analytics UTMs) -- data accuracy
5. Task 5 (auto-update live_stats) -- credibility automation
6. Task 6 (onKeyPress) -- trivial cleanup

All tasks are independent and can be done in parallel.

