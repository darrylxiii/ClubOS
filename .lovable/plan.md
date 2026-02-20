
# Fix: Replace All Old Domains with `os.thequantumclub.com`

## Root Cause Summary

The GIF is still broken because `thequantumclub.lovable.app` is no longer the active domain — the app is now served from `os.thequantumclub.com`. Every email client worldwide tries to fetch the GIF from `thequantumclub.lovable.app/email-header.gif`, gets a failure or redirect that email clients cannot follow, and shows the broken image placeholder.

Additionally, the old `thequantumclub.app` domain is scattered throughout the codebase in 13 files across backend functions, shared config, and frontend UI. All of these need updating to `os.thequantumclub.com` in one sweep.

---

## Complete Domain Replacement Map

Every occurrence found across the entire codebase:

### Group 1 — Shared Email Config (highest priority — fixes the GIF for all emails)

**`supabase/functions/_shared/email-config.ts`** — 2 changes:
- `EMAIL_ASSETS_BASE_URL` → `'https://os.thequantumclub.com'` (fixes all logos, icons, platform icons that derive from this constant)
- `EMAIL_HEADER_GIF` → `'https://os.thequantumclub.com/email-header.gif'` (the explicit GIF URL that overrides the base — this is the direct fix)

### Group 2 — Admin Frontend Preview

**`src/components/admin/EmailTemplatePreview.tsx`** — 1 change:
- Hardcoded `const EMAIL_HEADER_GIF = "https://thequantumclub.lovable.app/email-header.gif"` → `"https://os.thequantumclub.com/email-header.gif"`
- This fixes the broken preview in the admin Email Template Manager

### Group 3 — Backend Edge Functions (fallback URLs)

These functions have hardcoded fallback URLs used when `APP_URL` or `SITE_URL` env vars are not set:

| File | Line | Old | New |
|---|---|---|---|
| `supabase/functions/approve-partner-request/index.ts` | 133 | `thequantumclub.lovable.app` | `os.thequantumclub.com` |
| `supabase/functions/password-reset-request/index.ts` | 190 | `thequantumclub.lovable.app` | `os.thequantumclub.com` |
| `supabase/functions/send-recovery-email/index.ts` | 25 | `thequantumclub.lovable.app` | `os.thequantumclub.com` |
| `supabase/functions/send-team-invite/index.ts` | 107 | `thequantumclub.lovable.app` | `os.thequantumclub.com` |
| `supabase/functions/process-booking-payment/index.ts` | 52 | `thequantumclub.lovable.app` | `os.thequantumclub.com` |
| `supabase/functions/guest-booking-actions/index.ts` | 605 | `thequantumclub.app` | `os.thequantumclub.com` |
| `supabase/functions/create-booking/index.ts` | 32, 34, 620 | `thequantumclub.app` / `thequantumclub.lovable.app` | `os.thequantumclub.com` |

### Group 4 — Frontend UI Components

These are user-visible strings (profile share links, profile URL display):

| File | Context | Change |
|---|---|---|
| `src/components/profile/ShareProfileDialog.tsx` | Share link URL shown to user (lines 93, 168) | `thequantumclub.app/share/` → `os.thequantumclub.com/share/` |
| `src/components/profile/EditProfileSlugDialog.tsx` | Profile URL prefix shown next to slug input (line 108) | `thequantumclub.app/profile/` → `os.thequantumclub.com/profile/` |

### Group 5 — SEO Meta Tags

**`src/pages/CandidateOnboarding.tsx`** — 3 changes (lines 158, 159, 166):
- `og:image`, `og:url`, and `canonical` href updated from `thequantumclub.lovable.app` → `os.thequantumclub.com`

### Group 6 — Calendar Link (components.ts)

**`supabase/functions/_shared/email-templates/components.ts`** — 1 change:
- Google Calendar `sprop=website:thequantumclub.app` → `os.thequantumclub.com`

---

## What This Fixes

| Issue | Before | After |
|---|---|---|
| GIF shows blue dot/? | `thequantumclub.lovable.app` — no longer active | `os.thequantumclub.com` — the live domain |
| Admin preview broken | Same dead URL | Fixed |
| Auth redirect links in emails | Wrong domain fallback | Correct domain |
| Password reset magic links | Wrong domain fallback | Correct domain |
| Share profile links | Old domain shown to users | Correct domain |
| Profile slug URL prefix | Stale label text | Correct label |
| SEO canonical / OG tags | Old subdomain | Custom domain |
| Google Calendar links | Old domain | Correct domain |

---

## Deployment

After code changes, the following Edge Functions are redeployed automatically (they import the shared config):
- `send-test-email`
- `send-approval-notification`
- `send-partner-welcome`
- `send-booking-reminder`
- All other email functions

A fresh test email to `darryl@thequantumclub.nl` is sent immediately after deployment to confirm the GIF renders correctly.

**Total: 13 files. Zero database changes. Zero new secrets needed.**
