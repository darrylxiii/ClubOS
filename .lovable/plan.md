
# Plan: Complete i18n Audit and Fix for Candidate Onboarding

## Problem Identified

After a thorough audit, I found **38+ hardcoded English strings** in the codebase that are NOT using the `t()` translation function. While the translation files (`en/onboarding.json` and `nl/onboarding.json`) contain comprehensive translations, many strings in the code are still hardcoded.

## Hardcoded Strings Found

### 1. `CandidateOnboardingSteps.tsx` - handleSubmit function (lines 419-440)
| Line | Hardcoded String | Required Translation Key |
|------|------------------|-------------------------|
| 421 | `"Consent required"` | `candidate.validation.consentRequired` |
| 422 | `"Please accept the Privacy Policy..."` | `candidate.validation.consentRequiredDescription` |
| 431 | `"Invalid password"` | `candidate.messages.invalidPassword` |
| 432 | `"Please meet all password requirements"` | `candidate.messages.meetPasswordRequirements` |
| 440 | `"Passwords do not match"` | `candidate.validation.passwordMismatch` |
| 675 | `"Application submitted!"` | `candidate.messages.applicationSubmitted` |
| 676 | `"Darryl will review..."` | `candidate.messages.reviewTime` |
| 713 | `"Account creation failed"` | `candidate.messages.accountCreationFailed` |
| 777 | `"Resume uploaded successfully"` | `candidate.messages.resumeUploaded` |

### 2. `CandidateOnboardingSteps.tsx` - Error messages (lines 713-720)
| Line | Hardcoded String |
|------|------------------|
| 714-718 | Error descriptions in toast |

### 3. Dutch Translation File - Missing Keys

The Dutch file `nl/onboarding.json` is missing several keys that exist in English:
- `candidate.messages.missingInfo`
- `candidate.messages.fillRequiredFields`
- `candidate.messages.pleaseEnterPhone`
- `candidate.messages.enterCurrentTitle`
- `candidate.messages.enterDreamJob`
- `candidate.professional.linkedinOptional`
- `candidate.professional.bioOptional`
- `candidate.professional.uploading`
- `candidate.professional.clickToUpload`
- `candidate.preferences.enterCode`
- `candidate.preferences.codeSentTo`
- `candidate.preferences.typeToSearch`

---

## Implementation Plan

### Phase 1: Fix Hardcoded Strings in handleSubmit (lines 419-724)

Replace all hardcoded toast messages with translation calls:

```typescript
// Line 421-427 - Before:
toast({ 
  title: "Consent required", 
  description: "Please accept the Privacy Policy and Terms of Service",
  variant: "destructive" 
});

// After:
toast({ 
  title: t('candidate.validation.consentRequired'), 
  description: t('candidate.validation.consentRequiredDescription'),
  variant: "destructive" 
});
```

```typescript
// Line 431-437 - Before:
toast({ 
  title: "Invalid password", 
  description: "Please meet all password requirements",
  variant: "destructive" 
});

// After:
toast({ 
  title: t('candidate.messages.invalidPassword'), 
  description: t('candidate.messages.meetPasswordRequirements'),
  variant: "destructive" 
});
```

```typescript
// Line 440 - Before:
toast({ title: "Passwords do not match", variant: "destructive" });

// After:
toast({ title: t('candidate.validation.passwordMismatch'), variant: "destructive" });
```

```typescript
// Line 675-678 - Before:
toast({ 
  title: "Application submitted!", 
  description: "Darryl will review your application within 24-48 hours" 
});

// After:
toast({ 
  title: t('candidate.messages.applicationSubmitted'), 
  description: t('candidate.messages.reviewTime') 
});
```

```typescript
// Line 712-720 - Before:
toast({ 
  title: "Account creation failed", 
  description: error.message... 
  variant: "destructive" 
});

// After:
toast({ 
  title: t('candidate.messages.accountCreationFailed'), 
  description: error.message... // Keep dynamic error messages
  variant: "destructive" 
});
```

```typescript
// Line 777 - Before:
toast({ title: "Resume uploaded successfully" });

// After:
toast({ title: t('candidate.messages.resumeUploaded') });
```

### Phase 2: Complete Dutch Translation File

Add all missing keys to `src/i18n/locales/nl/onboarding.json`:

```json
{
  "candidate": {
    "messages": {
      "missingInfo": "Ontbrekende informatie",
      "fillRequiredFields": "Vul alle verplichte velden in",
      "pleaseEnterPhone": "Voer je telefoonnummer in",
      "enterCurrentTitle": "Voer je huidige functietitel in",
      "enterDreamJob": "Voer je droomfunctie in",
      "invalidPassword": "Ongeldig wachtwoord",
      "meetPasswordRequirements": "Voldoe aan alle wachtwoordvereisten"
    },
    "professional": {
      "linkedinOptional": "(Optioneel)",
      "bioOptional": "(Optioneel)",
      "uploading": "Uploaden...",
      "clickToUpload": "Klik om PDF of Word document te uploaden"
    },
    "preferences": {
      "enterCode": "Voer verificatiecode in",
      "codeSentTo": "We hebben een 6-cijferige code gestuurd naar",
      "typeToSearch": "Typ om steden te zoeken..."
    },
    "validation": {
      "consentRequiredDescription": "Accepteer het Privacybeleid en de Servicevoorwaarden"
    }
  }
}
```

### Phase 3: Fix Dialog Box Translation Issue (line 1719)

The dialog message is incorrectly split:
```typescript
// Before (line 1719):
{t('candidate.dialog.accountExistsMessage', 'An account with')} <span>...</span> {t('candidate.dialog.accountExistsMessage', 'already exists.')}

// After - use a single key with interpolation:
<Trans 
  i18nKey="candidate.dialog.accountExistsMessageWithEmail"
  values={{ email: formData.email }}
  components={{ bold: <span className="font-semibold text-foreground" /> }}
>
  An account with <bold>{{email}}</bold> already exists.
</Trans>
```

Or simpler approach:
```typescript
{t('candidate.dialog.accountExistsMessage', 'An account with this email address already exists.')}
```

---

## Files to Modify

### 1. `src/components/candidate-onboarding/CandidateOnboardingSteps.tsx`
- Lines 421-427: Replace hardcoded consent toast
- Lines 431-437: Replace hardcoded password toast
- Line 440: Replace hardcoded password mismatch toast
- Lines 675-678: Replace hardcoded submission toast
- Lines 712-720: Replace hardcoded error toast title
- Line 777: Replace hardcoded resume upload toast
- Line 1719: Fix dialog message translation

### 2. `src/i18n/locales/nl/onboarding.json`
- Add all missing translation keys listed above

### 3. `src/i18n/locales/en/onboarding.json`
- Add missing keys for consistency:
  - `candidate.validation.consentRequiredDescription`
  - `candidate.dialog.accountExistsMessageWithEmail` (if using interpolation)

---

## Verification Checklist

After implementation:
- [ ] All toast messages use `t()` function
- [ ] All form labels use `t()` function
- [ ] All validation messages use `t()` function
- [ ] Dutch translation file has all keys matching English file
- [ ] Switch language to NL and verify all text changes
- [ ] No console warnings about missing translation keys
- [ ] Test all 6 onboarding steps in both languages
