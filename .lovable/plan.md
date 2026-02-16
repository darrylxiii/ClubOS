

# Fix: Strategist Dropdown Empty + Provisioning Request Failure

Two separate bugs, both fixable in the same pass.

---

## Bug 1: Strategist Dropdown Shows No Options

**Root cause**: The `loadStrategists` function in `useProvisionForm.ts` (line 183) uses a Supabase relational join: `profiles!inner(id, full_name, email)`. This join syntax requires a foreign key relationship between `user_roles.user_id` and `profiles.id`. No such foreign key exists on the `user_roles` table, so the query silently returns empty results.

**Fix**: Replace the join query with two sequential queries (same pattern already used in `useStrategistWorkload.ts`):
1. Fetch `user_roles` where `role = 'strategist'`
2. Fetch `profiles` where `id` is in the resulting user IDs

This avoids the FK dependency entirely.

**File**: `src/components/admin/partner-provisioning/useProvisionForm.ts` (lines 181-195)

```typescript
const loadStrategists = useCallback(async () => {
  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'strategist');

  if (!roles?.length) {
    // Fallback: also include admins so there's always someone to assign
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    if (!adminRoles?.length) { setStrategists([]); return; }
    const ids = [...new Set(adminRoles.map(r => r.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ids);
    setStrategists(
      (profiles || []).map(p => ({ id: p.id, full_name: p.full_name, email: p.email || '' }))
    );
    return;
  }

  const userIds = [...new Set(roles.map(r => r.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds);

  setStrategists(
    (profiles || []).map(p => ({ id: p.id, full_name: p.full_name, email: p.email || '' }))
  );
}, []);
```

Currently there is only 1 user with the `strategist` role in the database. The fallback to include admins ensures the dropdown is always populated with assignable team members.

---

## Bug 2: "Failed to send a request to the Edge Function"

**Root cause**: The Supabase client (auto-generated, line 29) sends a custom header `x-application-name: thequantumclub` on every request. The edge function's CORS `Access-Control-Allow-Headers` list does not include this header. When the browser sends a preflight OPTIONS request, the server responds without allowing `x-application-name`, so the browser blocks the actual POST request entirely.

**Fix**: Add `x-application-name` to the CORS allowed headers in the edge function.

**File**: `supabase/functions/provision-partner/index.ts` (line 6)

Change the `Access-Control-Allow-Headers` value from:

```
authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version
```

To:

```
authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version
```

Then redeploy the `provision-partner` edge function.

---

## Files to Modify

| File | Change |
|---|---|
| `src/components/admin/partner-provisioning/useProvisionForm.ts` | Replace join query with two-step fetch; add admin fallback |
| `supabase/functions/provision-partner/index.ts` | Add `x-application-name` to CORS headers |

## Implementation Sequence

1. Fix the CORS header in the edge function (unblocks all requests)
2. Fix the strategist query in `useProvisionForm.ts` (populates dropdown)
3. Redeploy the edge function

