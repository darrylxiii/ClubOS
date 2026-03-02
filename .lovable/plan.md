
# Partner Funnel CRO Mega-Audit v2: The Definitive Plan

## Corrected Data (Previous Plan Had Wrong Numbers)

The previous audit claimed "524 views, 3 completions, 0.6% conversion." That was wrong. Here are the real numbers from the last 3 months of `funnel_analytics`:

```text
Step 0 "Your Details":    495 unique sessions viewed  ->  68 completed  (13.7%)
Step 1 "Hiring Needs":     69 viewed                  ->  54 completed  (78.3%)
Step 2 "Submit":            54 viewed                  ->  49 completed  (90.7%)
Funnel complete events:     7
Actual partner_requests in DB (6 months): 20 total (15 superseded, 4 declined, 1 pending)
```

The real bottleneck is clear: **86.3% of visitors abandon at Step 0 before typing anything.** Once someone starts, the funnel performs well (78-91% step-to-step). The problem is first impression, not form complexity.

Also notable: Steps 3, 4, 5 appear in the analytics, meaning old data from the former 5-step funnel is mixed in, inflating "complete" counts. The `trackFunnelComplete` function still writes `step_number: 5` (line 126 of `useFunnelAnalytics.ts`) even though the funnel is now 3 steps.

---

## CRITICAL ISSUES NOT IN PREVIOUS PLAN

### NEW 1: Analytics are broken and recording phantom steps

`useFunnelAnalytics.ts` line 126 hardcodes `step_number: 5` for funnel completion. The funnel is 3 steps (0, 1, 2). This means:
- Completion events record at step 5, which doesn't exist
- Historical data mixes 5-step and 3-step funnels, making analysis unreliable
- The `trackVerification` function references step 4 "verification" (line 110) which was removed

**Fix**: Update `trackFunnelComplete` to use `step_number: 2` (the actual final step). Remove the dead `trackVerification` function or update its step references. Add a `funnel_version` field to analytics events so old/new data can be filtered.

### NEW 2: Step 0 fires 5+ duplicate "view" events per session

The analytics query shows sessions like `6019216f` with 5 "view" events for step 0 in the same second. The `trackStepView` is called in a `useEffect` that depends on `[currentStep, analytics]` (line 148-149), where `analytics` is a new object every render because `useFunnelAnalytics` returns a fresh object reference. This causes infinite re-renders.

**Fix**: Memoize the analytics hook return value, or add a "has already tracked this step" guard. This also inflates view counts -- the real unique session count may be lower than 495.

### NEW 3: No reCAPTCHA despite the previous plan mentioning it

The previous audit claimed "The funnel already has reCAPTCHA v3." It does not. There is zero reCAPTCHA code in the partner funnel components. The `react-google-recaptcha-v3` package is installed but not used here. This means any bot can submit the form directly.

**Fix**: Add reCAPTCHA v3 scoring on the submit action, or add a lightweight honeypot field as a simpler alternative.

### NEW 4: `handleQuickReply` race condition is still live

`FunnelAIAssistant.tsx` line 95-98: `handleQuickReply` sets state then calls `handleSend()` in a `setTimeout(0)`. `handleSend` reads `message` from state which won't have updated yet. The `sendReply` function (line 101) correctly handles this, but `handleQuickReply` is dead code that could be called by mistake in future edits.

**Fix**: Delete `handleQuickReply` entirely.

---

## ISSUES FROM PREVIOUS PLAN: STATUS CHECK

### Fake social proof -- STILL BROKEN
DB confirms: `social_proof_items` contains "TechCorp", "InnovateCo", "FutureLabs" with `/placeholder.svg` logos. Not fixed.

### "Step X of 5" in ProgressSaver -- STILL BROKEN  
Line 163 of `ProgressSaver.tsx` shows "Step {currentStep + 1} of 5". The funnel has 3 steps.

### "Step X/5" in SessionRecoveryBanner -- STILL BROKEN
Line 107 shows `Step {currentStep + 1}/5`.

### "Response within 19 minutes" -- STILL BROKEN
`SuccessConfetti.tsx` line 97. Config says 48 hours.

### "No-Cure-No-Pay guarantee" -- STILL PRESENT
`SuccessConfetti.tsx` line 121. Contradicts the funnel's no-contract design philosophy.

### No Helmet/meta tags on partner funnel -- STILL MISSING
`CandidateOnboarding.tsx` has full Helmet with OG tags. `PartnerFunnel.tsx` has none. Zero SEO or social sharing support.

### Exit intent only fires on step 1 -- STILL LIMITED
Line 65: `if (currentStep > 0 && currentStep < 2)` means it only fires on step 1. Step 0 is where 86% of people leave.

### No partial lead capture to DB -- STILL MISSING
`funnel_partial_submissions` table does not exist. No `send-funnel-reminder` or `process-funnel-reminders` edge functions exist.

