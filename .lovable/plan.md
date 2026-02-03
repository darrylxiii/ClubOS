
# Fix Instantly Integration Sync Issues

## Problem Summary

The Instantly integration has stopped working due to **the `InstantlyAPI` secret not being available to edge functions at runtime**. The secret exists in the Supabase secrets store, but edge functions cannot access it. This has been broken since December 24, 2025.

### Current State
- 2,100+ prospects in the CRM are not receiving engagement updates
- Campaign analytics are stale (0 total_sent despite replies)
- Webhooks are not registered (only 1 test event ever received)
- All sync attempts fail with: `"Instantly API key not configured"`

---

## Root Cause Analysis

| Issue | Finding |
|-------|---------|
| Secret exists | `InstantlyAPI` confirmed in secrets list |
| Runtime access fails | Edge functions check 3 env vars: `InstantlyAPI`, `INSTANTLY_API_KEY`, `INSTANTLY_API` - all return undefined |
| Functions deployed | `sync-instantly-campaigns` and `sync-instantly-leads` exist and are callable |
| JWT auth working | Functions correctly return 401 when called without auth |

The issue is that **secrets added to Supabase are not automatically available to all edge functions after deployment**. The functions may need to be redeployed to pick up the secret, or the secret name needs to match what the runtime expects.

---

## Fix Plan

### Step 1: Verify and Redeploy Edge Functions

Redeploy all Instantly-related edge functions to ensure they pick up the current secrets:

**Functions to redeploy:**
- `sync-instantly-campaigns`
- `sync-instantly-leads`
- `sync-instantly-account-health`
- `sync-instantly-sequence-steps`
- `sync-instantly-blocklist`
- `instantly-webhook-receiver`
- `register-instantly-webhooks`
- `send-instantly-reply`
- `fetch-instantly-analytics`
- `import-instantly-campaign`

### Step 2: Standardize Secret Name

Update the `instantly-client.ts` shared module to use a consistent, standard naming convention for the API key:

```text
Current (checking multiple names):
  InstantlyAPI, INSTANTLY_API_KEY, INSTANTLY_API

Change to:
  INSTANTLY_API_KEY (primary, industry standard)
```

**File:** `supabase/functions/_shared/instantly-client.ts`

Update lines 50-56 to log more diagnostic information:
- Log which env vars were checked
- Log first few characters of key if found (masked for security)

### Step 3: Add Integration Health Check Endpoint

Create a new edge function to test API connectivity without triggering a full sync:

**New file:** `supabase/functions/test-instantly-connection/index.ts`

This function will:
- Check if `INSTANTLY_API_KEY` is available
- Make a simple API call to `/accounts/me`
- Return connection status, API response time, and workspace info

### Step 4: Register Webhooks

Once the API key is working, register webhooks for real-time updates:

1. Call `register-instantly-webhooks` with action `register`
2. Register these events:
   - `lead.replied`
   - `lead.interested`
   - `lead.meeting_booked`
   - `email.bounced`
   - `email.unsubscribed`

### Step 5: Run Full Data Sync

Execute a complete sync in this order:
1. `sync-instantly-campaigns` - Fetch all campaigns and analytics
2. `sync-instantly-leads` with mode `full` - Sync all leads, not just "hot" ones
3. `sync-instantly-account-health` - Get sending account status

### Step 6: Add Sync Status UI Component

Create a diagnostic panel in the Email Sequencing Hub that shows:
- Last successful sync timestamp
- API connection status
- Webhook registration status
- Error messages if any

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/_shared/instantly-client.ts` | Add diagnostic logging for secret resolution |
| `supabase/functions/test-instantly-connection/index.ts` | **NEW** - Health check endpoint |
| `supabase/config.toml` | Add config for test-instantly-connection |
| `src/components/instantly/InstantlySyncStatus.tsx` | **NEW** - Sync status UI component |

---

## Technical Details

### Updated instantly-client.ts (lines 49-60)

```typescript
export async function instantlyRequest<T>(
  endpoint: string,
  options: InstantlyRequestOptions = {}
): Promise<InstantlyResponse<T>> {
  // Check multiple possible env var names for the API key
  const apiKey = Deno.env.get('INSTANTLY_API_KEY') 
    || Deno.env.get('InstantlyAPI') 
    || Deno.env.get('INSTANTLY_API');
  
  if (!apiKey) {
    const availableEnvVars = Object.keys(Deno.env.toObject())
      .filter(k => k.toLowerCase().includes('instant'));
    console.error('[Instantly] API key not found. Available instantly-related vars:', availableEnvVars);
    return { 
      error: 'Instantly API key not configured. Available vars: ' + availableEnvVars.join(', '), 
      status: 500 
    };
  }

  // Log successful key resolution (masked)
  console.log(`[Instantly] Using API key: ${apiKey.substring(0, 8)}...`);
  // ... rest of function
}
```

### New Health Check Function

```typescript
// supabase/functions/test-instantly-connection/index.ts
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('INSTANTLY_API_KEY') 
    || Deno.env.get('InstantlyAPI');
  
  if (!apiKey) {
    return new Response(JSON.stringify({
      connected: false,
      error: 'API key not found in environment',
      checked_vars: ['INSTANTLY_API_KEY', 'InstantlyAPI'],
      available_vars: Object.keys(Deno.env.toObject())
        .filter(k => k.toLowerCase().includes('instant')),
    }), { status: 500, headers: corsHeaders });
  }

  // Test API call
  const start = Date.now();
  const response = await fetch('https://api.instantly.ai/api/v2/accounts/me', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  const latency = Date.now() - start;

  if (!response.ok) {
    return new Response(JSON.stringify({
      connected: false,
      error: `API returned ${response.status}`,
      latency_ms: latency,
    }), { status: 500, headers: corsHeaders });
  }

  const account = await response.json();
  return new Response(JSON.stringify({
    connected: true,
    workspace: account.workspace_name,
    email: account.email,
    latency_ms: latency,
  }), { headers: corsHeaders });
});
```

---

## Verification Steps

After implementation:

1. **Test connection:** Call `test-instantly-connection` - should return `connected: true`
2. **Verify campaigns sync:** Trigger `sync-instantly-campaigns` - should create/update campaigns
3. **Verify leads sync:** Trigger `sync-instantly-leads` - should import prospects
4. **Check webhook registration:** Call `register-instantly-webhooks` with action `list`
5. **Monitor webhook logs:** Check `instantly_webhook_logs` table for incoming events

---

## Expected Outcome

After fixes:
- Campaigns will show accurate `total_sent`, `total_opened`, `total_replied` counts
- ~2,100 prospects will have updated engagement metrics
- Real-time webhook updates will flow for replies, interest changes, bounces
- Sync status will be visible in the Email Sequencing Hub UI
