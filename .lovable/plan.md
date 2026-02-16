

# Fix: Greenhouse Edge Function CORS Failure

## Root Cause

The Supabase client is configured with a custom global header `x-application-name: 'thequantumclub'` (in `src/integrations/supabase/client.ts`). This header is sent on every request, including calls to `supabase.functions.invoke`.

However, the `sync-greenhouse-candidates` edge function does not include `x-application-name` in its `Access-Control-Allow-Headers` CORS whitelist. This causes the browser's CORS preflight (OPTIONS) request to be rejected, resulting in the generic "Failed to send a request to the Edge Function" error.

The function itself is deployed and working -- a direct server-side call returns a proper 401 response, confirming it is reachable.

## Fix

**File:** `supabase/functions/sync-greenhouse-candidates/index.ts`

Add `x-application-name` to the CORS `Access-Control-Allow-Headers` string:

```
// Before
'Access-Control-Allow-Headers':
  'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, ...'

// After
'Access-Control-Allow-Headers':
  'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, ...'
```

Then redeploy the function.

## Scope

- One line change in one file
- No UI or database changes needed

