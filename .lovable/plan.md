

# Fix: Avatar Hub Password Saving

## Problem
The `avatar-account-credentials` edge function checks admin status using `profiles.role` (line 42-43), but this project stores roles in the `user_roles` table. The `profiles` table likely has no `role` column, so the admin check always returns 403 "Admin access required", silently preventing credential saves.

## Solution
Update the edge function to check the `user_roles` table instead of `profiles.role`, matching the pattern used by all other edge functions in the project.

## Changes

### `supabase/functions/avatar-account-credentials/index.ts`
Replace lines 41-44 (the admin role check) with the correct `user_roles` table lookup:

```typescript
// Check admin role via user_roles table (matches project pattern)
const { data: roles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId);

const userRoles = (roles || []).map((r: any) => r.role);
if (!userRoles.includes('admin') && !userRoles.includes('super_admin') && !userRoles.includes('strategist')) {
  return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
```

This is a single-file fix. No other changes needed.

