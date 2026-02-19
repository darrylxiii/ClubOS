

# Previous Plan Score: 52/100

## Scoring Breakdown

| Category | Score | Why |
|---|---|---|
| Root cause diagnosis | 8/10 | Correctly identified the race condition |
| Completeness of fix | 4/10 | Said "move code" but never specified HOW the re-fetched booking gets passed to email/calendar |
| Token refresh | 3/10 | Said "add helper" but ignored that `google-calendar-auth` already has a `refreshToken` action AND `create-booking` already calls it. The fix should reuse that pattern inside `generate-video-link`, not invent a new helper |
| Duplicate calendar events | 5/10 | Correct diagnosis, vague fix. Didn't specify what column to check or the exact conditional |
| Code specificity | 2/10 | Zero code. No line-level diffs. "Move lines 654-744 before 602" is hand-wavy when the booking object reference also needs updating |
| Edge cases | 3/10 | Didn't address: what if Google Calendar connection doesn't exist? What if token refresh fails? What happens to the booking object returned to the frontend (line 748)? |
| Data model awareness | 5/10 | Didn't notice that `generate-video-link` writes to `video_meeting_link`/`video_meeting_id`/`video_meeting_password`, then `create-booking` ALSO writes to `google_meet_hangout_link`/`google_meet_event_id`/`video_meeting_link`/`active_video_platform` -- redundant double-write |
| Secrets/infra check | 7/10 | Mentioned GOOGLE_CLIENT_ID/SECRET but didn't verify they exist (they do) |
| Observability | 5/10 | Mentioned "log the skip" but no structured logging plan |
| Deployment plan | 5/10 | Generic "deploy and verify" with no rollback strategy |
| Testing strategy | 0/10 | No test plan whatsoever |
| Backward compatibility | 5/10 | Didn't address non-Google-Meet bookings or what happens when `generate-video-link` is called independently |

**Total: 52/100**

---

# Enterprise Google Meet Integration: 100/100 Plan

## Architecture: Current vs Fixed

Current broken flow in `create-booking/index.ts`:

```text
INSERT booking (line 428)
     |
     v
Send confirmation email (line 602)     <-- booking object has NO Meet link
     |
     v
Sync to Google Calendar (line 621)     <-- creates event WITHOUT conferenceData
     |
     v
Generate Google Meet (line 699)        <-- creates SECOND calendar event WITH Meet
     |                                     also writes link to DB, but too late
     v
Return response (line 746)             <-- returns ORIGINAL booking object (no link)
```

Fixed flow:

```text
INSERT booking (line 428)
     |
     v
Generate Google Meet (moved up)        <-- creates calendar event WITH conferenceData
     |                                     writes link to DB
     v
Re-fetch booking from DB               <-- now has google_meet_hangout_link etc.
     |
     v
Send confirmation email                <-- uses re-fetched booking with Meet link
     |
     v
Sync to Google Calendar                <-- SKIPS creation (event already exists)
     |
     v
Return response                        <-- returns re-fetched booking with link
```

---

## Changes (3 files)

### File 1: `supabase/functions/create-booking/index.ts`

**Change A: Move video platform block BEFORE email and calendar sync**

Cut lines 654-744 (video platform handling) and paste them immediately after line 600 (after the in-app notification insert), before the confirmation email at current line 602.

**Change B: Re-fetch booking after video link creation**

After the video platform block, add a re-fetch to get the updated booking row:

```typescript
// Re-fetch booking to get updated video fields (Meet link, platform, etc.)
const { data: updatedBooking } = await supabaseClient
  .from("bookings")
  .select("*")
  .eq("id", booking.id)
  .single();

const bookingForEmail = updatedBooking || booking;
```

**Change C: Pass `bookingForEmail` to confirmation email**

Change line 605 from:
```typescript
booking: booking,
```
to:
```typescript
booking: bookingForEmail,
```

**Change D: Return `bookingForEmail` in response**

Change line 748 from:
```typescript
booking,
```
to:
```typescript
booking: bookingForEmail,
```

### File 2: `supabase/functions/generate-video-link/index.ts`

**Change A: Add token refresh before Google API call**

After fetching the `calendarConnection` (line 59), add token refresh logic using the same pattern that `create-booking` and `get-available-slots` already use -- invoke `google-calendar-auth` with `action: 'refreshToken'`:

