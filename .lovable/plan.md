

# Ruthless Email System Audit -- Revised Score: 22/100

The previous plan was generous to the point of dishonesty. Here is a no-mercy reassessment, followed by the real path to 100.

---

## Why the Previous Score of 38 Was Too Kind

The prior audit counted emails that "use baseEmailTemplate" as being mostly fine (60-72 range). That ignored fundamental problems:

1. **Using the template wrapper does not mean the email is good.** Several functions pass raw inline HTML as `content` into `baseEmailTemplate` instead of using the component system. That is almost as bad as not using the template at all -- the internal markup is still fragile, untested, and inconsistent.

2. **The audit missed an entire file.** `_shared/email-notification-templates.ts` contains 3+ hardcoded sender addresses using `.com` instead of `.nl`, a completely separate HTML template system that bypasses everything, and wrong app URLs (`app.thequantumclub.com` instead of `os.thequantumclub.com`).

3. **"Darryl" is hardcoded in 3 places.** Not just approval emails -- it is in `send-application-submitted-email` ("Darryl will review") and `send-approval-notification` ("Darryl will contact you within 19 minutes"). This is a single-person dependency burned into production emails.

4. **No partner-specific emails exist at all.** Partners receive candidate emails. This is not a "gap" -- it is a broken experience for paying clients.

5. **The plan suggested 7 phases.** That is 7 sprints of work with no priority clarity. A real plan has 3 phases max.

---

## Itemized Failures

### CRITICAL (blocks revenue or breaks trust)

| Issue | Severity | Where |
|-------|----------|-------|
| Partners get candidate emails (wrong persona, wrong CTAs, wrong next steps) | CRITICAL | `send-approval-notification`, `approve-partner-request`, `provision-partner` |
| `approve-booking` rejection sends from `.com` domain -- will fail SPF/DKIM and land in spam | CRITICAL | `approve-booking/index.ts:256` |
| `_shared/email-notification-templates.ts` has 3 hardcoded `.com` senders (`notifications@thequantumclub.com`) | CRITICAL | Lines 336, 380, 424 |
| `send-recovery-email` does not send email at all -- it just logs | CRITICAL | `send-recovery-email/index.ts` |
| `send-note-mention-notification` hardcodes `app.thequantumclub.com` (wrong domain) | CRITICAL | Line 172 |
| `email-notification-templates.ts` uses `app.thequantumclub.com` links (wrong domain, separate template system) | CRITICAL | Lines 160, 216 |

### HIGH (brand damage, inconsistency)

| Issue | Severity | Where |
|-------|----------|-------|
| `send-application-submitted-email` uses dark theme (`#0E0E10` bg) -- every other email is white/light | HIGH | Entire function |
| `send-team-invite` uses dark theme with custom gradient button -- completely off-brand | HIGH | Entire function |
| `invite-external-interviewer` uses dark theme with custom inline HTML | HIGH | Entire function |
| `approve-booking` rejection is 5 lines of raw unstyled HTML | HIGH | Lines 259-264 |
| Year hardcoded to 2025 in `send-application-submitted-email` | HIGH | Line 163 |
| "Darryl" hardcoded as the contact person in 3 email functions | HIGH | `send-application-submitted-email:120`, `send-approval-notification:83,88` |
| `send-team-invite` hardcodes `noreply@thequantumclub.nl` instead of using `EMAIL_SENDERS` | HIGH | Line 150 |
| `handle-time-proposal` passes raw inline HTML as `content` (no components) | HIGH | All 3 email blocks |
| `guest-booking-actions` passes raw inline HTML as `content` (no components) | HIGH | All email blocks |

### MEDIUM (maintenance debt, CRO loss)

