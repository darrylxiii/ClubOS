
# Partner Invite Flow Audit

## Current Score: 78/100 (up from 58)

The infrastructure is solid but the experience has critical gaps that break the "seamless 0.1%" standard. Below is a detailed breakdown across every layer of the flow.

---

## Flow Map

There are **3 entry points** for partners to join the platform:

```text
Entry Point 1: Admin Provisioning (provision-partner edge function)
  Admin fills modal --> Creates auth user + company + role --> Sends magic link email --> Partner clicks link --> /partner-welcome --> /partner (home)

Entry Point 2: Team Member Invite (send-team-invite edge function)  
  Partner/Member fills invite dialog --> Creates invite_code --> Sends email with link to /auth?invite=CODE --> Invitee signs up --> Onboarding --> Home

Entry Point 3: Self-Service Funnel (/partner route)
  Visitor fills 5-step form --> Submits membership request --> Waits for manual review --> (no automated next step)
```

---

## Scoring Breakdown

### 1. Admin Provisioning Flow -- 75/100

**What works well:**
- Comprehensive 3-step wizard with contact, company, and auth configuration
- Pre-verification toggles (skip email/phone confirm)
- Magic link generation with 72-hour expiry
- Auto-domain extraction from email
- Audit logging and provisioning logs
- Branded welcome email via Resend
- Success screen with copy-to-clipboard for invite code and magic link
- PartnerWelcome concierge page with company info, strategist, and next steps

**Issues found:**

| Issue | Severity | Detail |
|-------|----------|--------|
| Magic link redirect uses wrong URL construction | Critical | Line 329: `siteUrl.replace('.supabase.co', '.lovable.app')` -- this produces a broken URL since the Supabase URL is `dpjucecmoyfzrduhlctt.supabase.co`, resulting in `dpjucecmoyfzrduhlctt.lovable.app` instead of `thequantumclub.lovable.app`. The `SITE_URL` env var may not be set. |
| Welcome email sends from `noreply@thequantumclub.com` | Medium | Custom knowledge specifies `.nl` domain. Sending domain may not match DNS/SPF records, causing deliverability issues. |
| `listUsers()` used for duplicate check | Medium | Line 148: `supabase.auth.admin.listUsers()` fetches ALL users to check for duplicates. This does not scale and will fail past 1000 users. Should use `getUserByEmail()`. |
| No Resend response body logging | Medium | Line 442: Only checks `emailResponse.ok` but never logs the error body on failure, making email debugging impossible. |
| `candidate_strategist_assignments` used for partner | Low | Line 258: Partners are stored in a table named for candidates. Semantically confusing but functionally fine. |
| No loading state on company fetch | Low | Companies list loads silently; large lists could cause delay. |

---

### 2. Team Member Invite Flow -- 62/100

**What works well:**
- Dual-layer domain validation (client + server)
- Branded dark-theme email template
- Invite code with 7-day expiry
- Revoke capability for pending invites
- Inline domain validation feedback (green checkmark / red error)
- Two widget variants (TeamInviteWidget for settings, TeamOverviewWidget for dashboard)

**Issues found:**

| Issue | Severity | Detail |
|-------|----------|--------|
| Invite link goes to `/auth?invite=CODE` but signup does not consume the code | Critical | After signup, the invite code is validated but never marked as used. The `use_invite_code` DB function exists but is never called from the Auth page or any post-signup hook. The invitee signs up as a regular user with no company membership. |
| No automatic company assignment | Critical | After a team member signs up via invite, nothing adds them to `company_members`. They become a generic user with no partner role or company association. The entire team invite flow is decorative. |
| No post-signup redirect to company context | High | After signup, invitee goes through standard onboarding (candidate flow), not a partner/team-member welcome. |
| Invite status tracking is client-side approximation | Medium | Status is computed from `expires_at` and `uses_count` on every render rather than stored as a column. Race conditions possible. |
| No resend/reminder capability | Medium | If the email fails delivery, there's no way to resend the invitation. |
| No invite acceptance notification to inviter | Low | The inviter is never notified when someone accepts their invite. |

