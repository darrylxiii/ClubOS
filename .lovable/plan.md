

# Plan: Terms of Service & Privacy Policy Consent (Simplified)

## Overview

Implement two required consent checkboxes at the end of the candidate onboarding flow. Marketing communications are covered within the Privacy Policy and Terms of Service documents, eliminating the need for a separate opt-in.

## Rationale

Since contacting candidates with career opportunities is core to The Quantum Club's service, marketing consent is embedded in the legal documents rather than as a separate checkbox. Both consents are mandatory to complete registration.

## UI Design

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Step 5: Secure Your Account                  │
├─────────────────────────────────────────────────────────────────┤
│  Password Creation (existing)                                   │
├─────────────────────────────────────────────────────────────────┤
│  LEGAL AGREEMENTS                                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ☐ I agree to the Terms of Service *                       │  │
│  │   [Link opens → /terms]                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ☐ I agree to the Privacy Policy *                         │  │
│  │   [Link opens → /privacy]                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  By creating an account, you consent to receiving career        │
│  opportunities and communications from The Quantum Club.        │
├─────────────────────────────────────────────────────────────────┤
│  [Create Account] button                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Database Changes

Add timestamp columns to `profiles` table to record when each consent was granted:

| Column | Type | Purpose |
|--------|------|---------|
| `terms_accepted_at` | `TIMESTAMP WITH TIME ZONE` | When Terms of Service was accepted |
| `privacy_accepted_at` | `TIMESTAMP WITH TIME ZONE` | When Privacy Policy was accepted |

## Implementation Details

### 1. Component Changes (`CandidateOnboardingSteps.tsx`)

**New state variables:**
- `termsConsent: boolean` - Terms of Service checkbox
- `privacyConsent: boolean` - Privacy Policy checkbox

**Replace existing single GDPR checkbox with two separate checkboxes, each linking to their respective legal documents.**

**Updated validation:**
- Both checkboxes must be checked to proceed
- Clear error message if either is unchecked

### 2. Consent Receipt Recording

On successful account creation, store two consent receipts in `consent_receipts` table:

| consent_type | scope | granted |
|--------------|-------|---------|
| `terms_of_service` | `platform_usage` | `true` |
| `privacy_policy` | `data_processing_and_communications` | `true` |

### 3. Profile Update

Update the user's profile with consent timestamps:
- `terms_accepted_at` → current timestamp
- `privacy_accepted_at` → current timestamp

### 4. Translation Keys

**English:**
- `candidate.consent.termsLabel` → "I agree to the"
- `candidate.consent.termsLink` → "Terms of Service"
- `candidate.consent.privacyLabel` → "I agree to the"
- `candidate.consent.privacyLink` → "Privacy Policy"
- `candidate.consent.communicationsNote` → "By creating an account, you consent to receiving career opportunities and communications from The Quantum Club."
- `candidate.validation.acceptBothRequired` → "Please accept both the Terms of Service and Privacy Policy to continue"

**Dutch:**
- `candidate.consent.termsLabel` → "Ik ga akkoord met de"
- `candidate.consent.termsLink` → "Algemene Voorwaarden"
- `candidate.consent.privacyLabel` → "Ik ga akkoord met het"
- `candidate.consent.privacyLink` → "Privacybeleid"
- `candidate.consent.communicationsNote` → "Door een account aan te maken, stem je in met het ontvangen van carrièremogelijkheden en communicatie van The Quantum Club."
- `candidate.validation.acceptBothRequired` → "Accepteer zowel de Algemene Voorwaarden als het Privacybeleid om door te gaan"

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/candidate-onboarding/CandidateOnboardingSteps.tsx` | Replace GDPR checkbox with two required consent checkboxes, update validation, add consent receipt creation |
| `src/i18n/locales/en/onboarding.json` | Add consent translation keys |
| `src/i18n/locales/nl/onboarding.json` | Add Dutch consent translations |
| Database migration | Add `terms_accepted_at` and `privacy_accepted_at` columns to profiles |

## Technical Notes

- Both consents are mandatory - account creation blocked if either unchecked
- Consent receipts provide audit trail for GDPR compliance
- Timestamps on profile enable easy verification of when user agreed
- Communications consent is implicit via Privacy Policy acceptance (standard practice when comms are core to service)

