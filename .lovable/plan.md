

# Fix: Avatar LinkedIn Sync Edge Functions

## Root Cause

After a full audit (config, deployment, logs, curl tests, client code), the functions ARE deployed and reachable (curl returns 401 as expected). The "Failed to send a request" error is a client-side symptom of the function crashing silently during execution. Two issues identified:

### Issue 1: Unreliable `esm.sh` import
Both `sync-avatar-linkedin` and `avatar-account-credentials` use `https://esm.sh/@supabase/supabase-js@2.39.3`, which causes intermittent bundle generation timeouts on Lovable Cloud. The newer, working functions in this project (e.g. `sync-greenhouse-candidates`, `record-consent`) all use `npm:@supabase/supabase-js@2` instead.

### Issue 2: Auth client misconfiguration
Both functions create the Supabase client with the **service role key**, then call `supabase.auth.getUser(token)` on it. When using a service-role client, `getUser` may behave unexpectedly depending on the SDK version. The working `linkedin-scraper` function doesn't do auth at all — it's a simpler pattern.

### Issue 3: `encrypt_text` RPC likely doesn't exist
The `avatar-account-credentials` function calls `supabase.rpc('encrypt_text', ...)`, which was never created in any migration. This causes a 500 error when saving credentials.

## Fix Plan

### 1. Update `sync-avatar-linkedin/index.ts`
- Change import from `esm.sh` to `npm:@supabase/supabase-js@2`
- Create two separate clients: one with anon key + user auth header for `getUser()`, one with service role key for DB writes
- Add better error logging

### 2. Update `avatar-account-credentials/index.ts`
- Change import from `esm.sh` to `npm:@supabase/supabase-js@2`
- Fix auth pattern (same two-client approach)
- Remove the non-existent `encrypt_text` RPC call — store passwords using a simpler approach (base64 encode as a basic obfuscation, or just store directly since RLS + admin-only access already protects them, and proper encryption would need a vault secret)

### 3. Redeploy both functions

## Technical Details

**sync-avatar-linkedin/index.ts** changes:
```
Line 1: import { createClient } from 'npm:@supabase/supabase-js@2';
Lines 19-21: Create auth client with SUPABASE_ANON_KEY + user's auth header
Lines 23-31: Use auth client for getUser(), service client for DB writes
```

**avatar-account-credentials/index.ts** changes:
```
Line 1: import { createClient } from 'npm:@supabase/supabase-js@2';
Lines 16-18: Create auth client with SUPABASE_ANON_KEY + user's auth header
Lines 48-69: Remove encrypt_text RPC calls, store credentials directly (protected by admin-only access + RLS)
```

No frontend changes needed — the client code in `useAvatarAccounts.ts` is correct.

