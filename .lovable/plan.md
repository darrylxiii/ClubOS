

# Fix: Partners Being Routed to Candidate Onboarding

## Root Cause

Two bugs combine to send Nick (and any provisioned partner) to the candidate onboarding flow:

**Bug 1 — Auth.tsx (line 293)**: After login, the redirect logic checks `onboarding_completed_at` on the profile but does NOT check the user's role first. Since Nick's `onboarding_completed_at` is `null`, he gets sent to `/oauth-onboarding` (candidate questions) even though he's a partner.

**Bug 2 — `provision-partner` edge function**: When provisioning a partner, it never sets `onboarding_completed_at` on the profile. The admin has already provided all the necessary info — there's no onboarding left to do. This field stays `null`, triggering the redirect above.

`ProtectedRoute.tsx` correctly handles this (it skips onboarding for non-candidates), but `Auth.tsx` navigates directly before `ProtectedRoute` ever runs.

**Company display**: Nick's company IS correctly linked in the database (`company_id`, `company_members` both set to Dore & Rose). If it didn't show in the dashboard, it was likely a timing issue before the page refreshed post-provisioning.

## Plan

### 1. Fix Auth.tsx — check roles before onboarding redirect

Before the `onboarding_completed_at` check (line 278-310), fetch the user's roles and skip the onboarding redirect for partners/admins/strategists — same logic as `ProtectedRoute`:

```typescript
// After force_password_change check, before onboarding check:
const { data: userRoles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id);

const roles = userRoles?.map(r => r.role) || [];
const isElevatedRole = roles.includes('partner') || roles.includes('admin') || roles.includes('strategist');

if (isElevatedRole) {
  navigate('/home');
  return;
}

// ... existing onboarding check for candidates only
```

### 2. Fix `provision-partner` edge function — set `onboarding_completed_at`

In the profile update step, add `onboarding_completed_at: new Date().toISOString()` so provisioned partners never trigger the onboarding flow.

### 3. Database migration — backfill Nick's record

Set `onboarding_completed_at` for all existing partners who have `null`:

```sql
UPDATE profiles
SET onboarding_completed_at = NOW()
WHERE id IN (
  SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'partner'
)
AND onboarding_completed_at IS NULL;
```

### Files

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Add role check before onboarding redirect — partners/admins/strategists go to `/home` |
| `supabase/functions/provision-partner/index.ts` | Set `onboarding_completed_at` during profile creation |
| New migration | Backfill `onboarding_completed_at` for existing partners |

