

# Partner Invite System — Ruthless Plan Audit

## Previous Plan Score: 62/100

The previous plan identifies real problems but is riddled with assumptions about infrastructure that does not exist, vague "Phase 2+" deferrals of the most important work, and several architectural blindspots. Here is what is wrong.

---

## Critical Flaws in the Previous Plan

### 1. The `/partner-setup` page does not exist, and the plan underestimates its complexity (Score: 20/100)

The plan says "create `PartnerSetup.tsx`" but treats it as a simple password form. In reality this page must:
- Handle the case where the magic link token has expired (Supabase magic links expire in 1 hour by default, but partners may click days later)
- Handle the case where the partner already set a password (refresh/revisit protection)
- Handle the case where `ProtectedRoute` intercepts and redirects to `/oauth-onboarding` or `/pending-approval` before the partner ever reaches `/partner-setup` — because `ProtectedRoute` checks `onboarding_completed_at` and `account_status`, and a freshly provisioned partner has neither set
- Be registered in the router with proper auth guards that do NOT trigger the standard candidate onboarding flow

**The plan completely ignores `ProtectedRoute.tsx` interactions.** A provisioned partner will hit `ProtectedRoute` → `isPureCandidate` is false (they have the `partner` role) → but `account_status` is probably `'pending'` → redirect to `/pending-approval`. The partner never reaches `/partner-setup`. This is a showstopper the plan does not address.

### 2. `force_password_change` metadata flag exists but is not set during provisioning

`ProtectedRoute` already checks `user.user_metadata?.force_password_change === true` and redirects to `/reset-password/new`. The plan proposes creating an entirely new page (`/partner-setup`) when the existing infrastructure could be leveraged by simply setting `force_password_change: true` in `provision-partner`'s `createUser` metadata. But neither the current code nor the plan does this.

### 3. LinkedIn avatar auto-fetch — the plan references infrastructure that does not exist in edge functions

The plan says "uses the existing Apify/scraping infrastructure (same as `sync-avatar-linkedin`)." No such function exists. What exists is `linkedin-scraper-proxycurl` which uses ProxyCurl (not Apify) and scrapes full profiles — it does NOT extract avatars. A new `fetch-linkedin-avatar` function would need to be built from scratch, calling ProxyCurl's person endpoint and extracting the `profile_pic_url` field. The plan hand-waves this as trivial.

### 4. `password_set_at` migration is unnecessary

The plan proposes adding `password_set_at` to `profiles`. But Supabase already tracks password changes via `auth.users.updated_at` and the `force_password_change` metadata flag. Adding a redundant column creates a sync problem. Use the metadata flag instead.

### 5. Stats fix is correct but incomplete

The plan correctly identifies that `InviteStatsCards` queries `candidate_invitations` instead of `invite_codes`. But it does not address that `invite_codes` has no `status` column — it uses `is_active`, `uses_count`, `used_at`, and `expires_at` to derive status. The stats logic needs to be rewritten, not just re-pointed.

### 6. Analytics privacy fix is correct but the plan does not mention the `created_by_type` filter problem

`InviteAnalyticsTab` filters `.eq('created_by_type', 'member')` which excludes admin-sent partner invites (which have `created_by_type: 'admin'`). The plan says "add user filter" but does not mention removing the `created_by_type` filter that makes admin invites invisible.

### 7. The plan defers the most impactful work to "Phase 2+"

The dedicated `/join/partner` landing page, the automated reminder sequence, and the Slack notification on acceptance are all pushed to "follow-up items." But the landing experience IS the conversion bottleneck. A partner clicking a magic link and landing on a polished setup page is the entire point. This should be Phase 1, not Phase 2+.

### 8. No mention of `account_status` handling

When `provision-partner` creates a user, what is their `account_status`? If it defaults to `'pending'`, `ProtectedRoute` will redirect them to `/pending-approval` immediately after magic link login. The provisioning function must set `account_status: 'active'` — or the partner setup page must be excluded from `ProtectedRoute`.

