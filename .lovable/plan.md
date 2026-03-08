# Live Meetings Audit — Implementation Plan

## Current Score: 58/100 (Phase 1 complete)

---

## Completed — Phase 1: Critical Fixes ✅ (34 → 58)

- Re-enabled desktop ControlsPanel (removed `false &&` gate)
- Removed duplicate LiveInterviewAnalysis render
## CATEGORY 1: Deliverability Issues (Score Impact)

### 1.1 Missing `List-Unsubscribe` Headers (28 of 31 email functions)

Only **3** email functions include `List-Unsubscribe` headers:
- `send-candidate-welcome-email` (recently added)
- `send-team-invite`
- `send-referral-invite`

**Missing from all others**, including:
- `send-placement-congratulations-email`
- `send-interview-scheduled-email`
- `send-offer-notification-email`
- `send-application-submitted-email`
- `send-partner-welcome-email`
- `send-partner-declined-email`
- `send-recovery-email`
- `send-notification-email`
- `send-meeting-summary-email`
- `send-booking-confirmation`
- `send-booking-reminder`
- `send-security-alert`
- `send-password-reset-email`
- `send-booking-pending-notification`
- `guest-booking-actions` (4 send calls)
- `send-partner-request-received`
- `notify-admin-partner-request`
- `send-scorecard-reminder`
- `send-booking-reminder-email`
- `_shared/email-notification-templates.ts` (3 send functions)

**Fix**: Create a shared helper function `buildResendHeaders()` in `email-config.ts` that returns the `List-Unsubscribe` and `List-Unsubscribe-Post` headers. Update ALL email functions to use it.

### 1.2 Missing Plain-Text Fallback (29 of 31 functions)

Only the `email-notification-templates.ts` (mention + interview reminder) includes a `text:` property. Every other email sends HTML-only. Many spam filters penalize HTML-only emails.

**Fix**: Add a shared `stripHtmlToText()` utility in `email-config.ts` that strips HTML tags to produce a basic plain-text version. Include `text:` in every Resend API call.

### 1.3 Emoji in Subject Lines (6 functions)

SpamAssassin flags emoji in subject lines (`SUBJ_EMOJI_FREEMAIL`). Found in:
- `send-password-reset-email`: "🔐 Reset Your Password"
- `send-meeting-summary-email`: "📊 Meeting Summary"
- `send-booking-confirmation`: "✓ Confirmed", "📅 New Booking", "📅 invited you"
- `send-booking-reminder`: "🔔 Reminder"
- `send-security-alert`: emoji prefix

**Fix**: Remove emoji from subject lines. Move visual indicators to the email body (already using `StatusBadge` components).

### 1.4 SPF Record Missing (DNS — not code)

`send.thequantumclub.nl` needs an SPF TXT record:
```text
v=spf1 include:amazonses.com ~all
```
This is a DNS change in the domain registrar.

---

## CATEGORY 2: Content & Copy Quality

### 2.1 Inconsistent Tone

Some emails use exclamation points (referral invite: "thinks you'd be perfect for this role!") which violates the brand guideline: "Avoid exclamation points."

**Fix**: Remove exclamation points from:
- `send-referral-invite`: heading and subject line
- Any other instances

### 2.2 Hardcoded Contact Email Inconsistency

- `send-application-submitted-email` references `onboarding@verify.thequantumclub.nl` — a non-standard subdomain
- `send-partner-welcome-email` references `partners@thequantumclub.nl` directly
- Footer uses `SUPPORT_EMAIL` (`support@thequantumclub.nl`)

**Fix**: Use `SUPPORT_EMAIL` from `email-config.ts` consistently, or add the specialized addresses to `EMAIL_SENDERS` for consistency.

### 2.3 Missing "Powered by QUIN" Attribution

Per brand guidelines: "Default to 'Powered by QUIN' helper text where AI appears." The `send-offer-notification-email` references the "QUIN offer comparison tool" but doesn't include the attribution. Similarly, match emails should include it.

**Fix**: Add a subtle "Powered by QUIN" line where AI features are referenced.

---

## CATEGORY 3: Technical & Security Issues

### 3.1 `rgba()` in Inline Styles (Outlook Rendering)

Multiple components use `rgba()` for background colors (`Card`, `StatusBadge`, `VideoCallCard`, `AlertBox`, `MeetingPrepCard`). Outlook desktop strips `rgba()` and renders transparent/white instead.

**Fix**: Replace all `rgba()` values with solid hex equivalents in the components:
- `rgba(201, 162, 78, 0.06)` → `#faf6ed`
- `rgba(245, 158, 11, 0.06)` → `#fef9ec`
- `rgba(34, 197, 94, 0.06)` → `#edfdf3`
- `rgba(201, 162, 78, 0.08)` → `#f9f4e9`
- `rgba(201, 162, 78, 0.1)` → `#f7f1e5`
- `rgba(34, 197, 94, 0.1)` → `#e9faf0`
- `rgba(245, 158, 11, 0.1)` → `#fef7e6`
- `rgba(239, 68, 68, 0.1)` → `#fdeaea`
- `rgba(59, 130, 246, 0.08)` → `#eef3fe`
- `rgba(255, 255, 255, 0.05)` → `#1d1d1f` (dark mode card)
- `rgba(255, 255, 255, 0.1)` → `#303032` (dark mode)