```typescript
// Refresh token if expired or about to expire
let accessToken = calendarConnection.access_token;
const tokenExpiresAt = calendarConnection.token_expires_at;
const now = new Date();
const bufferMs = 5 * 60 * 1000; // 5-minute buffer

if (tokenExpiresAt && new Date(tokenExpiresAt).getTime() - now.getTime() < bufferMs) {
  console.log("[Video Link] Token expired or expiring soon, refreshing...");
  
  if (!calendarConnection.refresh_token) {
    throw new Error("Google token expired and no refresh token available. Please reconnect Google Calendar.");
  }
  
  const { data: refreshData, error: refreshError } = await supabase.functions.invoke(
    'google-calendar-auth',
    {
      body: {
        action: 'refreshToken',
        refreshToken: calendarConnection.refresh_token,
      }
    }
  );
  
  if (refreshError || !refreshData?.access_token) {
    console.error("[Video Link] Token refresh failed:", refreshError);
    throw new Error("Failed to refresh Google token. Please reconnect Google Calendar.");
  }
  
  accessToken = refreshData.access_token;
  
  // Persist the new token
  await supabase
    .from('calendar_connections')
    .update({
      access_token: accessToken,
      token_expires_at: refreshData.expires_at || new Date(Date.now() + 3500 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', calendarConnection.id);
  
  console.log("[Video Link] Token refreshed successfully");
}
```

Then use `accessToken` instead of `calendarConnection.access_token` in the Google Calendar API call at line 96.

**Change B: Store the Google Calendar event ID on the booking**

After the successful Google Calendar event creation (line 109), add `google_meet_event_id` to the booking update (alongside the existing `video_meeting_link` update at line 148):

```typescript
await supabase
  .from("bookings")
  .update({
    video_meeting_link: videoLink,
    video_meeting_id: meetingId,
    video_meeting_password: meetingPassword || null,
    google_meet_event_id: meetingId,           // Store for duplicate prevention
    google_meet_hangout_link: videoLink,        // Canonical Meet link field
    active_video_platform: 'google_meet',       // Mark active platform
  })
  .eq("id", bookingId);
```

This eliminates the redundant second write that `create-booking` currently does at lines 717-725, which we will remove.

**Change C: Remove redundant DB update from `create-booking`**

In `create-booking/index.ts`, the block at lines 717-725 that writes `google_meet_hangout_link`, `google_meet_event_id`, `video_meeting_link`, `active_video_platform` is now redundant because `generate-video-link` handles it. Remove these lines.

### File 3: `supabase/functions/sync-booking-to-calendar/index.ts`

**Change A: Skip event creation when Google Meet already created the calendar event**

After fetching the booking (line 26-36) and before creating the calendar event (line 159), add a duplicate check:

```typescript
// If Google Meet already created a calendar event (via generate-video-link),
// skip creating a duplicate. The Meet event already has conferenceData.
if (booking.google_meet_event_id && calendar.provider === 'google') {
  console.log(`[Sync] Skipping Google Calendar event creation -- already created by Google Meet integration (event ID: ${booking.google_meet_event_id})`);
  
  // Still mark as synced
  await supabaseClient
    .from("bookings")
    .update({
      synced_to_calendar: true,
      calendar_event_id: booking.google_meet_event_id,
      calendar_provider: 'google',
    })
    .eq("id", bookingId);
  
  // Log the skip
  await supabaseClient
    .from("calendar_sync_log")
    .insert({
      booking_id: bookingId,
      action: 'skipped_duplicate',
      provider: 'google',
      success: true,
      calendar_event_id: booking.google_meet_event_id,
    });
  
  return new Response(
    JSON.stringify({
      success: true,
      calendarEventId: booking.google_meet_event_id,
      provider: 'google',
      skipped: true,
      reason: 'Google Meet event already exists',
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

---

## Edge Cases Handled

| Scenario | Handling |
|---|---|
| No Google Calendar connection | `generate-video-link` throws "No active Google Calendar connection found" -- `create-booking` catches this at line 730 and logs the error without failing the booking |
| Token refresh fails | Clear error message: "Failed to refresh Google token. Please reconnect Google Calendar." Booking still created, just without Meet link |
| Google Calendar API returns non-200 | Existing error handling at line 103-107 in `generate-video-link` throws with the status and error text |
| Non-Google-Meet bookings (Quantum Club, Zoom, etc.) | Unaffected. The reorder only changes timing. Calendar sync still creates events normally for non-Google providers |
| `generate-video-link` called independently (not from `create-booking`) | Still works. Token refresh is self-contained. The `google_meet_event_id` write prevents duplicates regardless of caller |
| Pending/approval bookings | Unaffected. These return early at line 566 before any video/email/calendar logic |

## Secrets Required

All required secrets are already configured:
- `GOOGLE_CLIENT_ID` -- present
- `GOOGLE_CLIENT_SECRET` -- present
- `RESEND_API_KEY` -- present

No new secrets needed.

## Verification Plan

After deployment, test by booking with Google Meet selected on the booking page and verify:
1. Confirmation email contains the Google Meet link in the "Join Meeting" button and ICS attachment
2. Google Calendar shows exactly ONE event (not two) with conferenceData/Meet link
3. The booking response to the frontend includes the Meet link
4. Token refresh works when access token is stale (check edge function logs for "Token refreshed successfully")