### Form below the fold -- STILL AN ISSUE
Page order: logo -> hero text -> 3-step strip -> full testimonial card -> form. On mobile the form requires significant scrolling.

---

## THE COMPLETE IMPLEMENTATION PLAN

### Phase 1: Fix What's Broken (Data Integrity)

**Task 1: Fix analytics tracking**
- File: `src/hooks/useFunnelAnalytics.ts`
  - Change `step_number: 5` to `step_number: 2` in `trackFunnelComplete`
  - Remove or fix `trackVerification` dead references to steps 4/5
  - Add deduplication guard to `trackStepView` to prevent 5x writes per load
  - Add `metadata: { funnel_version: 3 }` to all events for future filtering

**Task 2: Fix hardcoded step counts**
- File: `src/components/partner-funnel/ProgressSaver.tsx` line 163: change "of 5" to "of 3"
- File: `src/components/partner-funnel/SessionRecoveryBanner.tsx` line 107: change "/5" to "/3"

**Task 3: Fix success page false claims**
- File: `src/components/partner-funnel/SuccessConfetti.tsx`
  - Line 97: "Response within 19 minutes" -> "Your strategist will respond within 24 hours"
  - Line 121: Remove "No-Cure-No-Pay guarantee" -> "You only pay when we place a candidate"

**Task 4: Remove dead code**
- File: `src/components/partner-funnel/FunnelAIAssistant.tsx` -- delete `handleQuickReply` function (lines 95-98)

### Phase 2: Lead Capture Foundation (Highest ROI)

**Task 5: Create partial submissions table**
- DB migration:
```sql
CREATE TABLE public.funnel_partial_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  company_name TEXT,
  form_data JSONB DEFAULT '{}',
  current_step INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  reminder_sent_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.funnel_partial_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert partial submissions"
  ON public.funnel_partial_submissions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update own partial submission"
  ON public.funnel_partial_submissions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can read own partial submission"
  ON public.funnel_partial_submissions FOR SELECT TO anon USING (true);
CREATE POLICY "Admins can read all partial submissions"
  ON public.funnel_partial_submissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

**Task 6: Split Step 0 into email-first micro-step**
- File: `src/components/partner-funnel/FunnelSteps.tsx`
- Add internal state `emailCaptured` (boolean, default false)
- Step 0 Phase A: Show only "Work Email" field + "Get Started" button. Single field. Maximum simplicity.
- On valid email blur or "Get Started" click: upsert to `funnel_partial_submissions` with session_id and email. Set `emailCaptured = true`.
- Step 0 Phase B: Reveal Name, Company, Industry fields (slide-down animation). Email field stays visible but is pre-filled and read-only.
- On "Continue" click (completing step 0): update the partial submission row with all form data.
- On every subsequent step change: update `current_step` and `form_data` in the partial row.
- On final submission: set `completed = true`.

**Task 7: Add resume-from-email capability**
- File: `src/components/partner-funnel/FunnelSteps.tsx`
- On mount, check for `?resume={sessionId}` query param
- If present, fetch from `funnel_partial_submissions` by session_id
- Pre-fill form data, set step, set `emailCaptured = true`
- Show "Welcome back" toast

### Phase 3: Abandonment Recovery

**Task 8: Build "Finish Your Request" reminder email**
- New file: `supabase/functions/send-funnel-reminder/index.ts`
  - Accepts `{ email, contactName, companyName, resumeUrl }`
  - Sends branded email from `partners@thequantumclub.nl` via Resend
  - Subject: "Your request is still waiting, {name}"
  - Body: what they entered so far, resume link (`/partner?resume={sessionId}`), "takes 60 seconds to finish"
  - Include List-Unsubscribe header

- New file: `supabase/functions/process-funnel-reminders/index.ts`
  - Queries `funnel_partial_submissions` where:
    - `completed = false`
    - `reminder_sent_at IS NULL`
    - `created_at` between 2 hours and 48 hours ago
    - `contact_email` is not null
  - For each: calls `send-funnel-reminder`, updates `reminder_sent_at`
  - Designed to be triggered via pg_cron (hourly) or manual invocation

### Phase 4: Credibility and Above-the-Fold

**Task 9: Replace fake social proof**
- Option A (if real testimonials available): Update `funnel_config.social_proof_items` via DB update with real company names, real quotes, real logos
- Option B (if no real testimonials yet): Replace `SocialProofCarousel.tsx` with a stats bar showing live numbers from `funnel_config.live_stats`: "87 active roles | 26 partnerships this month | Avg response: 48h"
- This is a content/data decision -- implement Option B as the default since it uses real data

**Task 10: Move form above the fold**
- File: `src/pages/PartnerFunnel.tsx`
- Reorder: Hero text -> Form card -> Social proof (below form)
- On mobile, collapse the "how it works" 3-step strip to a single-line badge: "3 simple steps -- no fees, no contracts"
- The email input field must be visible without scrolling on a 390px viewport

**Task 11: Upgrade CTA copy**
- File: `src/components/partner-funnel/FunnelSteps.tsx`
- Step 0 Phase A button: "Get Started" (not "Continue")
- Step 0 Phase B button: "Next: Your Hiring Needs"  
- Step 1 button: "Review and Submit"
- Step 2 button: "Submit -- Free, No Obligation" (not "Send My Request")

**Task 12: Enable exit intent on Step 0**
- File: `src/components/partner-funnel/FunnelSteps.tsx`
- Change line 65: `if (currentStep >= 0 && currentStep < 2)` 
- Change line 70: enable for `currentStep >= 0`
- Different copy for step 0: "Before you go -- this takes under 60 seconds. No fees, no obligation."

### Phase 5: SEO and Trust Polish

**Task 13: Add Helmet meta tags**
- File: `src/pages/PartnerFunnel.tsx`
- Add `react-helmet-async` Helmet with:
  - Title: "Partner with The Quantum Club -- Access Pre-Vetted Senior Talent"
  - Meta description
  - OG title, OG description, OG type
  - `<link rel="canonical" href="https://os.thequantumclub.com/partner" />`
  - `<meta name="robots" content="index, follow" />`

**Task 14: Fix trust badge**
- File: `src/components/partner-funnel/TrustBadges.tsx`
- Remove or source "4.9/5 Rating" badge (no verifiable source exists)
- Replace with "24h Response" or "48 Placements" (real metrics)

**Task 15: Add honeypot spam field**
- File: `src/components/partner-funnel/FunnelSteps.tsx`
- Add a hidden input field (CSS `display: none` or `position: absolute; left: -9999px`)
- If the field has a value on submit, silently reject (bots fill all fields)
- Lighter-weight than reCAPTCHA, zero friction for real users

### Phase 6: De-scope

Per project rules (one de-scope per scope increase):
- **De-scope**: The "Continue on another device" recovery dialog in `ProgressSaver.tsx` and `SessionRecoveryBanner.tsx`. The new DB-backed partial submissions + resume-from-email flow replaces this entirely. Remove the dialog UI and the `send-recovery-email` edge function call from these components.

---

## Priority and Sequencing

```text
Phase 1 (Tasks 1-4):  Fix broken things         -- prerequisite, no dependencies
Phase 2 (Tasks 5-7):  Partial capture + email-first -- highest ROI, needs DB migration first
Phase 3 (Tasks 8):    Reminder emails            -- needs Task 5 table to exist
Phase 4 (Tasks 9-12): Credibility + layout       -- independent, can parallel with Phase 2
Phase 5 (Tasks 13-15): Polish                    -- independent
Phase 6:              De-scope recovery dialog   -- after Phase 2 is confirmed working
```

Tasks 1-4 and 9-15 are independent and can be done in parallel.
Tasks 5 must complete before 6, 7, and 8.

---

## Expected Impact

```text
Current (real data):
  495 sessions -> 68 step-0 completions (13.7%) -> 7 funnel_complete (1.4%)

