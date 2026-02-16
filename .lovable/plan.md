

# Fix: Avatar LinkedIn Sync -- Holistic Step-by-Step

## Root Cause (confirmed via analytics logs)

The function IS deployed and reachable. CORS preflight (OPTIONS) returns 200. But the actual POST returns **401** every time. The Supabase JS client wraps this as "Failed to send a request to the Edge Function" -- a misleading error message.

The 401 comes from the in-code `getUser()` call failing. The working candidate scraper (`linkedin-scraper-proxycurl`) avoids this entirely by using `verify_jwt = true` in config -- Supabase's gateway validates the JWT before the function even boots, and the function never needs to call `getUser()`.

The avatar sync function uses `verify_jwt = false` and tries to validate auth manually with `getUser()`, which fails on Lovable Cloud's signing-keys system.

## The Fix: Mirror the Working Pattern Exactly

### Step 1: Change `sync-avatar-linkedin` config to `verify_jwt = true`

**File:** `supabase/config.toml` (line 1212)

```toml
# Before
[functions.sync-avatar-linkedin]
verify_jwt = false

# After
[functions.sync-avatar-linkedin]
verify_jwt = true
```

This makes Supabase's gateway validate the JWT before the function boots -- exactly like `linkedin-scraper-proxycurl`.

### Step 2: Simplify `sync-avatar-linkedin/index.ts` auth

Remove the manual two-client auth dance. Since the gateway already verified the JWT, we know the request is from an authenticated user. Use the service role client only (for DB writes).

Changes:
- Remove the `authClient` creation and `getUser()` call
- Keep only the service role client for database operations
- Remove the `anonKey` variable (no longer needed)

### Step 3: Change `avatar-account-credentials` config to `verify_jwt = true`

Same issue, same fix:

```toml
# Before
[functions.avatar-account-credentials]
verify_jwt = true

# After -- already true from the plan, but the code still needs the admin check
```

Wait -- `avatar-account-credentials` needs an **admin role check** (not just "is authenticated"). So it needs `getUser()` to get the user ID, then checks the `profiles` table for role. For this function, we keep `verify_jwt = false` but fix the auth by extracting the user ID from the JWT claims directly instead of calling `getUser()`.

Revised approach for `avatar-account-credentials`:
- Keep `verify_jwt = false`
- Replace `getUser()` with manual JWT decode (extract `sub` from the JWT payload -- it's a standard JWT, the claims are in the payload)
- Use the extracted user ID to check admin role via service client

### Step 4: Update `sync-avatar-linkedin/index.ts` -- Full Rewrite

Strip it to match the working `linkedin-scraper-proxycurl` pattern:

```text
1. Import from esm.sh (same as working function)
2. CORS headers (same as working function)  
3. Auth: None needed (verify_jwt = true handles it)
4. Parse body: { accountId, linkedinUrl }
5. Try Apify, fallback to Proxycurl (keep existing logic)
6. Update linkedin_avatar_accounts row
7. Return result
```

### Step 5: Update `avatar-account-credentials/index.ts`

```text
1. Import from esm.sh (same as working functions)
2. CORS headers
3. Extract user ID from JWT payload (decode base64 middle segment)
4. Check admin role via service client
5. Store credentials (existing logic)
```

### Step 6: Redeploy both functions

### Step 7: Verify with curl test

## File Changes Summary

| File | Change |
|------|--------|
| `supabase/config.toml` | Line 1212: change `verify_jwt = false` to `verify_jwt = true` for `sync-avatar-linkedin` |
| `supabase/functions/sync-avatar-linkedin/index.ts` | Full rewrite: remove manual auth, use `esm.sh` import, keep Apify/Proxycurl + DB update logic |
| `supabase/functions/avatar-account-credentials/index.ts` | Switch to `esm.sh` import, replace `getUser()` with JWT decode for user ID extraction |

## Why This Will Work

The candidate LinkedIn scraper proves the pattern:
- Same `supabase.functions.invoke()` call from the client
- Same `esm.sh` import
- `verify_jwt = true` so the gateway handles auth
- No manual `getUser()` calls
- Simple, clean, no room for auth misconfiguration

