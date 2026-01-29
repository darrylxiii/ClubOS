

# Plan: Professional Email Flows with Magic Link Access

## Overview

Implement professional, branded email notifications for the candidate application lifecycle:
1. **Application Submitted** - Sent immediately after completing onboarding (with view-only magic link)
2. **Application Approved** - Sent when admin approves the candidate (with **login magic link**)

The key difference:
- **Submitted**: Custom token → view-only status page (no login)
- **Approved**: Supabase magic link → **directly logs user into the system**

## Architecture

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                         EMAIL FLOW ARCHITECTURE                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  APPLICATION SUBMITTED:                                                      │
│  ┌──────────────────┐        ┌─────────────────────┐                         │
│  │ Onboarding       │──────▶ │ send-application-   │──────▶ Email with       │
│  │ Completed        │        │ submitted-email     │        Status Link      │
│  └──────────────────┘        └─────────────────────┘        (view-only)      │
│                                        │                                     │
│                                        ▼                                     │
│                              /application/status/:token                      │
│                              (public page, read-only)                        │
│                                                                              │
│  APPLICATION APPROVED:                                                       │
│  ┌──────────────────┐        ┌─────────────────────┐                         │
│  │ Admin Approves   │──────▶ │ send-approval-      │──────▶ Email with       │
│  │ Candidate        │        │ notification        │        LOGIN Link       │
│  └──────────────────┘        │ (uses admin API)    │        (Supabase auth)  │
│                              └─────────────────────┘                         │
│                                        │                                     │
│                                        ▼                                     │
│                              /auth/confirm?token_hash=...                    │
│                              (logs user in, redirects to /home)              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Database Changes

### Add `application_access_token` to profiles table

A UUID token for the view-only status page (pending applications only).

```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS application_access_token UUID DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_profiles_application_access_token 
ON public.profiles(application_access_token);
```

## Edge Function: send-application-submitted-email (New)

Sends a branded email immediately after application submission with a **view-only status link**.

### File: `supabase/functions/send-application-submitted-email/index.ts`

**Request payload:**
```typescript
interface ApplicationSubmittedRequest {
  userId: string;
  email: string;
  fullName: string;
}
```

**Logic:**
1. Fetch `application_access_token` from user's profile
2. Build status URL: `https://thequantumclub.lovable.app/application/status/{token}`
3. Send branded email via Resend with "View Your Application Status" button

**Email content includes:**
- Branded TQC header
- Personalized welcome message
- Application timeline/next steps
- View-only status link button
- Contact information

## Edge Function: send-approval-notification (Enhanced)

When a candidate is **approved**, generate a true Supabase magic link that logs them in.

### Changes to `supabase/functions/send-approval-notification/index.ts`:

**New logic for approved candidates:**
1. Use `supabaseAdmin.auth.admin.generateLink()` with type `magiclink`
2. Build the confirmation URL from the returned `hashed_token`
3. Include "Access Your Dashboard" button that logs them in directly
4. User clicks link → automatically authenticated → redirected to `/home`

**Code example:**
```typescript
// Generate magic link for direct login
const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
  type: 'magiclink',
  email: email,
  options: {
    redirectTo: `${APP_URL}/home`
  }
});

// Build the confirmation URL
const confirmUrl = `${SUPABASE_URL}/auth/v1/verify?token=${linkData.properties.hashed_token}&type=magiclink&redirect_to=${APP_URL}/home`;
```

## New Public Route: ApplicationStatusPortal

A view-only page for pending applicants to check their status without logging in.

### File: `src/pages/ApplicationStatusPortal.tsx`

**Features:**
- Validates custom token from URL params
- Fetches profile by `application_access_token`
- Displays current application status (pending/approved/declined)
- For approved users: shows message to check their email for login link
- No authentication required

### Route Registration (App.tsx):
```typescript
<Route path="/application/status/:token" element={
  <PublicProviders>
    <RouteErrorBoundary><ApplicationStatusPortal /></RouteErrorBoundary>
  </PublicProviders>
} />
```

## Email Templates

### Application Submitted Email

```text
┌─────────────────────────────────────────────────────┐
│              THE QUANTUM CLUB                       │
│           Exclusive Talent Network                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Application Received                               │
│                                                     │
│  Dear [Full Name],                                  │
│                                                     │
│  Thank you for applying to The Quantum Club. Your   │
│  application has been successfully submitted and    │
│  is now under review.                               │
│                                                     │
│  What happens next:                                 │
│  1. Darryl will review your application             │
│     (typically within 24-48 hours)                  │
│  2. You'll receive an email with the decision       │
│  3. If approved, you'll get a direct login link     │
│                                                     │
│      [ View Your Application Status ]               │
│        (goes to /application/status/:token)         │
│                                                     │
│  Questions? Contact                                 │
│  onboarding@verify.thequantumclub.nl               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Application Approved Email (with Login Magic Link)

```text
┌─────────────────────────────────────────────────────┐
│              THE QUANTUM CLUB                       │
│           Exclusive Talent Network                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Welcome to The Quantum Club!                       │
│                                                     │
│  Dear [Full Name],                                  │
│                                                     │
│  Congratulations! Your application has been         │
│  APPROVED. You are now a member of The Quantum     │
│  Club's exclusive talent network.                   │
│                                                     │
│  What's Next:                                       │
│  • Darryl will contact you within 19 minutes        │
│  • Schedule your initial consultation               │
│  • Get matched with exclusive opportunities         │
│  • Access our full suite of career tools            │
│                                                     │
│      [ Access Your Dashboard ]                      │
│        (LOGS YOU IN - magic link)                   │
│                                                     │
│  This link expires in 24 hours. After that,         │
│  please use the regular login page.                 │
│                                                     │
│  Welcome aboard!                                    │
│  The Quantum Club Team                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Trigger Application Submitted Email

