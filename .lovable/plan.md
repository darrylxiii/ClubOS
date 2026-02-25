

# Fix Mail-Tester Score: 7/10 to 9-10/10

## Issues Found

### 1. Broken Links (-2 points) — ROOT CAUSE IDENTIFIED
All 4 broken links reported by mail-tester:
- `os.thequantumclub.com` (header GIF link)
- `os.thequantumclub.com/dashboard` (CTA button)
- `os.thequantumclub.com/settings/notifications` (footer)
- `os.thequantumclub.com/privacy` (footer)

**Root cause**: The `APP_URL` secret is set to `os.thequantumclub.com` WITHOUT the `https://` prefix. Both `getEmailAppUrl()` and `getAppUrl()` return whatever `APP_URL` contains, and only the fallback has `https://`. Since the env var IS set, it overrides the fallback, producing protocol-less URLs.

**Fix**: Two-layer defense:
1. Update the `APP_URL` secret to `https://os.thequantumclub.com`
2. Add protocol-safety to both `getEmailAppUrl()` in `email-config.ts` AND `getAppUrl()` in `app-config.ts` so they always prepend `https://` if missing — this prevents any future misconfiguration from breaking emails again

### 2. Missing SPF Record (-1 point) — DNS only, no code fix
Mail-tester reports: `send.thequantumclub.nl` has no SPF record. You need to add this DNS TXT record to the `send.thequantumclub.nl` subdomain:

```
v=spf1 include:amazonses.com ~all
```

This is a DNS configuration change in your domain registrar (not code). Resend uses Amazon SES, so the `include:amazonses.com` directive authorizes those servers to send on behalf of `send.thequantumclub.nl`.

### 3. Missing List-Unsubscribe Header
The welcome email does not include a `List-Unsubscribe` header. While this was added to `send-team-invite` and `send-referral-invite` in Phase 3, the candidate welcome email was missed.

**Fix**: Add `List-Unsubscribe` and `List-Unsubscribe-Post` headers to `send-candidate-welcome-email`.

### 4. HTML_FONT_LOW_CONTRAST (minor SpamAssassin flag)
SpamAssassin flagged `HTML_FONT_LOW_CONTRAST` — this comes from the preheader text (hidden text with colors similar to background). This is a standard email technique and scores only 0.001, so no action needed.

---

## Technical Changes

### File 1: `supabase/functions/_shared/email-config.ts`
- Update `getEmailAppUrl()` to ensure the returned URL always starts with `https://`

### File 2: `supabase/functions/_shared/app-config.ts`
- Update `getAppUrl()` with the same protocol-safety check

### File 3: `supabase/functions/send-candidate-welcome-email/index.ts`
- Add `List-Unsubscribe` and `List-Unsubscribe-Post` headers to the Resend API call

### Secret Update
- Prompt to update `APP_URL` to `https://os.thequantumclub.com`

---

## Expected Score After Fix
- Broken links fixed: +2 points (7 to 9)
- SPF record added (DNS): +1 point (9 to 10)
- List-Unsubscribe: removes that warning flag

**Code changes alone get you to 9/10. Adding the SPF DNS record gets you to 10/10.**

