

# Fix: sync-avatar-linkedin -- The Real Solution

## What's Actually Happening

The analytics logs prove it definitively:
- Every POST to `sync-avatar-linkedin` returns **401**
- The function boots and shuts down without logging anything (no "[sync-avatar-linkedin]" messages)
- This means the **Supabase gateway** is rejecting the request before the function code runs

## Why

`verify_jwt = true` does NOT work on Lovable Cloud. Lovable Cloud signs JWTs with ES256, but the Supabase gateway expects HS256 for `verify_jwt = true`. The gateway rejects every request as unauthorized. The function never boots for the actual request.

The previous fix set `verify_jwt = true` thinking the candidate scraper uses the same setting -- but the candidate scraper (`linkedin-scraper-proxycurl`) has had zero recent calls in the logs, so there's no proof it actually works either.

## The Correct Pattern (from Lovable Cloud documentation)

1. Set `verify_jwt = false` so the gateway lets requests through
2. Validate the JWT **in code** using `supabase.auth.getUser()` with the anon key client (NOT the service role client)
3. Use `npm:@supabase/supabase-js@2` import (not `esm.sh` which causes bundle timeouts)

## Changes

### File 1: `supabase/config.toml` (line 1212)

```toml
# Before
[functions.sync-avatar-linkedin]
verify_jwt = true

# After
[functions.sync-avatar-linkedin]
verify_jwt = false
```

### File 2: `supabase/functions/sync-avatar-linkedin/index.ts` -- Full rewrite

Key changes:
- Import from `npm:@supabase/supabase-js@2`
- Expanded CORS headers (matching working functions like `sync-greenhouse-candidates`)
- In-code JWT validation using anon key + user's auth header
- Service role client for DB operations
- All existing Apify/Proxycurl/avatar storage logic preserved

```typescript
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Auth validation using anon client
const authHeader = req.headers.get('Authorization');
if (!authHeader) return 401;

const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: authHeader } },
});
const { data: { user }, error } = await authClient.auth.getUser();
if (error || !user) return 401;

// Service client for DB writes
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ... rest of existing logic unchanged
```

### File 3: `supabase/functions/linkedin-scraper-proxycurl/index.ts`

Same fix applied -- change to `npm:` import and expanded CORS headers, keep existing auth logic (which already uses the correct anon-key pattern but with esm.sh import).

### Deployment

Redeploy all three functions after changes.

## Why This Will Work

This follows the exact pattern documented for Lovable Cloud (from the troubleshooting knowledge base):
- `verify_jwt = false` bypasses the broken gateway ES256 check
- In-code `getUser()` with anon key + auth header correctly validates the JWT
- `npm:` imports prevent bundle generation timeouts
- Expanded CORS headers match the working functions in this project

