

# Fix Fathom Sync "Failed to fetch" Error

## Problem

The "Failed to fetch" error occurs because the browser's CORS preflight (OPTIONS) request is rejected. The edge function's CORS allow-headers list is incomplete -- it's missing headers that the Supabase JS client automatically sends (e.g., `x-application-name`).

The browser blocks the actual POST request before it even reaches the function.

## Fix

Update the CORS headers in `supabase/functions/sync-fathom-recordings/index.ts` to include all headers the Supabase client sends:

```
authorization, x-client-info, apikey, content-type,
x-application-name,
x-supabase-client-platform,
x-supabase-client-platform-version,
x-supabase-client-runtime,
x-supabase-client-runtime-version
```

## File to Modify

| File | Change |
|---|---|
| `supabase/functions/sync-fathom-recordings/index.ts` | Update `corsHeaders` to include all required headers |

This is a one-line fix -- updating the `Access-Control-Allow-Headers` string on line 5.

