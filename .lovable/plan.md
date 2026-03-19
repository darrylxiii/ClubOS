

# Audit & Rebuild: Partner Provisioning Flow

## Current State

The existing `PartnerProvisioningModal` (4-step wizard: Contact → Company → Access → Review) and the `provision-partner` edge function are **already solid**. The backend handles: auth user creation, profile setup, company creation/linking, role assignment, domain settings, magic link generation, invite codes, welcome emails, and audit logging — with proper rollback on failure.

The `SendInviteTab` also supports a "Partner" role option, but this is a **lightweight invite** (just creates an invite code + sends email) — the partner still has to sign up, go through onboarding, etc. This is the wrong flow for high-value partners.

## What the User Wants

The **primary** partner onboarding path should be: admin has the email → fills in name, company, assigns everything → partner receives a magic link → clicks it → sets password on `/partner-setup` → done. No email verification, no phone verification, no request/approval workflow. The partner just logs in and everything is already there.

This already works. But the UX needs refinement and the flow needs to be **promoted as the #1 way** to invite partners, not buried in the admin companies page.

## Audit Findings

| # | Issue | Impact |
|---|-------|--------|
| 1 | **Provisioning modal only accessible from `/admin/companies`** — Not discoverable. Should be reachable from Invite Dashboard and Partner Home | Partners get invited via the lightweight `SendInviteTab` instead |
| 2 | **SendInviteTab "Partner" role creates a bare invite code** — No company linking, no pre-verification, no magic link. Partner has to do everything themselves | Bad partner experience, empty dashboard on first login |
| 3 | **No first/last name split** — `fullName` is a single field. Fine for now but the edge function and profile both store it as one field | Minor — consistent with existing pattern |
| 4 | **ContactStep blocks on duplicate warning** — If email exists, "Continue" is disabled. But the user might want to re-provision or link to a different company | Should warn but not hard-block |
| 5 | **No auto-match company from email domain** — Admin types email, domain is extracted for `companyDomain` but doesn't check if a company with that domain already exists to auto-select it | Extra manual step |
| 6 | **Phone verification toggle is meaningless** — User says: "asking a partner to verify email/phone when I already have both is stupid." The toggles exist but default to email=true, phone=false. Phone should also default true when provided | Inconsistency |
| 7 | **NDA checkbox on Review step** — Not functionally connected to anything. Just a toggle that doesn't gate submission | Misleading UI |
| 8 | **No "Quick Provision" mode** — For the common case (email + name + company = done), the 4-step wizard is overkill. Should have a streamlined single-view option | Slower onboarding for admins |
| 9 | **SendInviteTab partner flow doesn't redirect to provisioning** — When admin selects "Partner" role in SendInviteTab, it should either switch to the provisioning flow or clearly state that partners should use Full Provisioning | Confusion between two paths |

## Plan

### 1. Add "Quick Provision" mode to `PartnerProvisioningModal`

Add a toggle at the top of the modal: **Quick** (single view with just the essentials) vs **Advanced** (current 4-step wizard). Quick mode shows one compact form:
- Full Name + Email (required)
- Phone (optional)
- Company picker (existing) or new company name
- Company Role dropdown
- Strategist assignment
- Submit button

Defaults: email verified = true, phone verified = true (if provided), provision method = magic_link, domain auto-provisioning = off. All the advanced options (fee structure, NDA, domain settings, welcome message) are skipped.

### 2. Auto-match company from email domain

In `useProvisionForm.ts`, when email domain is extracted:
- Query `organization_domain_settings` for a matching domain
- If found, auto-select that company and switch to "existing" mode
- Show a subtle indicator: "Matched to [Company Name] via email domain"

### 3. Default phone verified = true when phone is provided

In `useProvisionForm.ts`, add a `watch` on `phoneNumber` that auto-sets `markPhoneVerified: true` when a phone number is entered.

### 4. SendInviteTab: redirect partner role to provisioning

When admin selects "Partner" in the role dropdown of `SendInviteTab`:
- Show an inline banner: "For the best partner experience, use Full Provisioning to pre-configure their account, company, and access."
- Include a button that opens the `PartnerProvisioningModal` with the name + email pre-filled
- Still allow the lightweight invite as a fallback

### 5. Make provisioning accessible from Invite Dashboard

In `InviteDashboardLayout.tsx`, the "Full Provisioning" button already exists (for elevated roles). Also add the `PartnerProvisioningModal` directly to this page so it can be opened without navigating to `/admin/companies`.

### 6. Soften duplicate email blocking

In `ContactStep.tsx`, change the duplicate warning from a hard block (disabling Continue) to a warning with an option to proceed: "This email is already registered. Proceeding will skip user creation and update their company/role assignment." (Future: actually support re-provisioning in the edge function.)

### Files to Change

| File | Changes |
|------|---------|
| `src/components/admin/PartnerProvisioningModal.tsx` | Add Quick/Advanced mode toggle, render single-view form for Quick mode |
| `src/components/admin/partner-provisioning/QuickProvisionView.tsx` | **NEW** — compact single-view provisioning form |
| `src/components/admin/partner-provisioning/useProvisionForm.ts` | Auto-match company from domain, auto-set phone verified, expose domain-match state |
| `src/components/admin/partner-provisioning/steps/ContactStep.tsx` | Soften duplicate block to warning-only with proceed option |
| `src/components/invites/SendInviteTab.tsx` | Add partner provisioning banner + modal integration when "Partner" role selected |
| `src/components/invites/InviteDashboardLayout.tsx` | Add PartnerProvisioningModal import and state, wire to "Full Provisioning" button |

No edge function or database changes needed — the backend already handles everything correctly.

