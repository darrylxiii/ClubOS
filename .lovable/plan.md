
# Fix Calendar Edge Functions: CORS Header Mismatch

## Root Cause

All four calendar-related edge functions have an outdated `Access-Control-Allow-Headers` value:

```
authorization, x-client-info, apikey, content-type
```

The Supabase JS client (v2.58.0) now sends additional headers with every request:
- `x-supabase-client-platform`
- `x-supabase-client-platform-version`
- `x-supabase-client-runtime`
- `x-supabase-client-runtime-version`

Because these headers are not listed in the CORS preflight response, the browser blocks the request entirely, resulting in "Failed to fetch" before the request ever reaches the edge function. This is confirmed by the edge function logs showing the function boots but never receives a request.

## Fix

Update the `corsHeaders` in all four edge functions to include the full set of allowed headers:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
```

## Files changed

| File | Change |
|---|---|
| `supabase/functions/google-calendar-auth/index.ts` | Update CORS headers (line 6) |
| `supabase/functions/google-calendar-events/index.ts` | Update CORS headers (line 6) |
| `supabase/functions/microsoft-calendar-auth/index.ts` | Update CORS headers (line 6) |
| `supabase/functions/detect-calendar-interviews/index.ts` | Update CORS headers (line 6) |
| `supabase/functions/refresh-calendar-tokens/index.ts` | Update CORS headers (line 5) -- for consistency, though this one is called server-to-server |

No other code changes needed. After deployment, the "Connect Google Calendar" button on the Settings page will successfully reach the edge function and return an OAuth URL.
