

# Fix Greenhouse Integration -- Switch to OAuth Authentication

## Problem

Two issues prevent the sync from working:

1. The `GREENHOUSE_API_KEY` secret was never saved (it does not appear in the project secrets).
2. The edge function uses Basic Auth with a single API key, but you have Greenhouse OAuth v3 credentials (Client ID + Client Secret), which require a different authentication flow.

## Solution

Update the edge function to use Greenhouse OAuth token exchange and store both credentials as secrets.

## Secrets to Add

- **GREENHOUSE_CLIENT_ID** -- your Greenhouse OAuth Client ID
- **GREENHOUSE_CLIENT_SECRET** -- your Greenhouse OAuth Client Secret

The old `GREENHOUSE_API_KEY` reference will be removed.

## Edge Function Changes

**File:** `supabase/functions/sync-greenhouse-candidates/index.ts`

Replace the Basic Auth helper with an OAuth token exchange:

1. Read `GREENHOUSE_CLIENT_ID` and `GREENHOUSE_CLIENT_SECRET` from environment
2. Exchange them for a Bearer access token via Greenhouse's OAuth token endpoint (`POST https://id.greenhouse.io/oauth/token`)
3. Use the Bearer token in all Harvest API requests instead of Basic Auth
4. Cache the token for the duration of the function invocation (no need to re-fetch per request)

### Key code changes

- Remove the `ghHeaders()` function that builds Basic Auth
- Add `getAccessToken(clientId, clientSecret)` that POSTs to `https://id.greenhouse.io/oauth/token` with `grant_type=client_credentials`
- Update `ghFetch()` and `fetchAllPages()` to use `Authorization: Bearer <token>` instead of Basic Auth
- Update the env check at the top to require `GREENHOUSE_CLIENT_ID` and `GREENHOUSE_CLIENT_SECRET` instead of `GREENHOUSE_API_KEY`

## No Other Files Change

The UI panel and database schema remain the same. Only the edge function authentication logic is updated.

## Technical Details

### OAuth Token Exchange

```
POST https://id.greenhouse.io/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=<GREENHOUSE_CLIENT_ID>
&client_secret=<GREENHOUSE_CLIENT_SECRET>
```

Response provides an `access_token` used as a Bearer token for all subsequent Harvest API calls.

### Updated request headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Steps

1. Add `GREENHOUSE_CLIENT_ID` secret (you will be prompted)
2. Add `GREENHOUSE_CLIENT_SECRET` secret (you will be prompted)
3. Update edge function auth logic
4. Deploy updated function
