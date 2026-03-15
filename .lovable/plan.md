
# Comprehensive Candidate Communication & Notification Audit

## Current State: What Exists Today

### Candidate Journey Touchpoints
```text
Onboarding → Home Dashboard → Browse Jobs → Apply → Pipeline Stages → Interview Prep → Meetings → Offer → Placement
     ↕              ↕              ↕          ↕           ↕                ↕              ↕         ↕         ↕
  Settings      Messages       Companies  Referrals   Assessments      ClubAI       Scheduling  Salary   Career Path
```

### Existing Candidate-Facing Edge Functions (Emails)

| Edge Function | Trigger | Channel | Status |
|---|---|---|---|
| `send-candidate-welcome-email` | Onboarding approval | Email | Working |
| `send-interview-scheduled-email` | Interview booked | Email | Working |
| `send-offer-notification-email` | Offer extended | Email | Working |
| `send-placement-congratulations-email` | Hired/placed | Email | Working |
| `send-booking-confirmation` | Booking confirmed | Email | Working |
| `send-booking-reminder-email` | Cron (pre-meeting) | Email | Working |
| `send-booking-sms-reminder` | Cron (pre-meeting) | SMS | Working |
| `send-meeting-invitation-email` | Meeting created | Email | Working |
| `send-meeting-summary-email` | Post-meeting | Email | Working |
| `send-approval-sms` | Onboarding approved | SMS | Working |
| `send-feedback-response` | Feedback given | Email | Working |

### Existing Notification Preferences (Settings Page)
The `NotificationPreferences` component supports toggles for:
- Email: Applications, Messages, Interviews, Job Matches, System, Digest (daily/weekly)
- In-App: Applications, Messages, Interviews, Job Matches, System
- Quiet Hours

**Missing channels**: No SMS or WhatsApp toggles in preferences UI.

### Existing Real-Time Triggers (`useNotificationTriggers`)
Only 3 client-side triggers exist:
1. New message → in-app toast + push notification
2. Application status change → push notification (only on `user_id`, misses `candidate_id`)
3. Meeting starting in 15 min → push notification (uses `sessionStorage`, lost on refresh)

### Existing WhatsApp Infrastructure
- `whatsapp-webhook-receiver` — receives inbound WhatsApp messages
- `whatsapp-booking-handler` — AI-powered booking via WhatsApp
- `process-whatsapp-message` — AI response generation
- `_shared/communication-utils.ts` — `sendWhatsAppMessage()` using Meta Graph API
- `whatsapp_messages`, `whatsapp_conversations`, `whatsapp_business_accounts` tables exist
- `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` env vars used

### Existing SMS Infrastructure
- `send-sms` edge function using Twilio (direct API, not connector gateway)
- `send-approval-sms` and `send-booking-sms-reminder` functions
- `sms_messages` table exists

---

## Gap Analysis: What's Missing

### A. Notifications That Should Exist But Don't

| Event | Email | SMS | WhatsApp | In-App | Current State |
|---|---|---|---|---|---|
| **Application submitted** | `send-application-submitted-email` exists | -- | -- | -- | Edge function exists but not confirmed wired |
| **Application stage change** | -- | -- | -- | Partial (push only) | No email/SMS/WhatsApp sent to candidate |
| **Application rejected** | -- | -- | -- | -- | No notification at all |
| **New job match** | -- | -- | -- | -- | Preference toggle exists, nothing sends |
| **Interview rescheduled** | -- | -- | -- | -- | No notification |
| **Interview cancelled** | -- | -- | -- | -- | No notification |
| **Interview feedback available** | -- | -- | -- | -- | No notification |
| **Strategist assigned** | -- | -- | -- | -- | No notification |
| **Strategist message** | -- | -- | -- | -- | Only in-app toast |
| **Document requested** | -- | -- | -- | -- | No notification |
| **Profile incomplete reminder** | -- | -- | -- | -- | No nudge |
| **Weekly activity digest** | -- | -- | -- | -- | Preference exists, nothing sends |
| **Meeting no-show follow-up** | -- | -- | -- | -- | No candidate notification |
| **Offer deadline approaching** | -- | -- | -- | -- | No reminder |
| **Assessment results ready** | -- | -- | -- | -- | No notification |
| **Referral status update** | -- | -- | -- | -- | No notification |

### B. Bugs in Current Notification System

1. **`useNotificationTriggers` only watches `user_id` for application updates** — misses admin-sourced applications via `candidate_id`
2. **Meeting reminders use `sessionStorage`** — reminder state lost on page refresh or new tab; should use a DB flag
3. **`notification_preferences` table used with `as any` cast** — suggests it may not be in the typed schema
4. **No preference checking before sending** — edge functions send emails regardless of user preferences
5. **SMS functions use direct Twilio API** — should use Twilio connector gateway for consistency

### C. WhatsApp for Candidates — Currently Admin/Booking Only
The WhatsApp infrastructure is fully built but only used for:
- Admin-side conversation management (`WhatsAppInbox`)
- Booking flow (`whatsapp-booking-handler`)
- Agent-triggered messages (`agent-event-processor`)

