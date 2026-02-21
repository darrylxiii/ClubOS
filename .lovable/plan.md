

# Fix: Password Reset Lookup Fails When Profile Email Differs from Auth Email

## The Real Problem

Here's the data situation for Darryl:

| Table | ID | Email |
|---|---|---|
| `auth.users` | `8b762c96...` | `darryl@thequantumclub.nl` (login email) |
| `profiles` | `8b762c96...` | `darryl@qualogy.com` (stale employer email) |
| `profiles` | `c6670a9d...` | `dmehilal@qualogy.com` (orphan, no auth user) |
| `profiles` | `413baf57...` | `darryl@qualogy.com` (test account) |

The `password-reset-request` function only queries `profiles.email`. When Darryl types `darryl@thequantumclub.nl`, it finds nothing, silently returns 200, and never sends an email.

Your previous suggestion to scan `auth.users` via `listUsers` and iterate is risky — it could leak user existence in timing attacks and is wasteful at scale.

## The Correct Fix — Use `auth.users` as the Primary Lookup (Not a Fallback)

For a password reset, the **auth email IS the canonical identity** — it's what the user logs in with. The profile email is secondary metadata (could be an employer email, a personal email, anything). The function should look up auth users first, then load the profile by `user_id` for the display name.

This is safe because:
- We already use the `SUPABASE_SERVICE_ROLE_KEY` (admin client) in this function
- We query for exactly one user by exact email match — no enumeration
- We still return the same generic "If an account exists..." message regardless of result

### Changes to `supabase/functions/password-reset-request/index.ts`

Replace the profile-only lookup (lines 143–162) with:

```typescript
// Step 1: Look up auth user by the email they typed (this is the login identity)
const { data: authLookup } = await supabaseAdmin
  .from('auth.users')  // NO — can't query auth schema via PostgREST
  ...
```

Actually, we cannot query `auth.users` via the Supabase JS client (PostgREST doesn't expose the `auth` schema). The correct admin API method is:

```typescript
// Look up auth user by email — admin API, single targeted call
const { data: { users: matchedUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers({
  page: 1,
  perPage: 1,
});
```

Unfortunately `listUsers` doesn't support email filtering as a parameter — it returns pages. However, there's no `getUserByEmail` in the Supabase Admin SDK either.

The **safe, efficient** approach: query the `profiles` table by BOTH `email` column AND by joining against the user's auth email. Since we can't query `auth.users` via PostgREST, the cleanest solution is:

**Create a small database function** that safely looks up a `user_id` from `auth.users` by email, then call it from the edge function. This keeps the auth lookup server-side in PostgreSQL (where it belongs), is a single parameterized call, and exposes zero enumeration risk.

### Step 1: Database Migration — Create a secure lookup function

```sql
CREATE OR REPLACE FUNCTION public.get_user_id_by_auth_email(lookup_email TEXT)
RETURNS TABLE(user_id UUID, auth_email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email::TEXT
  FROM auth.users au
  WHERE LOWER(au.email) = LOWER(lookup_email)
  LIMIT 1;
END;
$$;

-- Revoke from public, only service role can call this
REVOKE ALL ON FUNCTION public.get_user_id_by_auth_email(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_id_by_auth_email(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_id_by_auth_email(TEXT) FROM authenticated;
```

This function:
- Runs as `SECURITY DEFINER` so it can read `auth.users`
- Is revoked from `anon` and `authenticated` — only the service role key can call it
- Returns at most 1 row (the user_id and confirmed email)
- Uses parameterized input, no injection risk

### Step 2: Update `password-reset-request/index.ts`

Replace lines 143–162 with:

```typescript
// Look up user by auth email first (the canonical login identity)
const { data: authMatch, error: authLookupError } = await supabaseAdmin
  .rpc('get_user_id_by_auth_email', { lookup_email: email.toLowerCase() })
  .maybeSingle();

if (authLookupError) {
  console.error(`[PasswordReset][${correlationId}] Auth lookup error:`, authLookupError);
}

let userId: string | null = null;
let userName: string | null = null;
let userEmail: string | null = null;

if (authMatch) {
  userId = authMatch.user_id;
  userEmail = email; // Always send to the email they typed

  // Load profile for display name
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', authMatch.user_id)
    .maybeSingle();

  userName = profile?.full_name || email.split('@')[0];
} else {
  // Fallback: check profiles table directly (covers edge cases)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (profile) {
    userId = profile.id;
    userName = profile.full_name;
    userEmail = profile.email || email;
  }
}
```

This means:
1. Primary: Look up `auth.users.email` via the secure RPC — finds `darryl@thequantumclub.nl` immediately
2. Load display name from `profiles` by `id` — works regardless of what email is in the profile
3. Fallback: If somehow the RPC returns nothing, try the old `profiles.email` lookup (belt + suspenders)

### Step 3: Clean up orphan/duplicate data

Also run a one-time cleanup:

```sql
-- Remove orphan profile with no matching auth user
DELETE FROM public.profiles WHERE id = 'c6670a9d-7cca-49bb-af56-8d28090ce784'
  AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'c6670a9d-7cca-49bb-af56-8d28090ce784');
```

---

## Files to Change

| File | Change |
|---|---|
| New migration SQL | Create `get_user_id_by_auth_email` RPC function + revoke permissions |
| `supabase/functions/password-reset-request/index.ts` | Replace profile-only lookup with auth-first RPC lookup |

## What Happens After

Darryl types `darryl@thequantumclub.nl` ->
- `get_user_id_by_auth_email('darryl@thequantumclub.nl')` -> returns `8b762c96...`
- Profile loaded by id -> "Darryl Mehilal"
- Token generated, email sent to `darryl@thequantumclub.nl`
- Darryl receives the email and can set/reset his password

No `listUsers` iteration. No auth schema exposed to client. Single parameterized RPC call.