| Issue | Severity | Where |
|-------|----------|-------|
| No `List-Unsubscribe` header on non-transactional emails (referral invites, team invites) | MEDIUM | Multiple functions |
| Footer links go to `/settings/notifications` and `/privacy` -- are these routes even built? | MEDIUM | `base-template.ts:231-235` |
| No preheader text on most emails that pass raw HTML content | MEDIUM | `handle-time-proposal`, `guest-booking-actions`, etc. |
| `send-booking-sms-reminder` uses fallback URL `https://thequantumclub.com` (wrong domain) | MEDIUM | Line 94 |
| `send-booking-confirmation` ICS UID uses `@thequantumclub.com` (should be `.nl` or `.com` consistently) | MEDIUM | Line 156 |
| `EMAIL_SENDERS` has no `partners` key -- partner emails use `notifications` sender | MEDIUM | `email-config.ts` |
| Copyright year in `base-template.ts` is dynamic but hardcoded in `send-application-submitted-email` | MEDIUM | Line 163 |

### LOW (polish)

| Issue | Severity | Where |
|-------|----------|-------|
| Subject line emoji usage is inconsistent (some use them, some don't) | LOW | Various |
| No A/B test infrastructure for subject lines | LOW | None |
| No open/click tracking via Resend webhooks (webhook function exists but not wired) | LOW | `resend-webhook` |
| `TAGLINE` in `email-config.ts` says "Exclusive Talent Network" but `send-team-invite` says "Elite Talent Network" | LOW | Line 139 |

---

## Revised Scoring Breakdown

| Category | Weight | Current Score | Notes |
|----------|--------|---------------|-------|
| Brand consistency (all emails look/feel the same) | 25% | 4/25 | 5 functions use completely different HTML; 2 separate template systems exist |
| Sender/domain correctness (SPF/DKIM will pass) | 20% | 6/20 | 4+ hardcoded `.com` senders will fail; 1 hardcoded `noreply@` |
| Persona accuracy (right email for right audience) | 20% | 2/20 | Partners get candidate emails; no partner-specific templates |
| Content quality (dynamic data, no hardcoded names) | 15% | 4/15 | "Darryl" x3; "2025" x1; wrong domains in links |
| CRO/deliverability (preheaders, unsubscribe, tracking) | 10% | 4/10 | Base template has preheader support but most raw-HTML emails skip it |
| Completeness (all events have emails) | 10% | 2/10 | `send-recovery-email` is a no-op; no interview-scheduled, offer, placement emails |
| **TOTAL** | **100%** | **22/100** | |

---

## The Real Plan to 100/100

### Phase 1: Stop the Bleeding (score: 22 to 55)

**Goal: Every email that goes out RIGHT NOW is on-brand, from the right domain, and goes to the right persona.**

#### 1A. Fix sender domains (1 file + 4 function patches)

- `email-config.ts`: Add `partners: 'The Quantum Club <partners@thequantumclub.nl>'`
- `approve-booking/index.ts:256`: Replace hardcoded `bookings@thequantumclub.com` with `EMAIL_SENDERS.bookings`
- `_shared/email-notification-templates.ts:336,380,424`: Replace all 3 hardcoded `notifications@thequantumclub.com` with `EMAIL_SENDERS.notifications`
- `send-team-invite/index.ts:150`: Replace hardcoded `noreply@thequantumclub.nl` with `EMAIL_SENDERS.system`

#### 1B. Unify rogue templates (5 functions rewritten)

Rewrite these to use `baseEmailTemplate` + component system:

1. `send-application-submitted-email` -- replace 115 lines of custom dark HTML with ~30 lines of components
2. `send-team-invite` -- replace custom dark HTML with components
3. `approve-booking` (rejection branch) -- replace 5 raw HTML lines with components
4. `invite-external-interviewer` -- replace custom dark HTML with components
5. `_shared/email-notification-templates.ts` -- delete or refactor to use `baseEmailTemplate`; fix all `app.thequantumclub.com` URLs

#### 1C. Fix hardcoded content

- Replace all "Darryl" references with dynamic strategist name from `profiles.full_name` via `assigned_strategist_id`
- Replace hardcoded `2025` with `new Date().getFullYear()`
- Fix `send-note-mention-notification` URL from `app.thequantumclub.com` to use `getEmailAppUrl()`
- Fix `send-booking-sms-reminder` fallback URL

#### 1D. Use components for inline HTML content

- `handle-time-proposal`: Replace all 3 raw HTML email blocks with `StatusBadge`, `Heading`, `Paragraph`, `Card`, `InfoRow` components
- `guest-booking-actions`: Same treatment for all email blocks

### Phase 2: Partner Lifecycle (score: 55 to 80)

**Goal: Partners get their own dedicated email experience, distinct from candidates.**

#### 2A. Create 3 new partner email templates

1. **`send-partner-welcome-email`** (new function)
   - Triggered by `provision-partner` and `approve-partner-request` instead of current generic welcome
   - Content: company dashboard link, team invite CTA, assigned strategist intro, onboarding checklist
   - Sender: `EMAIL_SENDERS.partners`

2. **`send-partner-request-received`** (new function)
   - Triggered when partner submits request via the partner funnel
   - Content: "We received your request, here is what happens next, expected response time"
   - Sender: `EMAIL_SENDERS.partners`

3. **`send-partner-declined-email`** (new function)
   - Triggered when admin declines a partner request
   - Content: Partner-specific decline with feedback about hiring needs mismatch (not career advice like candidates get)
   - Sender: `EMAIL_SENDERS.partners`

#### 2B. Wire partner emails into existing flows

- `provision-partner/index.ts` Step 10: Call `send-partner-welcome-email` instead of inline email construction
- `approve-partner-request/index.ts` Step 10: Same
- `send-approval-notification`: Add guard -- if `requestType === 'partner'`, redirect to partner-specific function or use partner-specific content branch with company-oriented messaging

#### 2C. Implement `send-recovery-email`

- Actually send the email via Resend using `baseEmailTemplate`
- Include session recovery link and funnel step context

### Phase 3: CRO and Completeness (score: 80 to 100)

**Goal: Every email has optimal deliverability, tracking, and the full lifecycle is covered.**

#### 3A. Deliverability

- Add `List-Unsubscribe` header to non-transactional emails (`send-referral-invite`, `send-team-invite`)
- Add `List-Unsubscribe-Post` for one-click unsubscribe (RFC 8058)
- Verify footer links (`/settings/notifications`, `/privacy`) actually resolve to real routes
- Standardize subject line format: no emoji on transactional, optional on marketing

#### 3B. Missing lifecycle emails (4 new functions)

1. `send-interview-scheduled-email` -- date/time, interviewer info, prep tips via `MeetingPrepCard`
2. `send-offer-notification-email` -- offer details, decision timer, QUIN comparison tool link
3. `send-placement-congratulations-email` -- celebration, day-1 checklist, invoice trigger to partner
4. `send-candidate-welcome-email` -- post-onboarding-complete email with next steps (distinct from approval email)

#### 3C. Tracking and analytics

- Wire `resend-webhook` to log open/click events per email
- Add UTM parameters to all CTA links (`utm_source=email&utm_medium=transactional&utm_campaign={template_name}`)
- Build admin email preview that renders every template with sample data (expand `send-test-email` to cover all templates)

#### 3D. Quality gates

- Test all emails in Gmail, Outlook desktop, Outlook web, Apple Mail, and mobile Gmail
- Verify dark mode rendering (the `base-template.ts` media query is already there but untested with the new GIF)
- Ensure all emails score >90 on mail-tester.com (SPF, DKIM, DMARC, content)

---

## Summary of Deliverables

| Phase | Functions Modified | Functions Created | Lines Changed (est.) | Score After |
|-------|-------------------|-------------------|---------------------|-------------|
| 1 | 9 | 0 | ~600 | 55 |
| 2 | 3 | 3 | ~400 | 80 |
| 3 | 2 | 4 | ~500 | 100 |
| **Total** | **14** | **7** | **~1,500** | **100** |

---

## Recommended Start

Phase 1 first -- it fixes emails that are going out broken RIGHT NOW. Every email sent today with a `.com` sender domain risks landing in spam. Every partner onboarded today gets a candidate email. These are active problems, not future improvements.