### 9. `send-team-invite` domain validation will BLOCK partner invites

`send-team-invite` (lines 84-104) validates the invitee's email domain against `organization_domain_settings`. If you send a partner invite and their email domain is not in the company's allowed domains, the function returns 403. Partner invites should bypass domain validation since partners are external by definition.

### 10. No WhatsApp deep link or copy-link in success state despite claiming it

The plan mentions "WhatsApp shortcut (reuse pattern from `ProvisionSuccessView`)" but `ProvisionSuccessView` does not exist in the codebase. There is no component to reuse.

---

## Revised 100/100 Plan

### Phase 1: Fix provisioning flow so partners can actually log in (Critical Path)

| # | Task | Detail |
|---|------|--------|
| 1 | **Set `force_password_change` + `account_status` in `provision-partner`** | Add `force_password_change: true` to `user_metadata` in `createUser()`. After profile update, set `account_status: 'active'` so `ProtectedRoute` does not bounce them to `/pending-approval`. Change magic link redirect from `/partner-welcome` to `/partner-welcome` (keep it — the welcome page is the right first stop, but password must be set before they go further). |
| 2 | **Update `ProtectedRoute` to route `force_password_change` partners correctly** | Currently redirects to `/reset-password/new`. Instead, for partners with `force_password_change`, redirect to a partner-specific password setup route `/partner-setup` (or reuse `/reset-password/new` with partner-aware UI). |
| 3 | **Create `/partner-setup` page** | Pre-authenticated page with: (a) Password setup using `AssistedPasswordConfirmation` + `supabase.auth.updateUser({ password })`, (b) LinkedIn URL input (optional), (c) Profile picture — manual upload via existing `ImageUpload` component OR auto-fetch from LinkedIn via ProxyCurl, (d) On completion: clear `force_password_change` metadata, mark `onboarding_completed_at`, redirect to `/partner-welcome`. |
| 4 | **Create `fetch-linkedin-avatar` edge function** | Accept LinkedIn URL, call ProxyCurl person API (`/api/v2/linkedin?url=...`), extract `profile_pic_url`, download image, upload to Supabase storage `avatars` bucket, update `profiles.avatar_url`. Reuse the existing `PROXYCURL_API_KEY` secret. |
| 5 | **Add `/partner-setup` route to `App.tsx`** | Protected route but excluded from the `onboarding_completed_at` check (since partners reach it before completing onboarding). |

### Phase 2: Fix broken invite dashboard infrastructure

| # | Task | Detail |
|---|------|--------|
| 6 | **Fix `InviteStatsCards`** | Switch from `candidate_invitations` to `invite_codes` scoped to current user. Derive status from `is_active`, `uses_count`, `used_at`, `expires_at`. Migrate to `useQuery`. |
| 7 | **Fix `InviteAnalyticsTab`** | Add `.eq('created_by', user.id)`. Remove `.eq('created_by_type', 'member')` filter (so admin-sent invites are included). Replace `useState<any>` with typed state. Add `toast.error`. Migrate to `useQuery`. |
| 8 | **Remove dead "Import Contacts" button** | `InviteDashboardLayout.tsx` line 29-32. |

### Phase 3: Upgrade SendInviteTab for partner invitations

| # | Task | Detail |
|---|------|--------|
| 9 | **Add "Full Name" field** | Always visible. Stored in `metadata.recipient_name`. |
| 10 | **Add "Partner" role option** | When selected: show "Company Name" field, set `invite_type: 'partner'`, `target_role: 'partner'`, `created_by_type` based on actual user role (not hardcoded `'member'`). |
| 11 | **Email validation** | Regex + trim before sending. |
| 12 | **Duplicate invite detection** | Query `invite_codes` for active unexpired invite to same email. Show warning with "Resend existing" option. |
| 13 | **Confetti + rich success state** | After sending: show partner name, "Copy invite link" button (generates `{siteUrl}/auth?invite={code}`), WhatsApp deep link (`https://wa.me/?text=...`), using `canvas-confetti` (already in dependencies). |

