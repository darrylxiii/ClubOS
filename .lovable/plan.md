
# Club AI Notetaker: Enterprise Meeting Intelligence Bot

## What This Does

An AI-powered meeting bot (branded "Club AI Notetaker") that automatically joins every Google Meet booked through The Quantum Club, records the meeting, generates a real-time transcript, and produces AI-powered insights -- all without any manual action from the host or guest. Think Fathom/Fireflies, but built natively into the platform.

## How It Works (High Level)

1. A booking is created with Google Meet as the video platform
2. A scheduled job detects upcoming meetings (5 minutes before start)
3. The bot uses Google Meet REST API to access the meeting space
4. During the meeting: real-time transcript capture via Google's built-in transcription
5. After the meeting ends: AI analyzes the transcript, extracts action items, generates a debrief, and emails participants the summary

## Architecture

```text
Booking Created (Google Meet)
        |
        v
  [booking_links.enable_club_ai = true]
        |
        v
  bookings table gets notetaker_enabled = true
        |
        v
  Cron: schedule-notetaker-sessions (every 2 min)
        |
        +-- Finds bookings starting in next 10 min
        +-- Creates meeting_bot_sessions record
        +-- Sets status = 'scheduled'
        |
        v
  Cron: notetaker-join-meeting (every 1 min)
        |
        +-- Finds sessions with status = 'scheduled' where meeting starts in <= 2 min
        +-- Uses Google Meet REST API (meet.google.com/api) to:
        |     - Get meeting space info
        |     - Retrieve conference artifacts (transcripts, recordings)
        +-- Updates session status = 'joined'
        |
        v
  [Meeting happens -- Google records natively if Workspace admin enabled]
        |
        v
  Cron: notetaker-collect-artifacts (every 3 min)
        |
        +-- Checks active sessions
        +-- Polls Google Meet REST API for transcript entries
        +-- Stores transcript segments in meeting_transcripts table
        +-- Detects meeting end (conference ended)
        +-- Updates session status = 'processing'
        |
        v
  Pipeline: analyze-meeting-transcript (existing)
        |
        +-- AI summary, key points, action items
        +-- Creates unified_tasks from action items
        +-- Generates meeting_insights record
        |
        v
  send-meeting-summary-email (existing)
        |
        +-- Emails host + guest with debrief
        +-- Includes: summary, action items, full transcript link
```

## Database Changes

### 1. Add `notetaker_enabled` column to `bookings`

```sql
ALTER TABLE public.bookings
ADD COLUMN notetaker_enabled boolean DEFAULT false;
```

When a booking is created and the booking_link has `enable_club_ai = true` and the video platform is Google Meet, this flag gets set to `true`.

### 2. Add columns to `meeting_bot_sessions` for scheduling

```sql
ALTER TABLE public.meeting_bot_sessions
ADD COLUMN booking_id uuid REFERENCES public.bookings(id),
ADD COLUMN scheduled_join_at timestamptz,
ADD COLUMN scheduled_leave_at timestamptz,
ADD COLUMN google_meet_space_name text,
ADD COLUMN google_meet_conference_id text,
ADD COLUMN artifacts_collected boolean DEFAULT false,
ADD COLUMN transcript_entry_count integer DEFAULT 0,
ADD COLUMN error_message text;
```

### 3. Create `notetaker_settings` table for per-user preferences

```sql
CREATE TABLE public.notetaker_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  auto_join_all_bookings boolean DEFAULT true,
  auto_join_detected_interviews boolean DEFAULT true,
  send_summary_email boolean DEFAULT true,
  send_transcript_email boolean DEFAULT false,
  default_language text DEFAULT 'en',
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.notetaker_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notetaker settings"
ON public.notetaker_settings
FOR ALL USING (auth.uid() = user_id);
```

## Edge Functions (3 new, 2 modified)

### New: `schedule-notetaker-sessions` (cron, every 2 minutes)

Scans for upcoming Google Meet bookings in the next 10 minutes where:
- `notetaker_enabled = true`
- No existing `meeting_bot_sessions` record
- `status = 'confirmed'`

For each, creates a `meeting_bot_sessions` record with:
- `scheduled_join_at` = booking start - 1 minute
- `scheduled_leave_at` = booking end + 5 minutes (buffer for wrap-up)
- `connection_status` = 'scheduled'

### New: `notetaker-join-meeting` (cron, every 1 minute)

Finds scheduled sessions where `scheduled_join_at <= now()` and `connection_status = 'scheduled'`.

