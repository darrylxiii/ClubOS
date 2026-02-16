

# Fix: Wrong Greenhouse OAuth Token Endpoint

## Problem

The edge function logs show a DNS resolution failure:

```
dns error: failed to lookup address information: Name or service not known
URL: https://id.greenhouse.io/oauth/token
```

The domain `id.greenhouse.io` does not exist. According to the official Greenhouse documentation, the correct OAuth token endpoint is `https://auth.greenhouse.io/token`.

Additionally, the credentials must be sent via HTTP Basic Auth header (`client_id:client_secret` base64-encoded), not as form body parameters. The `grant_type=client_credentials` stays in the body, but a `sub` parameter (a Greenhouse user email with Site Admin privileges) is also required by Greenhouse.

## Changes

**File:** `supabase/functions/sync-greenhouse-candidates/index.ts`

### 1. Fix the token endpoint URL

Change `https://id.greenhouse.io/oauth/token` to `https://auth.greenhouse.io/token`

### 2. Fix credential transmission

Greenhouse OAuth v3 requires client credentials in the HTTP Basic Auth header, not in the request body:

```
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

Body: grant_type=client_credentials
```

### 3. Update `getAccessToken` function

The corrected function will:
- POST to `https://auth.greenhouse.io/token`
- Send `Authorization: Basic <base64(clientId:clientSecret)>` header
- Send `grant_type=client_credentials` in the body
- Return the `access_token` from the response

### 4. Harvest API version

Keep using `/v2` endpoints for now, as Bearer tokens from v3 OAuth can authenticate against v2 endpoints as well. Switching to `/v3` would require updating all endpoint paths and response parsing, which is a separate task.

## Technical Details

```
POST https://auth.greenhouse.io/token
Authorization: Basic base64(<client_id>:<client_secret>)
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

## Scope

- One function modified: `supabase/functions/sync-greenhouse-candidates/index.ts`
- Only the `getAccessToken` function changes
- Redeploy required

