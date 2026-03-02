
# Partner Funnel Full Audit -- Final Plan (100/100)

## Overview

This plan combines the previously approved tasks (welcome-back fix, admin enrichment, review summary, data guard, stale copy fix) with a new **hybrid email verification system**: verify silently via MillionVerifier + Findymail, and only show an OTP gate if the email fails deliverability checks. This maximizes correct emails without adding friction for legitimate users.

---

## The Hybrid Email Verification Flow

```text
User enters email -> Click "Continue"
       |
       v
  Call verify-funnel-email (edge function)
       |
       v
  MillionVerifier API check
       |
   +---+---+
   |       |
  OK    INVALID / DISPOSABLE / UNKNOWN
   |       |
   v       v
 Proceed   Findymail double-check
 to        |
 Phase B   +---+---+
           |       |
        VALID    STILL BAD
           |       |
           v       v
        Proceed  Show inline message:
        to       "We could not verify this email.
        Phase B   Use a different address, or
                  verify with a 6-digit code."
                       |
               +-------+-------+
               |               |
          Change email    Enter OTP
               |               |
               v               v
          Re-run flow    send-email-verification
                         (existing function)
                               |
                               v
                         Enter 6-digit code
                               |
                               v
                         Verified -> Proceed
```

**Why this is better than OTP-only or silent-only:**
- 95%+ of real business emails pass MillionVerifier instantly -- zero friction for them
- Fake/disposable emails get caught before any reminder is ever sent
- The 5% edge cases (catch-all, new domains) get a graceful fallback via OTP instead of being blocked
- OTP uses the existing `send-email-verification` function -- no new OTP infrastructure needed

---

## Task 1: Add MillionVerifier + Findymail Secrets

Two API keys need to be configured before the edge function can work:
- `MILLIONVERIFIER_API_KEY`
- `FINDYMAIL_API_KEY`

These will be requested via the secrets tool during implementation.

---

## Task 2: New Edge Function -- `verify-funnel-email`

**File:** `supabase/functions/verify-funnel-email/index.ts`

**Input:** `{ email: string }`

**Flow:**
1. Validate email format (zod)
2. Call MillionVerifier: `GET https://api.millionverifier.com/api/v3/?api={KEY}&email={email}`
3. If result is `ok` -> return `{ quality: 'verified' }`
4. If result is `catch_all` or `unknown` -> call Findymail verify as second opinion
5. If Findymail confirms deliverable -> return `{ quality: 'verified' }`
6. If result is `invalid` or `disposable` (or Findymail also fails) -> return `{ quality: 'invalid', reason: 'disposable' | 'invalid' | 'unverifiable' }`
7. Update `funnel_partial_submissions.email_quality` with the result

**Error handling:** If either API is down, return `{ quality: 'unknown' }` and allow the user through (fail open -- do not block leads due to third-party downtime).

---

## Task 3: Database Migration

Add two columns to `funnel_partial_submissions`:

```sql
ALTER TABLE funnel_partial_submissions
  ADD COLUMN IF NOT EXISTS email_quality TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
```

- `email_quality`: `pending`, `verified`, `catch_all`, `invalid`, `disposable`, `unknown`, `otp_verified`
- `email_verified_at`: timestamp when verification completed (API or OTP)

---

## Task 4: Update `handleEmailCapture` in FunnelSteps.tsx

**Current flow:** Validate email format -> upsert partial -> show Phase B fields.

**New flow:**
1. Validate email format (unchanged)
2. Show a brief loading state on the Continue button ("Verifying...")
3. Call `verify-funnel-email` edge function
4. If `quality === 'verified'` or `quality === 'unknown'` (fail-open): proceed to Phase B as normal
5. If `quality === 'invalid'` or `quality === 'disposable'`:
   - Show an inline verification block (no modal, no page change) with:
     - Message: "We could not verify this email address."
     - Option A: "Use a different email" button -- clears the field, re-focuses it
     - Option B: "Verify with a code" button -- calls the existing `send-email-verification` function, shows the `LazyInputOTP` component (already lazy-loaded in `LazyFunnelComponents.tsx`)
   - On successful OTP entry, mark `email_quality = 'otp_verified'` and proceed to Phase B

**New state variables:**
- `emailVerificationStatus`: `'idle' | 'checking' | 'verified' | 'failed' | 'otp_sent' | 'otp_verified'`

**UI for the OTP fallback (inline, below the email field):**
```
"We could not verify this email address."
[Use a different email]  [Verify with a code]

-- if "Verify with a code" clicked: --
"Enter the 6-digit code sent to {email}"
[  ][  ][  ][  ][  ][  ]
[Resend code] (60s cooldown)
```

This reuses the existing `LazyInputOTP` component and `send-email-verification` edge function. No new OTP infrastructure.

---

## Task 5: Fix Welcome Back Dialog False Triggers