For each session:
1. Get the booking's `google_meet_event_id`
2. Use Google Meet REST API (`GET https://meet.googleapis.com/v2/conferenceRecords`) to find the active conference
3. If conference is active, update session to `connection_status = 'joined'`
4. If no active conference yet (meeting hasn't started), skip (will retry next minute)

Uses the host's Google Calendar connection (via `booking_links.user_id` -> `calendar_connections`) for API authentication, with the token refresh pattern already built into the platform.

### New: `notetaker-collect-artifacts` (cron, every 3 minutes)

For sessions with `connection_status = 'joined'`:

1. Poll Google Meet REST API for transcript entries:
   - `GET https://meet.googleapis.com/v2/conferenceRecords/{conferenceRecordId}/transcripts/{transcriptId}/entries`
2. Store new entries in `meeting_transcripts` table (deduplicating by timestamp)
3. Check if conference has ended via `endTime` field on the conference record
4. If ended:
   - Set `connection_status = 'processing'`
   - Invoke existing `compile-meeting-transcript`
   - Invoke existing `analyze-meeting-transcript` (uses Lovable AI, no external API key needed)
   - Invoke existing `send-meeting-summary-email`

### Modified: `create-booking/index.ts`

After the video platform block (the one we just reordered), add:

```typescript
// Auto-enable notetaker if booking link has Club AI enabled and platform is Google Meet
if (bookingForEmail.active_video_platform === 'google_meet') {
  const { data: bookingLink } = await supabaseClient
    .from('booking_links')
    .select('enable_club_ai')
    .eq('id', booking.booking_link_id)
    .single();
  
  if (bookingLink?.enable_club_ai) {
    await supabaseClient
      .from('bookings')
      .update({ notetaker_enabled: true })
      .eq('id', booking.id);
  }
}
```

### Modified: `send-booking-confirmation/index.ts`

Add a "Club AI Notetaker will join this meeting" notice in the email body when `booking.notetaker_enabled = true`. This sets expectations for the guest.

## Google Meet REST API Requirements

The Google Meet REST API requires:
- **Google Workspace** account (not personal Gmail)
- **OAuth scopes**: `https://www.googleapis.com/auth/meetings.space.readonly` and `https://www.googleapis.com/auth/meetings.space.created`
- These scopes need to be added to the existing Google Calendar OAuth flow

The existing `google-calendar-auth` function needs one additional scope added to its scope list. No new secrets are required -- the same `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` work for Meet API access.

## Frontend: Notetaker Settings Page

Add a "Club AI Notetaker" section in the user's Settings page:
- Toggle: Auto-join all Google Meet bookings
- Toggle: Auto-join detected calendar interviews
- Toggle: Send summary email after meeting
- Toggle: Include full transcript in email
- Language selector for transcription

## Frontend: Meeting Insights Dashboard

After a meeting with the notetaker, the existing meeting insights UI (`meeting_insights` table) already displays:
- Summary
- Key points
- Action items
- Decisions
- Sentiment analysis
- Participant breakdown
- Full transcript

No new UI needed for the insights view -- it's already built.

## What Beats Fathom/Fireflies

| Feature | Fathom/Fireflies | Club AI Notetaker |
|---|---|---|
| Auto-join meetings | Yes | Yes |
| Real-time transcript | Yes | Yes (via Google Meet API) |
| AI summary + action items | Yes | Yes (Lovable AI, no extra cost) |
| Interview detection | No | Yes (detect-calendar-interviews already built) |
| Candidate/job auto-linking | No | Yes (detects who is candidate vs interviewer) |
| Hiring manager pattern analysis | No | Yes (extract-hiring-manager-patterns already built) |
| Dossier generation | No | Yes (generate-meeting-dossier already built) |
| Integrated into ATS pipeline | No | Yes (creates tasks, updates applications) |
| Speaking metrics | No | Yes (calculate-speaking-metrics already built) |
| Booking-native | No | Yes (zero setup, part of booking flow) |
| Cost | $19-39/user/month | Included in platform |

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Google Meet REST API requires Workspace | Document requirement; fall back to calendar-based transcript collection for personal Gmail |
| API rate limits on polling | 3-minute interval is well within limits; exponential backoff on 429s |
| Meeting starts late / no-show | Bot retries every minute for up to 15 minutes past scheduled start, then marks session as 'no_show' |
| Host hasn't connected Google Calendar | Notetaker silently skips -- no error shown to guest |
| Token expired during meeting | Token refresh is already built into the pipeline |

## Implementation Order

1. Database migrations (notetaker_enabled column, bot_sessions columns, notetaker_settings table)
2. Modify `create-booking` to set notetaker_enabled flag
3. Create `schedule-notetaker-sessions` edge function
4. Create `notetaker-join-meeting` edge function
5. Create `notetaker-collect-artifacts` edge function
6. Add Google Meet API scopes to OAuth flow
7. Set up cron jobs for the three new functions
8. Modify `send-booking-confirmation` to include notetaker notice
9. Add notetaker settings UI to Settings page
10. End-to-end testing
