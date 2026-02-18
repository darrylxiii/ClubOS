

# Booking System Upgrade -- Beating Calendly (Revised Audit)

## Revised Score: 68/100

After deep-diving into the codebase, the backend is significantly more capable than initially visible. Tables for `booking_reminders`, `booking_workflows`, `booking_waitlist`, `booking_time_proposals`, `booking_no_show_predictions`, `booking_slot_analytics`, and `booking_funnel_analytics` already exist. Edge functions for reminders, recurring bookings, approval flows, and team balancing are deployed. The `booking_links` table already has `confirmation_message`, `redirect_url`, `routing_rules`, and `recurrence_rule` columns. The `bookings` table has `recurrence_parent_id`, `recurrence_rule`, `recurrence_index`.

**The primary gap is frontend -- these backend capabilities are not surfaced in the UI.**

---

## Revised Scoring

| Category | Score | Max | What exists | What's missing |
|---|---|---|---|---|
| Core Booking Flow | 9 | 10 | 3-step flow, Zod validation, slot verification, confetti, analytics tracking | Progress stepper UI |
| Calendar & Availability | 8 | 10 | Month heatmap, dual timezone, availability legend, realtime slot updates | Per-day-of-week hours UI, date override UI |
| Timezone Handling | 9 | 10 | Auto-detect, dual display, warnings, format toggle (12h/24h) | -- |
| Scheduling Types | 7 | 10 | Individual, Round Robin, Collective in DB + team balancing edge function | Routing forms UI, sequential scheduling |
| Guest Experience | 8 | 10 | Cancel, reschedule, propose times, add guests, permissions, guest portal | Embed widget |
| Reminders & Notifications | 6 | 10 | `booking_reminders` table, `process-booking-reminders` + `send-booking-reminder-email` + `send-booking-sms-reminder` edge functions, SMS opt-in | Workflow builder UI, reminder config UI per link |
| Analytics | 8 | 10 | Conversion funnel, slot analytics, no-show prediction, domain risk analysis | UTM tracking |
| Integrations | 6 | 10 | Google Calendar, Google Meet, Quantum Meetings, Microsoft Calendar auth functions | Zoom, Stripe payments |
| Team Features | 6 | 10 | Round robin, team load dashboard, team member assignment | Collective availability overlay UI |
| Embeddability | 0 | 5 | Nothing | Embed snippet generator |
| Waitlist | 5 | 5 | Waitlist form + auto-promotion -- complete | -- |
| Recurring/Multi | 3 | 5 | `create-recurring-bookings` edge function, recurrence fields on bookings table | Frontend toggle to expose it during booking |
| Payments | 0 | 5 | Nothing | Stripe integration |
| Branding/Customization | 5 | 10 | Color theming, host avatar, confirmation_message + redirect_url columns in DB, "Powered by TQC" | Custom logo upload UI, custom confirmation message UI, redirect URL UI |
| Workflows/Automation | 3 | 10 | `booking_workflows` table exists with workflow_type, email/sms templates | Workflow builder UI, webhook action support |
| Accessibility | 2 | 5 | Basic keyboard nav | ARIA labels on slots, focus management, screen reader announcements |
| AI Differentiators | 7 | 10 | AI booking assistant, voice booking, no-show prediction, meeting polls, interview prep | Smart slot recommendations |
| Security | 5 | 5 | reCAPTCHA, access tokens, rate limit handling | -- |

---

## Plan to reach 100/100 (Prioritized)

### Phase 1: Surface Existing Backend (68 to 80) -- Quick Wins

These features already work in the backend. We just need UI.

**1. Progress Stepper (+1)**
- New component: `src/components/booking/BookingProgressStepper.tsx`
- 3 dots/labels: Select Time > Your Details > Confirmed
- Add to `BookingPage.tsx` above the card content

**2. Recurring Booking Toggle (+2)**
- New component: `src/components/booking/RecurringBookingToggle.tsx`
- Checkbox + frequency selector (weekly/biweekly/monthly) in the BookingForm
- Calls existing `create-recurring-bookings` edge function on submission
- Modify `BookingForm.tsx` to include the toggle and pass recurrence data

**3. Branding & Customization UI (+3, respecting your constraint)**
- Add to the booking link create/edit dialog in `Scheduling.tsx` and `BookingManagement.tsx`:
  - Custom confirmation message (textarea, maps to existing `confirmation_message` column)
  - Redirect URL after booking (input, maps to existing `redirect_url` column)
  - Custom logo upload (image upload component, new `custom_logo_url` column on `booking_links`)
- "Powered by The Quantum Club" stays permanently -- never removable
- The custom logo appears alongside TQC branding, not replacing it

**4. Workflow Builder UI (+3)**
- New component: `src/components/booking/BookingWorkflowBuilder.tsx`
- Simple card-based UI showing active workflows per booking link
- CRUD on `booking_workflows` table (already exists with `workflow_type`, `email_template`, `sms_template`, `trigger_minutes`)
- Add a "Workflows" tab to the Scheduling page
- Predefined workflow types: pre-meeting email, post-meeting follow-up, reminder customization, webhook

**5. Reminder Config per Link (+2)**
- In the booking link edit dialog, add reminder interval configuration
- Expose the existing `send_reminders` + `reminder_minutes_before` from `booking_availability_settings`
- Allow per-link override

