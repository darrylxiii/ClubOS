

# Partner Invite System — Audit Round 4

## Current Score: 82/100

Most structural issues are resolved. What remains are 6 concrete bugs — 2 of which silently break production features — plus missing pieces from approved-but-never-implemented fixes from Round 3.

---

## Bugs Still Present

### 1. `send-team-invite` audit log uses WRONG column names — every insert silently fails (Critical)
Lines 215-233 use `action_type`, `action_category`, `new_value`, `ip_address`, `user_agent`. The `comprehensive_audit_logs` table uses `event_type`, `action`, `event_category`, `after_value`, `actor_ip_address`, `actor_user_agent` (confirmed by memory). Every team invite audit log insert silently fails. Zero audit trail for sent invites.

### 2. Auth.tsx redirects partners to candidate onboarding (Critical)
Lines 215-256: `checkOnboardingStatus` fires when an authenticated partner lands on `/auth` after magic link. Freshly provisioned partners have `onboarding_completed_at = NULL`, so the code navigates to `/oauth-onboarding` (candidate flow). It never checks `force_password_change`. The partner never reaches `/partner-setup`. This was identified in Round 3 but never fixed.

### 3. `inviteInfo` typed as `any` (Code quality)
Line 67: `useState<any>(null)` with an eslint-disable comment papering over it. Violates project standards.

### 4. `console.error` in production code
`SendInviteTab.tsx` line 163: `console.error('Send invite error:', error)`. Project standard requires `logger.error`.

### 5. `InviteAnalyticsTab` uses `updated_at` instead of `used_at` for avg days
Lines 50-53: calculates acceptance time from `updated_at` which changes on any profile edit. The `invite_codes` table has `used_at` — the correct field. This was identified in Round 3 but never fixed.

### 6. `InviteAnalyticsTab` pending can go negative
Line 43: `pending = total - used - revoked` without clamping. If a code is both used AND revoked, pending goes negative, producing a negative-width bar in the chart.

### 7. `send-team-invite` interface declares `companyId: string` (not optional)
Line 15: `companyId: string` — but the validation on line 72 now allows it to be falsy for partners. The TypeScript interface is misleading. Should be `companyId?: string`.

---

## Implementation Plan

### Fix 1: `send-team-invite` audit log columns
Map: `action_type` → split into `event_type` + `action`, `action_category` → `event_category`, `new_value` → `after_value`, `ip_address` → `actor_ip_address`, `user_agent` → `actor_user_agent`. Also fix `companyId` type in interface.

### Fix 2: Auth.tsx partner redirect bypass
In `checkOnboardingStatus`, add early return when `user.user_metadata?.force_password_change === true`. These users will be routed correctly by `ProtectedRoute`.

### Fix 3: Type `inviteInfo`
Define `InviteInfo` interface with `referrerName`, `recipientName`, `recipientEmail`, `companyName`, `targetRole`, `valid`, `message`. Replace `useState<any>`.

### Fix 4: `console.error` → `logger.error`
In `SendInviteTab.tsx` line 163.

### Fix 5: Use `used_at` in analytics
Replace `updated_at` with `used_at` on line 52 of `InviteAnalyticsTab`.

### Fix 6: Clamp pending
`Math.max(0, total - used - revoked)` in `InviteAnalyticsTab` line 43.

---

### Files to Edit

| File | Changes |
|------|---------|
| `supabase/functions/send-team-invite/index.ts` | Fix audit log column names (lines 215-233); fix `companyId` type in interface (line 15) |
| `src/pages/Auth.tsx` | Add `force_password_change` early return in `checkOnboardingStatus` (line 219); define and use `InviteInfo` interface (line 67) |
| `src/components/invites/SendInviteTab.tsx` | Replace `console.error` with `logger.error` (line 163) |
| `src/components/invites/InviteAnalyticsTab.tsx` | Use `used_at` instead of `updated_at` (line 52); clamp pending (line 43) |

No database changes needed. One edge function redeployment (`send-team-invite`).

