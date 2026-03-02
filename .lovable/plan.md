

# Partner Funnel CRO v3: The Remaining Gaps

## Current State After v2 Implementation

The v2 plan was well-executed. Email-first micro-step, partial lead capture table, reminder edge functions, form above the fold, CTA copy upgrades, honeypot, meta tags, trust badge fixes, and success page fixes are all live. Here is what is still broken, missing, or suboptimal.

---

## 1. STILL BROKEN: Items From v2 That Were Not Fully Addressed

### 1.1 `funnel_analytics` has no `metadata` column (CRITICAL)

The `useFunnelAnalytics.ts` hook writes `metadata: { funnel_version: 3 }` on every event (lines ~40, 70, 87, etc.), but the `funnel_analytics` table has no `metadata` column. The columns are: `id, created_at, session_id, step_number, step_name, action, source_channel, utm_source, utm_medium, utm_campaign, user_agent, time_on_step_seconds`. Every analytics insert is silently failing or the metadata field is being dropped.

**Fix**: Add a `metadata JSONB DEFAULT '{}'` column to `funnel_analytics` via migration. This is required for the `funnel_version` tag to actually persist and allow filtering old vs new funnel data.

### 1.2 PartnershipSubmitted.tsx still links to authenticated routes (MEDIUM)

Lines 123-128: "View Companies" navigates to `/companies` and "Go to Dashboard" navigates to `/home`. An anonymous partner who just submitted has no account -- these buttons will redirect to login. This was identified in the previous audit but never fixed.

**Fix**: Replace with contextual actions:
- "Book a Strategy Call" linking to the Cal.com booking page (or a Calendly equivalent)
- "Return to Website" linking to `https://thequantumclub.com`

### 1.3 `ProgressSaver.tsx` still has the legacy "Continue on another device" dialog (MEDIUM)

The v2 plan said to de-scope this, but the full dialog UI and `send-recovery-email` call are still present (lines 52-97, 122-190). The new DB-backed resume flow (`?resume=sessionId`) replaces this entirely.

**Fix**: Remove the recovery dialog, the `send-recovery-email` invocation, and the "Continue on another device" button. Keep only the save status indicator.

### 1.4 `SessionRecoveryBanner.tsx` still calls `send-recovery-email` (LOW)

Same issue -- lines 49-53 call the legacy `send-recovery-email` edge function. This component should either be removed or refactored to use the new `?resume=` flow.

**Fix**: Remove the component if it is no longer rendered, or update it to use the new partial submissions resume URL.

### 1.5 Exit intent copy is not differentiated by step (LOW)

The v2 plan specified different copy for step 0 ("Before you go -- this takes under 60 seconds") vs step 1 (current copy). The `ExitIntentPopup` component still shows identical copy regardless of step. The `currentStep` prop is available but only used for the progress percentage.

**Fix**: Add step-aware copy to `ExitIntentPopup`:
- Step 0: "Before you go -- this takes under 60 seconds. No fees, no obligation."
- Step 1: Current copy about progress being saved.

### 1.6 No pg_cron schedule for `process-funnel-reminders` (MEDIUM)

The edge function exists but there is no cron job to invoke it. Without this, no reminder emails will ever be sent automatically. The function just sits there unused.

**Fix**: Create a migration that schedules `process-funnel-reminders` via `pg_cron` + `pg_net` to run hourly.

---

## 2. NEW OPPORTUNITIES: What Would Make This Best-in-Class

### 2.1 Second reminder email at 24h (HIGH)

The current system sends one reminder at 2-48h. Industry best practice is a 2-touch sequence:
- Reminder 1 at ~2 hours: "You left your request unfinished"
- Reminder 2 at ~24 hours: "Last chance -- your progress expires soon"

The second email typically recovers an additional 3-5% of leads that ignored the first one.

**Fix**: 
- Add `reminder_count INTEGER DEFAULT 0` column to `funnel_partial_submissions`
- Update `process-funnel-reminders` to send a second reminder at 24h for entries where `reminder_count = 1`
- Create a slightly different email template for the second touch (more urgency, different subject line)

### 2.2 QUIN chat widget overlaps submit button on mobile (MEDIUM)

The `FunnelAIAssistant` floating button is `fixed bottom-6 right-6` (line 128). On mobile viewports (390px), this overlaps with the form card's bottom edge and the submit button. On step 2, when the user is trying to tap "Submit", the chat bubble competes for the tap target.

**Fix**: Hide the QUIN chat button on mobile when the user is on step 2 (submit step), or move it to a less intrusive position. One approach: pass `currentStep` to `PartnerFunnel.tsx` and conditionally render `FunnelAIAssistant` only when `currentStep < 2`.

### 2.3 No structured data / JSON-LD for search engines (LOW)

The page has good `<Helmet>` meta tags now, but no structured data. Adding `Organization` and `Service` JSON-LD would improve Google rich results when someone searches for "The Quantum Club recruitment" or similar.

**Fix**: Add a `<script type="application/ld+json">` block in the Helmet with Organization schema (name, url, logo, contactPoint).

### 2.4 Multi-touch reminder sequence with expiry warning (MEDIUM)

Currently, partial submissions sit in the DB forever with no expiry. After 48 hours, no more reminders are sent but the data remains. A "Your progress will be deleted in 24 hours" email at 72h would create genuine urgency (and you should actually clean up old partials after 7 days for GDPR compliance).

**Fix**:
- Add a third email template: "Last chance -- your progress expires tomorrow"
- Add a cleanup job that deletes incomplete partials older than 7 days
- This satisfies GDPR data minimization requirements