It is **not** used for proactive candidate notifications (stage changes, reminders, etc.).

---

## Implementation Plan

### Phase 1: Notification Orchestrator + Preference Enforcement
Create a central `send-candidate-notification` edge function that:
- Accepts: `candidateId`, `eventType`, `payload`
- Checks `notification_preferences` for the user
- Routes to appropriate channels (email, SMS, WhatsApp, in-app)
- Respects quiet hours
- Logs all sends to `email_send_log` / `sms_messages` / `whatsapp_messages`

### Phase 2: Add SMS + WhatsApp Toggles to Settings
Extend `NotificationPreferences` component with:
- SMS section: master toggle + per-category (interviews, reminders, offers)
- WhatsApp section: master toggle + per-category
- Phone number verification requirement for SMS/WhatsApp
- Add columns to `notification_preferences` table: `sms_enabled`, `sms_interviews`, `sms_reminders`, `whatsapp_enabled`, `whatsapp_interviews`, `whatsapp_reminders`, `whatsapp_stage_updates`

### Phase 3: Wire Up Missing Candidate Notifications (Priority Order)

**Must-have (immediate engagement impact):**
1. Application stage change → Email + optional WhatsApp/SMS
2. Interview scheduled/rescheduled/cancelled → Email + SMS + WhatsApp
3. New job match → Email (digest-compatible) + optional WhatsApp
4. Strategist assigned → Email + in-app
5. Offer received → Already exists, add SMS + WhatsApp channel
6. Weekly activity digest → Email (cron-driven)

**Should-have (retention):**
7. Profile incomplete nudge → Email (3 days after signup, then weekly)
8. Interview feedback available → Email + in-app
9. Assessment results ready → Email + in-app
10. Offer deadline reminder (48h before) → Email + SMS + WhatsApp
11. Meeting no-show follow-up → Email + WhatsApp

**Nice-to-have (delight):**
12. Referral status update → Email + in-app
13. Document requested → Email + WhatsApp
14. Placement anniversary → Email

### Phase 4: Fix Existing Bugs
- Fix `useNotificationTriggers` to use `or(user_id, candidate_id)` filter
- Replace `sessionStorage` meeting reminder tracking with DB-backed `notification_sent_log`
- Ensure all send functions check `notification_preferences` before dispatching

### Phase 5: WhatsApp Template Messages
WhatsApp Business API requires pre-approved templates for outbound messages (outside 24h window). Create templates for:
- Interview reminder (24h before)
- Application stage update
- Offer notification
- Weekly digest summary
- Profile completion nudge

---

## Database Changes Required

```sql
-- Add SMS + WhatsApp columns to notification_preferences
ALTER TABLE notification_preferences
  ADD COLUMN sms_enabled boolean DEFAULT false,
  ADD COLUMN sms_interviews boolean DEFAULT true,
  ADD COLUMN sms_reminders boolean DEFAULT true,
  ADD COLUMN sms_offers boolean DEFAULT true,
  ADD COLUMN whatsapp_enabled boolean DEFAULT false,
  ADD COLUMN whatsapp_interviews boolean DEFAULT true,
  ADD COLUMN whatsapp_reminders boolean DEFAULT true,
  ADD COLUMN whatsapp_stage_updates boolean DEFAULT true,
  ADD COLUMN whatsapp_job_matches boolean DEFAULT false,
  ADD COLUMN preferred_channel text DEFAULT 'email';

-- Track which notifications have been sent (replaces sessionStorage)
CREATE TABLE notification_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  event_id text NOT NULL,
  channel text NOT NULL, -- 'email', 'sms', 'whatsapp', 'inapp', 'push'
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, event_type, event_id, channel)
);
```

## Files to Create/Modify

| File | Action |
|---|---|
| `supabase/functions/send-candidate-notification/index.ts` | **CREATE** — Central orchestrator |
| `src/components/settings/NotificationPreferences.tsx` | **EDIT** — Add SMS + WhatsApp sections |
| `src/hooks/useNotificationTriggers.ts` | **EDIT** — Fix `candidate_id` filter, use DB for dedup |
| `supabase/functions/send-stage-change-notification/index.ts` | **CREATE** — Application stage change emails |
| `supabase/functions/send-job-match-notification/index.ts` | **CREATE** — Job match notifications |
| `supabase/functions/send-weekly-digest/index.ts` | **CREATE** — Weekly candidate digest |
| `supabase/functions/send-profile-nudge/index.ts` | **CREATE** — Profile completion reminder |
| `supabase/functions/send-interview-cancelled-email/index.ts` | **CREATE** |
| `supabase/functions/send-offer-deadline-reminder/index.ts` | **CREATE** |
| DB migration | Add SMS/WhatsApp columns + `notification_delivery_log` table |

This is a large multi-phase effort. I recommend starting with **Phase 1 + 2** (orchestrator + settings UI) followed by **Phase 3 items 1-6** (the must-have notifications), then iterating on the rest.
