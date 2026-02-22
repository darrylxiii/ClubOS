
# Fix Moneybird "Not Connected" on Settings Tab

## Root Cause

The `moneybird-test-connection` edge function successfully reaches Moneybird's API but receives a **404 response**. This means the `MONEYBIRD_ADMINISTRATION_ID` secret does not match an administration accessible by the `MONEYBIRD_ACCESS_TOKEN`. This is either because:
- The access token expired (Moneybird personal tokens can expire)
- The administration ID is incorrect or was changed

**Evidence:** Direct server-side call returns `{ "connected": false, "error": "API error: 404" }` with HTTP 200.

## Secondary Issues

| # | Issue | Impact |
|---|---|---|
| 1 | **CORS headers missing platform headers** in `moneybird-test-connection/index.ts` | First browser request fails with "Failed to fetch" due to CORS preflight rejection |
| 2 | **No retry logic** in `useMoneybirdConnection` hook | Cold-start failures show "Not Connected" instead of retrying |
| 3 | **Error message is generic** -- shows "Moneybird credentials not configured" fallback even when the real error is "API error: 404" | User sees wrong guidance (tells them to configure secrets that already exist) |

## Fix Plan

### Step 1: User Action -- Verify/Update Moneybird Credentials

1. Log into moneybird.com
2. Go to Settings (gear icon) then Developer then Personal Access Tokens
3. Verify the existing token is still active, or generate a new one
4. Copy the administration ID from the URL: `https://moneybird.com/XXXXXXX/...` (the number)
5. Update both secrets: `MONEYBIRD_ACCESS_TOKEN` and `MONEYBIRD_ADMINISTRATION_ID`

### Step 2: Fix CORS Headers

Update `moneybird-test-connection/index.ts` line 5 to include full Supabase client headers:
```
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version'
```

### Step 3: Add Retry Logic to `useMoneybirdConnection`

Update the `queryFn` in `src/hooks/useMoneybird.ts` to retry once on network failure (cold-start):

```typescript
queryFn: async () => {
  let response = await supabase.functions.invoke('moneybird-test-connection');
  
  // Retry once on cold-start failure
  if (response.error?.message?.includes('Failed to send')) {
    await new Promise(r => setTimeout(r, 2500));
    response = await supabase.functions.invoke('moneybird-test-connection');
  }

  if (response.error) {
    return { connected: false, error: response.error.message };
  }
  return response.data;
},
retry: 1,
retryDelay: 3000,
```

### Step 4: Improve Error Message in `MoneybirdSettingsCard`

When `connection.error` contains "API error: 404", show a specific message:
> "Moneybird returned 404. The administration ID may be incorrect or the access token may have expired. Please verify your credentials in Settings."

Instead of the current generic "Configure your Moneybird tokens to connect."

## Implementation Order

1. Fix CORS headers in `moneybird-test-connection/index.ts`
2. Add retry logic to `useMoneybirdConnection` in `src/hooks/useMoneybird.ts`
3. Improve error display in `src/components/admin/MoneybirdSettingsCard.tsx`
4. Deploy edge function
5. User updates secrets with fresh credentials
