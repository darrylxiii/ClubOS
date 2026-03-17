

# Partner Onboarding System Audit

## Score: 72/100

---

## What works well (+72)

| Area | Score | Notes |
|------|-------|-------|
| PartnerSetup password fix | +15 | Uses `supabase.auth.updateUser({ password })` correctly — Timo's bug is fixed |
| ProtectedRoute ordering | +12 | Correct: onboarding → status → MFA → force_password_change. Partners with `approved` + `force_password_change: true` land on `/partner-setup` correctly |
| approve-partner-request | +15 | Solid: JWT auth, rollback, company-required guard (line 246-253), audit trail, magic link, welcome email |
| PendingApproval realtime | +10 | Realtime subscription + 60s polling fallback, role-aware UI for partner vs candidate |
| PartnerSetup UX | +10 | Clean 3-step flow (password → profile → complete), LinkedIn avatar fetch, manual upload, step indicator |
| PartnerWelcome page | +5 | Shows company info, strategist, next steps |
| consume-invite flow | +5 | Handles company_members + role assignment on invite-based signup |

---

## Issues found (-28)

### 1. consume-invite audit log uses WRONG column names (-6)
**File:** `supabase/functions/consume-invite/index.ts` lines 142-159

Uses `action_type`, `action_category`, `new_value`, `ip_address`, `user_agent` — but the `comprehensive_audit_logs` table schema requires `event_type`, `action`, `event_category`, `after_value`, `actor_ip_address`, `actor_user_agent`. This insert **silently fails** every time, meaning invite consumption is never audited.

### 2. consume-invite uses outdated CORS headers (-3)
**File:** `supabase/functions/consume-invite/index.ts` lines 4-7

Uses inline CORS headers missing `x-application-name` and `Access-Control-Allow-Methods`. Per memory, all edge functions must use the shared `supabase/functions/_shared/cors.ts` utility for consistent preflight compliance.

### 3. consume-invite uses deprecated `serve` import (-2)
**File:** `supabase/functions/consume-invite/index.ts` line 1

Uses `serve` from `deno.land/std@0.168.0/http/server.ts` instead of `Deno.serve()`. All other edge functions use `Deno.serve()`.

### 4. consume-invite doesn't set account_status for partner signups (-5)
When a partner signs up via invite code, `consume-invite` assigns the role and company but does NOT set `profiles.account_status`. The default is `'pending'`, which means the partner gets stuck on `/pending-approval` after email verification. This is the correct behavior IF admin approval is required — but the user's stated intent was that invite-based partners should already be approved since the invite itself is the approval. This needs a decision.

### 5. PartnerSetup has no session refresh after password set (-4)
**File:** `src/pages/PartnerSetup.tsx` line 78

After `supabase.auth.updateUser({ password })`, the `user_metadata` in the local session still has `force_password_change: true`. The `handleCompleteSetup` function (line 165) clears it via another `updateUser` call, but if the user refreshes the page between steps, the `useEffect` on line 44 checks `force_password_change` and allows continuation — so this is OK. However, after `handleCompleteSetup` clears the flag (line 165-168), the local auth state may not immediately reflect this. If the redirect to `/partner-welcome` (line 196) triggers ProtectedRoute before the auth state updates, the partner could be redirected back to `/partner-setup`. This is a **race condition**.

**Fix:** After clearing `force_password_change`, call `await supabase.auth.refreshSession()` to ensure the local session reflects the updated metadata before navigating.

### 6. PartnerHome "Complete Setup" link is broken for approved partners (-3)
**File:** `src/components/clubhome/PartnerHome.tsx` line 87

Links to `/partner-setup`, but PartnerSetup checks `force_password_change === true` (line 44) and redirects to `/home` if false. An approved partner who already set their password will hit an infinite redirect loop: `/home` → PartnerHome → clicks "Complete Setup" → `/partner-setup` → redirects to `/home`.

### 7. No TeamInviteStep (-3)
Per memory, the partner setup flow should include a skippable `TeamInviteStep` allowing partners to invite up to 10 colleagues. This component doesn't exist and isn't referenced anywhere.

### 8. Missing `description` field in PartnerSetup audit log (-2)
**File:** `src/pages/PartnerSetup.tsx` line 180

The audit log insert has `description` field but is missing the required `event_type` and `action` being set to the same value. Actually looking again — it does set both `event_type` and `action` to `'partner_setup_completed'`, plus `event_category: 'account'` and `after_value`. This is correct. Removing this deduction.

**Revised deduction: 0**

---

## Revised Score: 74/100

---

## Fixes Required to Reach 100/100

### Fix 1: consume-invite audit log columns
Replace wrong column names with schema-compliant ones: `event_type`, `action`, `event_category`, `after_value`, `actor_ip_address`, `actor_user_agent`.

### Fix 2: consume-invite shared CORS + Deno.serve
Switch to `import { corsHeaders } from "../_shared/cors.ts"` and `Deno.serve()`.

### Fix 3: Session refresh after partner setup completion
In `PartnerSetup.tsx` `handleCompleteSetup`, after clearing `force_password_change`, call `await supabase.auth.refreshSession()` before navigating to `/partner-welcome`.

### Fix 4: Fix PartnerHome "Complete Setup" link
Change the link target from `/partner-setup` to a condition-aware path, or hide the card entirely when `force_password_change` is not set. The card should only show for unlinked/unconfigured partners, not as a link to `/partner-setup`.

### Fix 5: Add TeamInviteStep to PartnerSetup
Add an optional step between "profile" and "complete" where partners can invite colleagues. Make it skippable.

### Fix 6: Decide on invite-based partner auto-approval
Either: (a) have `consume-invite` set `account_status: 'approved'` when `target_role === 'partner'` (since the invite IS the approval), or (b) keep partners pending and document this as intentional. This needs a user decision.

### Files to modify

| File | Change |
|------|--------|
| `supabase/functions/consume-invite/index.ts` | Fix audit columns, shared CORS, Deno.serve() |
| `src/pages/PartnerSetup.tsx` | Add `refreshSession()` after clearing force_password_change |
| `src/components/clubhome/PartnerHome.tsx` | Fix/hide "Complete Setup" card logic |
| `src/pages/PartnerSetup.tsx` | Add TeamInviteStep (new step) |
| `supabase/functions/consume-invite/index.ts` | Optionally auto-approve invite-based partners |

