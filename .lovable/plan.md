

# Fix Google Calendar Token Expiry

## Problem

The calendar sync breaks because of a conflict between three token refresh layers:

1. **Background cron** (`refresh-calendar-tokens`): exists but has never been called -- no scheduler is invoking it
2. **On-demand refresh** (inside `google-calendar-events`): works correctly, refreshes tokens when they are within 5 minutes of expiry
3. **Client-side guard** (`calendarAggregation.ts`): blocks API calls entirely when `token_expires_at` is more than 1 hour old, preventing Layer 2 from ever running

The result: if you close the app for more than ~2 hours, the client-side guard blocks the request, the on-demand refresh never fires, and you see "Google Calendar token expired."

## Solution

### 1. Remove the overly aggressive client-side token guard

In `src/services/calendarAggregation.ts`, remove the `isTokenExpiredBeyondRefresh` check that blocks API calls. Instead, always call the edge function and let the server-side refresh handle it. If the server returns a `401` with `requiresReauth`, then show the reconnect toast.

This means:
- Delete the `isTokenExpiredBeyondRefresh` function
- Remove the pre-check in `fetchGoogleCalendarEvents` and `fetchMicrosoftCalendarEvents`
- Add response error handling: if the edge function returns a `token_refresh_failed` or `token_expired` error, show the reconnect toast at that point

### 2. Wire up the background cron via `agentic-heartbeat`

Since there is no external cron scheduler, add a token refresh step to the existing `agentic-heartbeat` function (which is already called periodically). This will proactively refresh tokens before they expire, so users rarely hit expiry at all.

Add a step in the heartbeat that calls `refresh-calendar-tokens` once per run.

### 3. Improve the `refresh-calendar-tokens` function

The current function also does not update `token_expires_at` -- it only updates `access_token` and `updated_at`. Add the expiry timestamp so the on-demand check works correctly after a background refresh.

## Files to Modify

| File | Change |
|------|--------|
| `src/services/calendarAggregation.ts` | Remove `isTokenExpiredBeyondRefresh` guard; add error-based reconnect toast instead |
| `supabase/functions/refresh-calendar-tokens/index.ts` | Also persist `token_expires_at` when updating tokens |
| `supabase/functions/agentic-heartbeat/index.ts` | Add a call to `refresh-calendar-tokens` in the heartbeat loop |

## Technical Details

### calendarAggregation.ts changes

Remove:
- `isTokenExpiredBeyondRefresh` function (lines 19-24)
- Pre-check blocks in `fetchGoogleCalendarEvents` (lines 160-167) and `fetchMicrosoftCalendarEvents` (lines 232-239)
- `hasActiveCalendarConnection` function's use of `isTokenExpiredBeyondRefresh`

Add error handling after edge function calls:

```text
const { data, error } = await withTimeout(...);

if (error || !data?.events) {
  // Check if this is a token expiry error requiring user action
  if (data?.error === 'token_refresh_failed' || data?.error === 'token_expired') {
    toast.error('Google Calendar token expired', {
      description: 'Reconnect your Google Calendar in Settings to restore sync.',
      duration: 8000,
    });
  }
  continue;
}
```

### refresh-calendar-tokens fix

When updating the connection after a successful refresh, also store the new expiry:

```text
.update({
  access_token: tokenData.access_token,
  token_expires_at: tokenData.tokens?.expires_at || new Date(Date.now() + 3600 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
})
```

### Heartbeat integration

Add at the end of the heartbeat's task list:

```text
// Proactive calendar token refresh
try {
  await supabaseClient.functions.invoke('refresh-calendar-tokens');
} catch (e) {
  console.error('[heartbeat] Calendar token refresh failed:', e);
}
```

## Result

- Tokens are proactively refreshed every heartbeat cycle (before they expire)
- If a token does expire between heartbeats, the on-demand refresh in `google-calendar-events` catches it
- Users only see the "reconnect" toast when the refresh token itself is revoked by Google (rare -- requires user action in Google account settings)

