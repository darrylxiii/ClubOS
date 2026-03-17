

# Partner Onboarding System Audit — Round 3

## Score: 78/100

---

## What works well (+78)

| Area | Score |
|------|-------|
| PartnerSetup password flow (Timo bug fixed) | +15 |
| ProtectedRoute gating chain | +12 |
| approve-partner-request (company-required guard) | +15 |
| consume-invite (role, company, auto-approve, audit) | +10 |
| PendingApproval (realtime + role-aware) | +10 |
| PartnerHome conditional setup/no-company cards | +5 |
| validate-invite-code (rate-limited, shared CORS, .maybeSingle) | +6 |
| Auth.tsx invite retry on first login | +5 |

---

## Issues found (-22)

### 1. CRITICAL: TeamInviteStep sends wrong payload to `send-team-invite` (-8)

`TeamInviteStep.tsx` line 75-82 sends:
```json
{ "invites": [{ "email": "...", "role": "..." }] }
```

But `send-team-invite/index.ts` line 68 expects a **single** `TeamInviteRequest`:
```json
{ "email": "...", "inviteCode": "...", "companyName": "...", "companyId": "...", "role": "..." }
```

Missing fields: `inviteCode`, `companyName`, `companyId`. Wrong structure: array vs single object. **Every team invite will fail with 400 "Missing required fields".**

**Fix:** Rewrite `TeamInviteStep` to: (a) fetch the partner's company from `company_members`, (b) for each invite, create an `invite_codes` row, then (c) call `send-team-invite` once per invite with the correct payload. Or batch it in a new edge function.

### 2. CRITICAL: Invite-based partners land on candidate onboarding (-6)

When a partner signs up via invite code (not admin-provisioned), `consume-invite` sets `account_status: 'approved'` and assigns the partner role. But it does NOT set `force_password_change: true` in `user_metadata`. After email verification and login:

- Auth.tsx line 232: checks `force_password_change === true` → false → skips `/partner-setup`
- Auth.tsx line 285: checks `onboarding_completed_at` → null → redirects to `/oauth-onboarding` (candidate flow)

The invite-based partner ends up in the **candidate** onboarding wizard instead of the partner setup flow.

**Fix:** In `consume-invite`, when `target_role === 'partner'`, also set `user_metadata.force_password_change = true` via `supabase.auth.admin.updateUserById()`. This ensures they hit the partner setup flow on first login, matching the admin-provisioned path.

### 3. `send-team-invite` uses deprecated `serve()` and inline CORS (-3)

Line 1: `import { serve }` from deprecated stdlib. Line 7-10: inline `corsHeaders` instead of shared utility.

**Fix:** Switch to `Deno.serve()` and `import { corsHeaders } from "../_shared/cors.ts"`.

### 4. `console.error` in `consume-invite` and `validate-invite-code` (-2)

5 occurrences in `consume-invite`, 2 in `validate-invite-code`. Should use structured logging for consistency (non-blocking, but enterprise standard).

### 5. PartnerWelcome sets `onboarding_completed_at` redundantly (-1)

`PartnerSetup.handleCompleteSetup` already sets `onboarding_completed_at` (line 176). Then `PartnerWelcome.handleCompleteOnboarding` sets it again (line 109). Not harmful but creates unnecessary DB writes.

**Fix:** Remove the `onboarding_completed_at` update from `PartnerWelcome` — it's already set by `PartnerSetup`. PartnerWelcome should only log the activation event.

### 6. Auth.tsx "Request Access → For Partners" navigates to `/partner` (-2)

Line 809: `navigate('/partner')` — this is the partner portal dashboard, a protected route. An unauthenticated user clicking this hits ProtectedRoute → redirects to `/auth`. Should navigate to `/partner-request` or the partner application form.

**Fix:** Change to the correct partner request/application route.

---

## Implementation Plan

### Fix 1: Rewrite TeamInviteStep to generate proper invites
- Fetch partner's company from `company_members` on mount
- On send: for each invite, insert into `invite_codes` table (generate code, set `target_role`, `company_id`, `metadata`)
- Then call `send-team-invite` per invite with the full `TeamInviteRequest` payload
- Handle partial failures gracefully

### Fix 2: Set `force_password_change` for invite-based partners
In `consume-invite/index.ts`, after the auto-approve block (line 137-147), add:
```typescript
await supabase.auth.admin.updateUserById(user.id, {
  user_metadata: { force_password_change: true }
});
```

### Fix 3: Modernize `send-team-invite`
- Replace `serve()` with `Deno.serve()`
- Import shared `corsHeaders`

### Fix 4: Remove redundant `onboarding_completed_at` from PartnerWelcome
Keep only the activation event log in `handleCompleteOnboarding`.

### Fix 5: Fix "For Partners" link in Auth.tsx
Change `navigate('/partner')` to the correct partner request route.

### Files to modify

| File | Change |
|------|--------|
| `src/components/partner-setup/TeamInviteStep.tsx` | Rewrite to generate invite codes + call send-team-invite correctly |
| `supabase/functions/consume-invite/index.ts` | Add `force_password_change` for partner signups |
| `supabase/functions/send-team-invite/index.ts` | Modernize to Deno.serve() + shared CORS |
| `src/pages/PartnerWelcome.tsx` | Remove redundant onboarding_completed_at update |
| `src/pages/Auth.tsx` | Fix "For Partners" navigation target |