---

### 3. Self-Service Funnel (/partner) -- 70/100

**What works well:**
- 5-step progressive form (contact, company, partnership, compliance, verification)
- Email + SMS OTP verification
- Session recovery (ProgressSaver, SessionRecoveryBanner)
- Exit intent popup for conversion
- Social proof carousel
- A/B testing framework
- Funnel analytics tracking
- AI assistant for questions
- Keyboard shortcuts
- Network status indicator

**Issues found:**

| Issue | Severity | Detail |
|-------|----------|--------|
| No connection to admin approval pipeline | High | After submission, there's no automated notification to admins. The request sits in a DB table with no dashboard to review it. |
| PartnerRequestTracker exists but discovery is poor | Medium | Applicants can track status, but the link to the tracker is not prominently shown post-submission. |
| No auto-provisioning on approval | Medium | Even if an admin approves a funnel request, there's no automation to provision the account. It requires manual provisioning via the separate modal. |
| Funnel is at `/partner` which conflicts with partner home | Medium | Route naming overload -- `/partner` is both the funnel for non-authed users and could be confused with the partner dashboard. |

---

### 4. Invite Dashboard (/invite-dashboard) -- 20/100

**What works well:**
- Stats cards with real data (total sent, pending, accepted, conversion rate)
- Tab structure for future expansion

**Issues found:**

| Issue | Severity | Detail |
|-------|----------|--------|
| All 4 main tabs are "Coming Soon" placeholders | Critical | Send, Browse, History, and Analytics tabs all show placeholder content. This is a dead page. |
| Stats only show current user's invites | Low | No admin-level overview across all inviters. |

---

### 5. Email Delivery & Branding -- 55/100

| Issue | Severity | Detail |
|-------|----------|--------|
| Two different email templates with inconsistent branding | Medium | Admin provisioning email uses white background; team invite email uses dark (#0E0E10) background. Should be unified. |
| No email delivery tracking | Medium | Neither function logs Resend message IDs or webhook events. No way to know if emails landed. |
| Password exposed in email for non-magic-link provisioning | High | Line 422: Temporary password is sent in plain HTML email. Security risk if email is intercepted. |
| No unsubscribe link | Low | Marketing compliance risk, though these are transactional emails. |

---

## Summary of Critical Gaps

1. **Team invite signup does not consume the code or assign company membership** -- the entire flow is broken end-to-end
2. **Magic link URL construction may produce invalid URLs** without `SITE_URL` env var
3. **Invite Dashboard is 80% placeholder** -- not a deliverable feature
4. **No admin review pipeline** for self-service funnel submissions
5. **Password sent in plaintext email** for non-magic-link provisioning

## What "100/100 Seamless 0.1%" Looks Like

- Admin provisions partner --> magic link arrives in < 30 seconds --> partner clicks --> sees concierge welcome with strategist, company, and next steps --> enters portal. **Currently ~80% there.**
- Team member gets invited --> branded email arrives --> clicks "Accept" --> signs up or signs in --> automatically added to company with correct role --> sees team dashboard. **Currently broken.**
- Prospect fills funnel --> admin gets notified --> approves with one click --> prospect automatically provisioned and emailed. **Currently disconnected.**
- All emails use unified TQC dark branding with consistent sender domain, delivery tracking, and retry logic.

## Recommended Fix Priority

1. **Fix team invite post-signup flow**: Consume invite code, auto-assign company + role after signup
2. **Set SITE_URL env var** and fix magic link construction fallback
3. **Remove plaintext password from emails** (force magic link or OAuth only)
4. **Connect funnel submissions to admin notification** + one-click provisioning
5. **Unify email templates** to dark TQC branding
6. **Replace `listUsers()` with `getUserByEmail()`** in provision-partner
7. **Add Resend response logging** to both email-sending functions
8. **Either build out or remove Invite Dashboard** -- placeholder pages signal unfinished product