After email-first micro-step (Task 6):
  495 sessions -> ~150 emails captured (30%) -> ~80 step-0 completions (16%)

After reminder emails (Task 8):
  +10-15% recovery on 150 partials = ~20 additional completions

After credibility + layout fixes (Tasks 9-12):
  Lift step-0 by 1.5x with real proof + above-fold form = ~120 step-0 completions

Conservative projection: 40-60 completed submissions per 495 views (8-12%)
vs. current 7 completions (1.4%) = 6-9x improvement
```

---

## Files Summary

**New files:**
- `supabase/functions/send-funnel-reminder/index.ts`
- `supabase/functions/process-funnel-reminders/index.ts`

**Modified files:**
- `src/hooks/useFunnelAnalytics.ts` (fix step numbers, dedup, add version)
- `src/components/partner-funnel/FunnelSteps.tsx` (email-first, partial save, resume, CTAs, exit intent, honeypot)
- `src/pages/PartnerFunnel.tsx` (layout reorder, Helmet meta tags)
- `src/components/partner-funnel/SuccessConfetti.tsx` (fix false claims)
- `src/components/partner-funnel/ProgressSaver.tsx` (fix step count, de-scope recovery dialog)
- `src/components/partner-funnel/SessionRecoveryBanner.tsx` (fix step count, de-scope)
- `src/components/partner-funnel/SocialProofCarousel.tsx` (stats-based proof fallback)
- `src/components/partner-funnel/TrustBadges.tsx` (remove unverified rating)
- `src/components/partner-funnel/FunnelAIAssistant.tsx` (remove dead code)

**DB migration:**
- Create `funnel_partial_submissions` table with RLS
