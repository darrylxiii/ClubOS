

# Fix: Edge Function "Failed to send request" Error

## Root Cause
The `parse-email-candidates` edge function's CORS headers are missing `x-application-name` (and other headers the Supabase client sends). The client is configured with `x-application-name: 'thequantumclub'` as a global header, so every `supabase.functions.invoke()` call sends it. The browser's CORS preflight rejects the request because that header is not in `Access-Control-Allow-Headers`.

## Fix (single file change)

**File:** `supabase/functions/parse-email-candidates/index.ts`

Update the `corsHeaders` object (line 5-9) to include the full set of allowed headers matching the project standard:

```
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-api-version, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, traceparent, tracestate",
};
```

This adds the missing headers: `x-application-name`, `x-api-key`, `x-supabase-api-version`, `traceparent`, `tracestate`, plus the `Access-Control-Allow-Methods` and `Access-Control-Max-Age` that the project CORS standard requires.

No other files need changes. After redeployment, the edge function will accept the preflight and the extraction flow will work.