### 3.2 `linear-gradient()` in Inline Styles

`VideoCallCard` uses `linear-gradient()` which is unsupported in most email clients. The fallback text block in the header also uses it.

**Fix**: Replace gradients with solid background colors.

### 3.3 CSS `box-shadow` in Inline Styles

`box-shadow` on the email container and buttons is ignored by most email clients but doesn't cause harm. Low priority — leave as progressive enhancement.

### 3.4 `<ul>` Tag Usage

`MeetingPrepCard` uses `<ul>` with `<li>` elements. Some email clients strip list styling. Other components correctly use `<table>` layouts.

**Fix**: Replace `<ul>/<li>` with table-based rows matching the pattern used in other components.

---

## CATEGORY 4: Accessibility & Compliance

### 4.1 Missing `lang` Attribute on Content

The `<html lang="en">` is set correctly. Good.

### 4.2 Missing `role="presentation"` on Some Tables

Most tables correctly use `role="presentation"`. The `CalendarButtons` component has a table missing this attribute (the outer wrapper). Minor.

### 4.3 Preheader Padding Technique

The current preheader uses `&nbsp;&zwnj;` padding which is correct and well-implemented.

### 4.4 Missing Physical Mailing Address

CAN-SPAM requires a physical postal address in commercial emails. The footer includes company name, links, and copyright but no address.

**Fix**: Add a physical address line to the `baseEmailTemplate` footer (e.g., "Amsterdam, The Netherlands" or the registered business address).

---

## CATEGORY 5: Structural Improvements

### 5.1 Centralize Unsubscribe Headers

Create a shared function to avoid repeating header construction in 30+ files:

```typescript
// In email-config.ts
export const getEmailHeaders = (): Record<string, string> => {
  const appUrl = getEmailAppUrl();
  return {
    'List-Unsubscribe': `<${appUrl}/settings/notifications>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
};
```

### 5.2 Centralize Plain-Text Generation

```typescript
export const htmlToPlainText = (html: string): string => {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>[^<]*<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&zwnj;/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
```

---

## Implementation Priority

### Phase 1 — High Impact (deliverability score)
1. Add `getEmailHeaders()` helper to `email-config.ts`
2. Add `htmlToPlainText()` helper to `email-config.ts`
3. Update ALL 28+ email functions to include `headers` and `text` in Resend calls
4. Remove emoji from subject lines (6 functions)

### Phase 2 — Rendering Fixes
5. Replace all `rgba()` with solid hex in `components.ts`
6. Replace `linear-gradient()` with solid colors in `components.ts` and `base-template.ts`
7. Replace `<ul>/<li>` with table layout in `MeetingPrepCard`

### Phase 3 — Compliance & Copy
8. Add physical address to footer in `base-template.ts`
9. Fix tone (remove exclamation points)
10. Standardize contact email references
11. Add "Powered by QUIN" where AI features are referenced

### Phase 4 — DNS (manual, not code)
12. Add SPF record for `send.thequantumclub.nl`

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/_shared/email-config.ts` | Add `getEmailHeaders()`, `htmlToPlainText()` |
| `supabase/functions/_shared/email-templates/components.ts` | Replace `rgba()` with hex; fix `linear-gradient()`; fix `<ul>` in MeetingPrepCard |
| `supabase/functions/_shared/email-templates/base-template.ts` | Add physical address to footer; fix gradient fallback |
| `supabase/functions/_shared/email-notification-templates.ts` | Add headers to 3 send functions |
| `send-placement-congratulations-email/index.ts` | Add headers + text |
| `send-interview-scheduled-email/index.ts` | Add headers + text |
| `send-offer-notification-email/index.ts` | Add headers + text |
| `send-application-submitted-email/index.ts` | Add headers + text; fix contact email |
| `send-partner-welcome-email/index.ts` | Add headers + text |
| `send-partner-declined-email/index.ts` | Add headers + text |
| `send-recovery-email/index.ts` | Add headers + text |
| `send-notification-email/index.ts` | Add headers + text |
| `send-meeting-summary-email/index.ts` | Add headers + text; remove emoji from subject |
| `send-booking-confirmation/index.ts` | Add headers + text; remove emoji from subjects |
| `send-booking-reminder/index.ts` | Add headers + text; remove emoji from subject |
| `send-security-alert/index.ts` | Add headers + text; remove emoji from subject |
| `send-password-reset-email/index.ts` | Add headers + text; remove emoji from subject |
| `send-booking-pending-notification/index.ts` | Add headers + text |
| `send-booking-reminder-email/index.ts` | Add headers + text |
| `guest-booking-actions/index.ts` | Add headers + text (4 send calls) |
| `send-partner-request-received/index.ts` | Add headers + text |
| `notify-admin-partner-request/index.ts` | Add headers + text |
| `send-referral-invite/index.ts` | Fix exclamation points in copy |
| `send-candidate-welcome-email/index.ts` | Add text fallback |

**Total: ~25 files modified**

This will be implemented in phases. After Phase 1, send another test email to mail-tester to verify score improvement.