### 2.5 Admin dashboard visibility for partial leads (MEDIUM)

The `funnel_partial_submissions` table exists but there is no admin UI to view captured emails. Admins currently have no visibility into who started but didn't finish. This data is extremely valuable for manual outreach.

**Fix**: Add a "Partial Leads" tab or section in the admin analytics dashboard showing:
- Email, name, company, step reached, time since last activity
- A "Send Reminder" button for manual follow-up
- Export to CSV for CRM import

### 2.6 UTM parameter persistence through resume flow (LOW)

When a user arrives via a Google Ads link (`/partner?utm_source=google&utm_medium=cpc`), the UTM params are captured at submission time (line 369-371 in FunnelSteps). But if they leave and come back via a reminder email (`/partner?resume=abc123`), the original UTM params are lost -- the resume URL has no UTMs.

**Fix**: Save UTM params in the `form_data` JSONB of `funnel_partial_submissions` on initial capture. On submission, prefer the saved UTMs over current URL params (since the current URL will be the reminder email link, not the original ad).

---

## Implementation Plan

### Task 1: Add metadata column to funnel_analytics
- DB migration: `ALTER TABLE public.funnel_analytics ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';`
- This unblocks the funnel_version filtering that was already coded

### Task 2: Fix PartnershipSubmitted.tsx buttons
- File: `src/pages/PartnershipSubmitted.tsx`
- Replace "View Companies" with "Book a Strategy Call" (external link)
- Replace "Go to Dashboard" with "Return to Website" (link to thequantumclub.com)

### Task 3: De-scope legacy recovery dialog
- File: `src/components/partner-funnel/ProgressSaver.tsx`
  - Remove the recovery dialog UI, the `send-recovery-email` call, and the "Continue on another device" button
  - Keep only the save status indicator (`CloudSyncIndicator`)
- File: `src/components/partner-funnel/SessionRecoveryBanner.tsx`
  - Remove `send-recovery-email` call; either remove the component or update to use `?resume=` URL

### Task 4: Schedule process-funnel-reminders via pg_cron
- DB migration:
```sql
SELECT cron.schedule(
  'process-funnel-reminders-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-funnel-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### Task 5: Add second reminder + reminder_count column
- DB migration: `ALTER TABLE public.funnel_partial_submissions ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;`
- File: `supabase/functions/process-funnel-reminders/index.ts`
  - Update query to also find entries where `reminder_count = 1` AND `reminder_sent_at` is older than 24 hours
  - Send different subject/body for second touch: "Last chance to finish your request, {name}"
  - Increment `reminder_count` on each send
  - Update `reminder_sent_at` on each send

### Task 6: Step-aware exit intent copy
- File: `src/components/partner-funnel/ExitIntentPopup.tsx`
  - When `currentStep === 0`: show "Before you go -- this takes under 60 seconds. No fees, no obligation."
  - When `currentStep === 1`: keep current copy about progress being saved

### Task 7: Fix QUIN chat overlap on mobile
- File: `src/components/partner-funnel/FunnelAIAssistant.tsx`
  - Add a `hideOnMobile` prop or use a CSS media query to push the button to `bottom-20` on small screens
  - Or: accept a `currentStep` prop and hide on step 2

### Task 8: Save and restore UTM params through resume flow
- File: `src/components/partner-funnel/FunnelSteps.tsx`
  - On `handleEmailCapture`, save current UTM params into the `form_data` JSONB
  - On `handleSubmit`, prefer saved UTMs from `form_data` over current URL params

### Task 9: Add JSON-LD structured data
- File: `src/pages/PartnerFunnel.tsx`
  - Add Organization + Service JSON-LD in the Helmet

### Task 10: GDPR cleanup job for old partials
- DB migration: schedule a daily cron job that deletes `funnel_partial_submissions` where `completed = false AND created_at < now() - interval '7 days'`

---

## Priority Order

1. **Task 1** (metadata column) -- fixes silent analytics failures
2. **Task 4** (pg_cron for reminders) -- without this, the entire reminder system does nothing
3. **Task 5** (second reminder + count) -- doubles recovery potential
4. **Task 2** (fix submitted page buttons) -- prevents dead-end UX
5. **Task 3** (de-scope legacy recovery) -- removes dead code and confusion
6. **Task 6** (exit intent copy) -- incremental lift on step 0
7. **Task 8** (UTM persistence) -- attribution accuracy for paid traffic
8. **Task 7** (QUIN overlap) -- mobile UX fix
9. **Task 9** (JSON-LD) -- SEO polish
10. **Task 10** (GDPR cleanup) -- compliance

---

## Files Summary

**DB migrations:**
- Add `metadata JSONB` to `funnel_analytics`
- Add `reminder_count INTEGER` to `funnel_partial_submissions`
- Schedule `process-funnel-reminders` via pg_cron (hourly)
- Schedule GDPR cleanup of old partials (daily)

**Modified files:**
- `src/pages/PartnershipSubmitted.tsx` (fix buttons)
- `src/components/partner-funnel/ProgressSaver.tsx` (remove legacy recovery dialog)
- `src/components/partner-funnel/SessionRecoveryBanner.tsx` (remove/update)
- `src/components/partner-funnel/ExitIntentPopup.tsx` (step-aware copy)
- `src/components/partner-funnel/FunnelAIAssistant.tsx` (mobile overlap fix)
- `src/components/partner-funnel/FunnelSteps.tsx` (UTM persistence in form_data)
- `src/pages/PartnerFunnel.tsx` (JSON-LD structured data)
- `supabase/functions/process-funnel-reminders/index.ts` (multi-touch sequence)