**File:** `src/components/candidate-onboarding/CandidateOnboardingSteps.tsx`

After successful account creation:
```typescript
// Send application submitted email
try {
  await supabase.functions.invoke('send-application-submitted-email', {
    body: {
      userId: authData.user.id,
      email: formData.email,
      fullName: formData.full_name
    }
  });
} catch (emailError) {
  console.error('[Onboarding] Failed to send confirmation email:', emailError);
  // Non-blocking - don't fail onboarding if email fails
}
```

### 2. Enhanced Approval Notification

**File:** `supabase/functions/send-approval-notification/index.ts`

When `status === 'approved'`:
1. Create Supabase admin client with service role key
2. Call `auth.admin.generateLink({ type: 'magiclink', email })`
3. Build confirmation URL with hashed_token
4. Include in email as primary CTA button

### 3. Security Considerations

**Application Status Token (view-only):**
- UUID (practically unguessable)
- Read-only access to own application status
- No sensitive data exposed
- Works indefinitely

**Approval Magic Link (login):**
- Uses Supabase's built-in magic link system
- Token hash validated server-side
- Expires in 24 hours (configurable)
- One-time use for security
- Full authentication on click

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/send-application-submitted-email/index.ts` | New edge function for submission confirmation |
| `src/pages/ApplicationStatusPortal.tsx` | Public view-only status page |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/send-approval-notification/index.ts` | Add magic link generation for approved users |
| `src/components/candidate-onboarding/CandidateOnboardingSteps.tsx` | Trigger email after account creation |
| `src/App.tsx` | Add public route for `/application/status/:token` |
| `src/locales/en/onboarding.json` | Add translation keys |
| `src/locales/nl/onboarding.json` | Add Dutch translations |
| Database migration | Add `application_access_token` column |

## i18n Keys

**English (onboarding.json):**
```json
{
  "applicationPortal": {
    "title": "Application Status",
    "invalidToken": "Invalid or expired access link",
    "invalidTokenDescription": "This link may be invalid. Please contact support or sign in if you've been approved.",
    "signIn": "Sign In",
    "pending": {
      "title": "Application Under Review",
      "description": "Your application is being reviewed. We'll send you an email once a decision is made."
    },
    "approved": {
      "title": "You've Been Approved!",
      "description": "Congratulations! Check your email for your personal login link, or sign in below.",
      "accessDashboard": "Sign In"
    },
    "declined": {
      "title": "Application Update",
      "description": "Thank you for your interest. Unfortunately, we're unable to proceed with your application at this time."
    }
  }
}
```

**Dutch (onboarding.json):**
```json
{
  "applicationPortal": {
    "title": "Aanvraagstatus",
    "invalidToken": "Ongeldige of verlopen toegangslink",
    "invalidTokenDescription": "Deze link is mogelijk ongeldig. Neem contact op met support of log in als je bent goedgekeurd.",
    "signIn": "Inloggen",
    "pending": {
      "title": "Aanvraag Wordt Beoordeeld",
      "description": "Je aanvraag wordt beoordeeld. We sturen je een e-mail zodra er een beslissing is genomen."
    },
    "approved": {
      "title": "Je Bent Goedgekeurd!",
      "description": "Gefeliciteerd! Check je e-mail voor je persoonlijke inloglink, of log hieronder in.",
      "accessDashboard": "Inloggen"
    },
    "declined": {
      "title": "Aanvraag Update",
      "description": "Bedankt voor je interesse. Helaas kunnen we op dit moment niet doorgaan met je aanvraag."
    }
  }
}
```

## User Experience Summary

| Scenario | Email Sent | Link Type | User Action |
|----------|------------|-----------|-------------|
| Application submitted | Confirmation email | View-only token link | View status page, wait for decision |
| Application approved | Welcome email | **Supabase magic link** | Click → logged in → dashboard |
| Application declined | Decline email | No link | N/A |

## Technical Notes

- Magic links use Supabase's built-in `admin.generateLink()` API
- Service role key required for magic link generation (server-side only)
- Magic links expire after 24 hours by default
- View-only tokens never expire (UUID-based)
- Both email types use Resend with branded templates