### Phase 4: Upgrade `send-team-invite` edge function

| # | Task | Detail |
|---|------|--------|
| 14 | **Extend `TeamInviteRequest` interface** | Add `recipientName?: string`, `customMessage?: string`, `companyName?: string`. |
| 15 | **Personalize email** | When `recipientName` provided: "Hi {name}," instead of generic opening. Include `customMessage` as a styled personal note block. |
| 16 | **Partner-specific template** | When `role === 'partner'`: use `EMAIL_SENDERS.partners` instead of `EMAIL_SENDERS.system`. Add partner value proposition section. Different subject line: "{inviterName} has invited you to partner with The Quantum Club". |
| 17 | **Bypass domain validation for partners** | When `role === 'partner'`, skip the `organization_domain_settings` check (lines 84-104) since partners are external. |

### Phase 5: Upgrade invite history + actions

| # | Task | Detail |
|---|------|--------|
| 18 | **Show recipient name** | Display `metadata.recipient_name` alongside email in `InviteHistoryTab`. |
| 19 | **"Copy Invite Link" action** | Generate and copy `{siteUrl}/auth?invite={code}` for pending invites. |
| 20 | **"Resend" action** | For pending invites, re-trigger `send-team-invite` with existing code and metadata. |

### Phase 6: Upgrade validate-invite-code for pre-fill

| # | Task | Detail |
|---|------|--------|
| 21 | **Return metadata from `validate-invite-code`** | Return `recipient_name`, `email`, `target_role` from `invite_codes.metadata` so `Auth.tsx` can pre-fill the signup form and show partner-specific welcome copy ("Welcome, {name} — {inviterName} has invited you to join as a partner"). |

### Phase 7: Surface provisioning from invite dashboard (admin only)

| # | Task | Detail |
|---|------|--------|
| 22 | **Add "Full Provisioning" button** | In `InviteDashboardLayout`, for admin/strategist roles (via `useRole`), add a button that opens `usePartnerProvisioning` flow or navigates to the Companies page provisioning UI. This connects the two disconnected systems. |

---

### Database Changes

One migration only:
```sql
-- No new columns needed. Use existing user_metadata.force_password_change
-- and profiles.account_status (already exists).
-- Ensure provisioned partners get account_status = 'active'.
```

No migration needed if `account_status` defaults are handled in the edge function.

### Files to Create
| File | Purpose |
|------|---------|
| `src/pages/PartnerSetup.tsx` | Password + LinkedIn + avatar setup |
| `supabase/functions/fetch-linkedin-avatar/index.ts` | ProxyCurl avatar extraction |

### Files to Edit
| File | Change |
|------|--------|
| `supabase/functions/provision-partner/index.ts` | Add `force_password_change: true` to user_metadata, set `account_status: 'active'` on profile |
| `src/components/ProtectedRoute.tsx` | Route `force_password_change` partners to `/partner-setup` |
| `src/App.tsx` | Add `/partner-setup` route |
| `src/components/invites/SendInviteTab.tsx` | Name field, partner role, company name, validation, duplicate check, confetti success |
| `supabase/functions/send-team-invite/index.ts` | `recipientName`, `customMessage`, partner template, partner sender, bypass domain validation |
| `supabase/functions/validate-invite-code/index.ts` | Return metadata fields |
| `src/components/invites/InviteStatsCards.tsx` | Fix: query `invite_codes`, derive status, `useQuery` |
| `src/components/invites/InviteAnalyticsTab.tsx` | Fix: user scope, remove `created_by_type` filter, types, `useQuery` |
| `src/components/invites/InviteHistoryTab.tsx` | Show name, copy link, resend |
| `src/components/invites/InviteDashboardLayout.tsx` | Remove dead button, add admin provisioning shortcut |
| `src/pages/Auth.tsx` | Pre-fill from invite metadata, partner welcome copy |