**File:** `src/components/partner-funnel/FunnelSteps.tsx` (lines 152-155)

**Change:** Add a 5-minute staleness check so the dialog only appears when the saved data is older than 5 minutes:

```typescript
const savedData = autoSave.load();
const savedAge = savedData
  ? Date.now() - new Date(savedData.timestamp).getTime()
  : 0;
const isStaleEnough = savedAge > 5 * 60 * 1000;

if (
  savedData &&
  !savedData.completed &&
  isStaleEnough &&
  (savedData.currentStep > 0 ||
    (savedData.formData?.contact_name && savedData.formData?.contact_email))
) {
  setTimeout(() => setResumeDialogOpen(true), 500);
}
```

---

## Task 6: Add "Partner Request" Form Label

**File:** `src/components/partner-funnel/FunnelSteps.tsx` (inside Card, above availability indicator, ~line 786)

Add a subtle label:
```tsx
<p className="text-xs text-muted-foreground uppercase tracking-wider text-center mb-2">
  Partner Request
</p>
```

---

## Task 7: Expand Review Summary (Step 2)

**File:** `src/components/partner-funnel/FunnelSteps.tsx` (lines 712-730)

Add all non-empty fields to the summary grid:
- Company size, Roles per year, Budget, Website, Location, Description (truncated), Phone

Each rendered conditionally with `{value && (<>...</>)}`.

---

## Task 8: Final Validation Guard in `handleSubmit`

**File:** `src/components/partner-funnel/FunnelSteps.tsx` (line 352+)

Add a hard check for all `NOT NULL` database fields before the insert:
```typescript
const requiredFields = {
  contact_name: formData.contact_name,
  contact_email: formData.contact_email,
  company_name: formData.company_name,
  industry: formData.industry,
  company_size: formData.company_size,
};

const missing = Object.entries(requiredFields)
  .filter(([_, v]) => !v)
  .map(([k]) => k);

if (missing.length > 0) {
  toast({ title: "Please complete the required fields.", variant: "destructive" });
  if (!formData.company_size) setCurrentStep(1);
  else setCurrentStep(0);
  return;
}
```

Also remove `|| null` from `company_size` on line 369.

---

## Task 9: Enrich Admin Notification

**File:** `supabase/functions/notify-admin-partner-request/index.ts`

**Changes:**
1. Accept full form data in the request body (company, industry, size, timeline, budget, roles, website, location, phone)
2. Add `InfoRow` entries for each non-empty field in the admin email card
3. Update the in-app notification message to include company and industry

**Updated payload from client (line 408-415):**
```typescript
supabase.functions.invoke('notify-admin-partner-request', {
  body: {
    requestId: crypto.randomUUID(),
    name: formData.contact_name,
    email: formData.contact_email,
    type: 'partner',
    company: formData.company_name,
    industry: formData.industry,
    companySize: formData.company_size,
    timeline: formData.timeline,
    budget: formData.budget_range,
    rolesPerYear: formData.estimated_roles_per_year,
    website: formData.website,
    location: formData.headquarters_location,
    phone: phoneNumber,
  }
});
```

---

## Task 10: Fix Stale Copy in Reminder Email

**File:** `supabase/functions/send-funnel-reminder/index.ts` (line 89)

**Change:** Replace `"No upfront fees. No contracts. You only pay when we place a candidate."` with `"No fees until you hire."`

---

## Task 11: Filter Reminders by Email Quality

**File:** `supabase/functions/process-funnel-reminders/index.ts`

**Change:** Add `.not('email_quality', 'in', '("invalid","disposable")')` to both the first-touch and second-touch queries. This prevents sending reminder emails to addresses that MillionVerifier/Findymail flagged as undeliverable.

---

## Files Summary

| File | Change |
|------|--------|
| `src/components/partner-funnel/FunnelSteps.tsx` | Email verification flow, staleness check, form label, expanded summary, submit guard, enriched admin payload |
| `supabase/functions/verify-funnel-email/index.ts` | New -- MillionVerifier + Findymail hybrid check |
| `supabase/functions/notify-admin-partner-request/index.ts` | Accept and render full lead data |
| `supabase/functions/send-funnel-reminder/index.ts` | Fix plain-text footer (line 89) |
| `supabase/functions/process-funnel-reminders/index.ts` | Filter out invalid/disposable emails |
| Database migration | Add `email_quality` and `email_verified_at` columns |

## What Does NOT Change

- Form field order, layout structure, and existing copy
- Analytics, UTM tracking, exit intent, autosave mechanism (except staleness check)
- RLS policies
- Success page, QUIN assistant, trust badges
- Confirmation email (`send-partner-request-received`)
- OTP infrastructure (reuses existing `send-email-verification` function)

## Secrets Required

- `MILLIONVERIFIER_API_KEY` -- will be requested during implementation
- `FINDYMAIL_API_KEY` -- will be requested during implementation
