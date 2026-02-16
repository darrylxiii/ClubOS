

# Fix: "Set Password" Link Fails for OAuth Users

## Problem

The "Send Setup Link" button fails with "An error occurred" because the browser blocks the request before it reaches the server.

## Root Cause

Same CORS issue we fixed on `provision-partner`: the Supabase client sends a custom `x-application-name` header on every request, but the `password-reset-request` edge function does not include it in its `Access-Control-Allow-Headers` list. The browser's preflight (OPTIONS) request is rejected, so the actual POST never fires.

The edge function logs confirm this -- the function boots but no request is ever processed.

## Fix

**File**: `supabase/functions/password-reset-request/index.ts` (line 7)

Change:
```
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
```

To:
```
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name"
```

Then redeploy the function.

## Scope Check

Other edge functions likely have the same problem. After this fix, we should audit all edge functions for the same missing header to prevent this from recurring. But for now, this single-line change unblocks Jasper immediately.

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/password-reset-request/index.ts` | Add `x-application-name` to CORS headers |

