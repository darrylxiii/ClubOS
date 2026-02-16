

# Add "Set Password" Option for OAuth Users on Login Page

## What This Does

Adds a modal on the login page so OAuth users (Google/Apple) who don't have a password can request a link to create one. This lets them log in with email + password in addition to their OAuth method.

## Why No Backend Changes Are Needed

The existing password reset infrastructure already handles this perfectly:
- `password-reset-request` looks up users by email regardless of auth method
- `password-reset-set-password` uses admin API to set a password on any account (OAuth or not)
- The reset email, OTP verification, and new-password page all work as-is

The only change needed is on the **frontend**: better UX to guide OAuth-only users through this flow.

---

## Changes

### 1. Create a "Set Password" Modal Component

**New file**: `src/components/auth/SetPasswordModal.tsx`

A Dialog component with:
- Headline: "Set up password login"
- Subtext: "If you signed in with Google or Apple, you can also create a password for email login."
- Email input field
- "Send Setup Link" button
- Success state showing "Check your email"

The submit handler calls the same `password-reset-request` edge function that the existing Forgot Password page uses. No new endpoint needed.

### 2. Add the Modal Trigger to the Auth Page

**Modified file**: `src/pages/Auth.tsx`

Below the existing "Forgot password?" link (line 696), add a second link:

```
Don't have a password? Set one up
```

Clicking it opens the SetPasswordModal.

### 3. Add i18n Translations

**Modified files**: `src/i18n/locales/en/auth.json` and `src/i18n/locales/nl/auth.json`

Add new keys under a `setPassword` section:
- `title`: "Set Up Password Login" / "Wachtwoord Instellen"
- `subtitle`: "Signed in with Google or Apple? Create a password to also log in with email." / "Ingelogd met Google of Apple? Maak een wachtwoord aan om ook met e-mail in te loggen."
- `sendLink`: "Send Setup Link" / "Verstuur Installatielink"
- `noPassword`: "Don't have a password?" / "Geen wachtwoord?"
- `setOne`: "Set one up" / "Stel er een in"

---

## Technical Details

- The modal reuses the existing `password-reset-request` edge function -- no new API
- The email sent contains the same magic link / OTP code leading to `/reset-password/verify-token` then `/reset-password/new` where they create a password
- The "Create New Password" page at `/reset-password/new` already works for both resetting and first-time password creation
- Component follows existing Dialog pattern from Radix UI (already in the project)
- Two files modified, one file created

## Files Summary

| File | Action |
|---|---|
| `src/components/auth/SetPasswordModal.tsx` | Create |
| `src/pages/Auth.tsx` | Add modal trigger link + import |
| `src/i18n/locales/en/auth.json` | Add `setPassword` keys |
| `src/i18n/locales/nl/auth.json` | Add `setPassword` keys |
