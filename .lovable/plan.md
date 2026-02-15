
# Fix: CORS Header Mismatch Blocking Edge Function Calls

## Root Cause

The Supabase client at `src/integrations/supabase/client.ts` sends a custom header `x-application-name: thequantumclub` on every request. When the browser calls the edge function, it first sends a CORS preflight (OPTIONS) request. The browser checks whether `x-application-name` is listed in the `Access-Control-Allow-Headers` response header. It is **not** listed, so the browser blocks the actual POST request entirely, producing the generic "Failed to send a request to the Edge Function" error.

This is why:
- Direct testing via curl **works** (no CORS enforcement)
- Browser calls **fail** silently before the request is even sent

## Fix

### File: `supabase/functions/extract-skills-from-experience/index.ts`

Add `x-application-name` to the CORS `Access-Control-Allow-Headers` string (line 6):

**Before:**
```
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, ...'
```

**After:**
```
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, ...'
```

### No other files need changes.

The function code, frontend call, and config.toml are all correct. Only the missing CORS header causes the browser to reject the preflight.
