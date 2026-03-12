

# Full Email Audit — All Notification Flows

## Test Email Sent
A partner welcome email was sent to **dario@thequantumclub.nl** — check your inbox. It simulates what a partner sees when approved, including the magic link CTA, onboarding checklist, and strategist info.

---

## Email Inventory by Trigger

### Partner Lifecycle (4 emails)

| # | Trigger | Edge Function | Sender | Status |
|---|---------|--------------|--------|--------|
| 1 | Partner submits funnel brief | `send-partner-request-received` | `partners@` | OK |
| 2 | Admin approves partner | `send-partner-welcome-email` (called by `approve-partner-request`) | `partners@` | OK (just fixed) |
| 3 | Admin declines partner | `send-partner-declined-email` | `partners@` | OK |
| 4 | Admin notifies partner (generic) | `send-approval-notification` → delegates to #2 or #3 | `partners@` | OK |

### Candidate/Member Lifecycle (3 emails)

| # | Trigger | Edge Function | Sender | Status |
|---|---------|--------------|--------|--------|
| 5 | Admin approves candidate | `send-approval-notification` | `notifications@` | **BUG** (see below) |
| 6 | Admin declines candidate | `send-approval-notification` | `notifications@` | OK |
| 7 | Admin approves via ApplicationHub | `approve-member-application` | none | **BUG** — no email sent at all |

### Funnel Recovery (2 emails)

| # | Trigger | Edge Function | Status |
|---|---------|--------------|--------|
| 8 | 2h after abandoned funnel | `process-funnel-reminders` → `send-funnel-reminder` | OK (cron) |
| 9 | 24h second touch | `process-funnel-reminders` → `send-funnel-reminder` | OK (cron) |

### Booking/Meeting Emails (5+ emails)

| # | Trigger | Edge Function | Status |
|---|---------|--------------|--------|
| 10 | Booking confirmed | `send-booking-confirmation` | OK |
| 11 | Booking reminder | `send-booking-reminder-email` | OK |
| 12 | Booking cancelled | `cancel-booking` (inline) | OK |
| 13 | Booking rescheduled | `handle-booking-reschedule` (inline) | OK |
| 14 | Booking rejected | `approve-booking` (inline) | OK |

### Other Transactional Emails

| # | Trigger | Edge Function | Status |
|---|---------|--------------|--------|
| 15 | Password reset | `send-password-reset-email` | OK |
| 16 | Meeting invitation | `send-meeting-invitation-email` | OK |
| 17 | Meeting summary | `send-meeting-summary-email` | OK |
| 18 | Referral invite | `send-referral-invite` | OK |
| 19 | Placement congratulations | `send-placement-congratulations-email` | OK |
| 20 | Team invite | `send-team-invite` | OK |
| 21 | Interview scheduled | `send-interview-scheduled-email` | OK |
| 22 | Offer notification | `send-offer-notification-email` | OK |
| 23 | Feedback response | `send-feedback-response` | OK |
| 24 | Notification email (generic) | `send-notification-email` | OK |
| 25 | Admin notification (partner request) | `notify-admin-partner-request` | OK |

---

## Bugs Found

### BUG 1 — MEDIUM: Candidate approval email has emoji in subject line
**File:** `supabase/functions/send-approval-notification/index.ts` line 125
**Issue:** Subject is `'🎉 Welcome to The Quantum Club!'` — violates email deliverability standards (no emojis in subject lines per project conventions).
**Fix:** Change to `'Welcome to The Quantum Club'`

### BUG 2 — MEDIUM: Candidate approval email missing plain-text fallback
**File:** `supabase/functions/send-approval-notification/index.ts` line 219-224
**Issue:** The Resend API call sends `html` but no `text` field. All other email functions include `text: htmlToPlainText(htmlContent)`. Missing plain-text fallback hurts deliverability (spam filters penalize HTML-only).
**Fix:** Add `text: htmlToPlainText(htmlContent)` to the Resend payload. Also add `headers: getEmailHeaders()` for List-Unsubscribe compliance.

### BUG 3 — LOW: `approve-member-application` sends no email
**File:** `supabase/functions/approve-member-application/index.ts`
**Issue:** This function (used by `AdminApplicationHub`) creates the auth user, profile, and role — but sends NO email. The caller in `AdminApplicationHub.tsx` doesn't invoke `send-approval-notification` either. However, `AdminMemberRequests.tsx` does send the email separately, so this only affects the ApplicationHub path.
**Impact:** If candidates are approved via the ApplicationHub, they get no notification. This may be intentional (the ApplicationHub is a different workflow), but worth confirming.

### BUG 4 — MEDIUM: CORS headers incomplete on `send-approval-notification`
**File:** `supabase/functions/send-approval-notification/index.ts` line 13-15
**Issue:** CORS headers are missing the platform/runtime headers that all other functions include. This could cause 400 errors when called from the frontend.
**Fix:** Update to include `x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version`.

---

## Proposed Fixes

### File: `supabase/functions/send-approval-notification/index.ts`

1. **Line 14** — Fix CORS headers to include platform/runtime headers
2. **Line 125** — Remove emoji from subject: `'Welcome to The Quantum Club'`
3. **Lines 219-224** — Add `text` and `headers` to Resend payload:
   ```typescript
   body: JSON.stringify({
     from: EMAIL_SENDERS.notifications,
     to: [email],
     subject: subject,
     html: htmlContent,
     text: htmlToPlainText(htmlContent),
     headers: getEmailHeaders(),
   }),
   ```

All 3 changes are in one file. No frontend changes needed. The partner flow is now correct after the previous fix.