**6. Per-Day Availability Grid (+1)**
- New component: `src/components/scheduling/WeeklyAvailabilityGrid.tsx`
- Visual Mon-Sun grid with start/end time per day
- Add `day_schedules` JSONB column to `booking_availability_settings` (or create `availability_day_settings` table)
- Renders in `SchedulingSettings.tsx` replacing the single start/end time inputs

### Phase 2: New Capabilities (80 to 92)

**7. Embed Widget (+5)**
- New component: `src/components/booking/EmbedCodeGenerator.tsx`
- Generates 3 embed modes: inline iframe, popup button, floating badge
- Renders copyable HTML/JS snippet
- Add "Embed" tab to the Scheduling page
- Add CSP/X-Frame-Options headers to allow embedding of `/book/*` routes

**8. Payments Integration (+3)**
- New column on `booking_links`: `payment_amount`, `payment_currency`, `payment_required`
- New component: `src/components/booking/PaymentStep.tsx`
- Stripe Checkout redirect before booking confirmation
- New edge function: `process-booking-payment` to create Stripe checkout session
- Refund on cancellation (configurable)

**9. Routing Forms (+2)**
- New component: `src/components/booking/RoutingFormBuilder.tsx` (admin)
- New component: `src/components/booking/RoutingFormRenderer.tsx` (guest-facing)
- Uses existing `routing_rules` JSONB column on `booking_links`
- 2-3 qualifying questions before showing calendar, routing to different links/team members

**10. Date Override Manager (+2)**
- New component: `src/components/scheduling/DateOverrideManager.tsx`
- Mark specific dates as unavailable (holidays, vacation) or set custom hours
- New table: `availability_date_overrides` (user_id, date, is_available, start_time, end_time)
- Renders in SchedulingSettings

### Phase 3: Elite Polish (92 to 100)

**11. Smart Slot Recommendations (+2)**
- New component: `src/components/booking/SmartSlotRecommendation.tsx`
- Query `booking_slot_analytics` to find historically popular + high-show-rate times
- Show "Recommended" badge on 2-3 optimal slots in `UnifiedDateTimeSelector`
- "Powered by QUIN" label

**12. Accessibility Hardening (+3)**
- Add `aria-label` to every time slot button (e.g., "Book 9:00 AM on Tuesday February 18")
- `aria-live` region for step transitions in BookingPage
- Focus trap in BookingForm step
- Keyboard arrow-key navigation between calendar days
- Modify: `UnifiedDateTimeSelector.tsx`, `BookingPage.tsx`, `BookingForm.tsx`

**13. Mobile Optimization (+1)**
- Bottom-sheet time slot selector on mobile (using existing Vaul drawer)
- Sticky "Confirm" button on mobile form
- Touch-optimized calendar swipe navigation
- Modify: `UnifiedDateTimeSelector.tsx`, `BookingForm.tsx`

**14. Custom Logo Upload (+2)**
- Database: add `custom_logo_url` column to `booking_links`
- In booking link settings: image upload component (reuse existing `ImageUpload`)
- On public booking page (`BookingPage.tsx`): show custom logo above or beside host avatar
- "Powered by The Quantum Club" text and branding remains permanently visible and cannot be toggled off

---

## Technical Summary

### Database changes needed
- Add `custom_logo_url` to `booking_links`
- Add `payment_amount`, `payment_currency`, `payment_required` to `booking_links`
- Add `day_schedules` JSONB to `booking_availability_settings`
- New table: `availability_date_overrides`

### New files to create
- `src/components/booking/BookingProgressStepper.tsx`
- `src/components/booking/RecurringBookingToggle.tsx`
- `src/components/booking/BookingWorkflowBuilder.tsx`
- `src/components/booking/EmbedCodeGenerator.tsx`
- `src/components/booking/PaymentStep.tsx`
- `src/components/booking/RoutingFormBuilder.tsx`
- `src/components/booking/RoutingFormRenderer.tsx`
- `src/components/booking/SmartSlotRecommendation.tsx`
- `src/components/scheduling/WeeklyAvailabilityGrid.tsx`
- `src/components/scheduling/DateOverrideManager.tsx`

### Files to modify
- `src/pages/BookingPage.tsx` -- stepper, routing form pre-step, custom logo display
- `src/pages/Scheduling.tsx` -- embed tab, workflow tab, recurring options
- `src/pages/SchedulingSettings.tsx` -- per-day grid, date overrides
- `src/pages/BookingManagement.tsx` -- custom logo upload, confirmation message, redirect URL in edit dialog
- `src/components/booking/BookingForm.tsx` -- recurring toggle, payment step, a11y
- `src/components/booking/UnifiedDateTimeSelector.tsx` -- smart recommendations, a11y labels, mobile drawer

### Edge functions needed
- `process-booking-payment` (Stripe checkout -- new)
- All other booking edge functions already exist and are deployed

### Implementation priority
1. Progress stepper (instant visual uplift, 30 min)
2. Branding UI -- custom logo, confirmation message, redirect URL (surfaces existing columns, 1-2 hrs)
3. Per-day availability grid + date overrides (most requested, 2-3 hrs)
4. Workflow builder UI (surfaces existing table, 2 hrs)
5. Recurring booking toggle (surfaces existing edge function, 1 hr)
6. Embed widget (growth enabler, 2 hrs)
7. Accessibility hardening (compliance, 2 hrs)
8. Smart slot recommendations (differentiator, 1-2 hrs)
9. Routing forms (competitive feature, 2-3 hrs)
10. Payments (revenue enabler, 3-4 hrs)
11. Mobile optimization (polish, 1-2 hrs)

