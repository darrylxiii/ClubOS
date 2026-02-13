
# Calendar Integration Audit and Fix Plan

## Issues Found

### Issue 1: Edge Functions Unreachable from Browser ("Failed to fetch")
The `google-calendar-events` and `detect-calendar-interviews` edge functions boot correctly on the server, but the browser client fails to reach them with a `FunctionsFetchError: Failed to send a request to the Edge Function`. This is the root cause of all Google Calendar data not loading.

**Root cause**: The `supabase.functions.invoke()` call in `calendarAggregation.ts` passes an `AbortController.signal` option. In Supabase JS v2.58.0, the `signal` option may not be properly forwarded to the underlying `fetch` call, or the abort controller is interfering with the request. This needs to be replaced with a simpler timeout pattern that wraps the entire invoke call in a `Promise.race` with a timeout promise instead.

### Issue 2: Google OAuth Token Expired
The active calendar connection for your account has a `token_expires_at` of January 29, 2026 -- 15 days ago. Even once the edge function is reachable, the token refresh logic in the function will attempt to use `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (both are configured). However, if the refresh token itself has been revoked by Google (common after ~6 months of inactivity or credential rotation), the user will need to reconnect their Google Calendar in Settings.

### Issue 3: Today's Agenda Widget (Home Screen)
The newly built `ActiveMeetingsWidget` queries the `meetings` table directly (no edge functions involved), so it should be functional. If it appears empty, that is because no meetings are scheduled for today in the database. This is working as designed -- not a bug.

### Issue 4: Background Interview Detection Silently Failing
The `triggerInterviewDetection` function fires on every calendar page load and fails with the same `FunctionsFetchError`. While it is caught and logged, it adds noise and unnecessary failed network requests.

---

## Fix Plan

### Step 1: Fix Edge Function Invocation (calendarAggregation.ts)
Replace the `AbortController` + `signal` pattern with a `Promise.race` timeout wrapper. This ensures the Supabase client makes a clean fetch without an unsupported `signal` option.

**Before:**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);
const { data, error } = await supabase.functions.invoke('google-calendar-events', {
  body: { ... },
  signal: controller.signal,
});
clearTimeout(timeoutId);
```

**After:**
```typescript
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Request timed out after 30s')), 30000)
);
const { data, error } = await Promise.race([
  supabase.functions.invoke('google-calendar-events', { body: { ... } }),
  timeoutPromise,
]);
```

Apply the same fix to the Microsoft Calendar invocation.

### Step 2: Add Token Expiry Resilience
Add a check in `fetchGoogleCalendarEvents` that inspects the calendar connection's `token_expires_at` from the query result. If the token expired more than 1 hour ago, skip the edge function call and surface a user-friendly toast suggesting reconnection, rather than making a doomed network request.

### Step 3: Suppress Interview Detection on Failure
Wrap `triggerInterviewDetection` with an additional guard: only invoke if the user has at least one active calendar connection with a non-expired token. This prevents unnecessary failed edge function calls.

### Step 4: Verify Today's Agenda Widget
No code changes needed. The widget correctly queries the `meetings` table. If it shows "No meetings scheduled today," that reflects the actual database state.

---

## Technical Details

| File | Change |
|---|---|
| `src/services/calendarAggregation.ts` | Replace `AbortController` + `signal` with `Promise.race` timeout for both Google and Microsoft invoke calls. Add token expiry pre-check. Guard interview detection behind connection health check. |

### Post-Fix Verification
After deployment, the calendar page at `/meetings?tab=calendar` should:
- Successfully invoke the `google-calendar-events` edge function
- Refresh the expired token automatically (if Google hasn't revoked the refresh token)
- Display Google Calendar events alongside Quantum Club meetings
- If token refresh fails, show a clear message to reconnect in Settings
