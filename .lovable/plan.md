
# Fix: Today's Agenda Widget to Include Google Calendar Events

## Problem

The `ActiveMeetingsWidget` on the Admin Home only queries the internal `meetings` table directly. It does not fetch events from connected external calendars (Google, Microsoft). Since your meetings are on Google Calendar, the widget shows "No meetings scheduled today."

## Solution

Refactor `ActiveMeetingsWidget` to use `fetchUnifiedCalendarEvents` (the same service the full Calendar page uses) instead of querying the `meetings` table directly. This pulls events from all sources: internal TQC meetings, Google Calendar, and Microsoft Calendar.

## Technical Details

**File:** `src/components/clubhome/ActiveMeetingsWidget.tsx`

1. Replace the direct Supabase queries (hosted meetings + participant meetings) with a single call to `fetchUnifiedCalendarEvents(userId, startOfDay, endOfDay)`.
2. The returned `UnifiedCalendarEvent[]` already has `start`, `end`, `title`, `source`, `meeting_id`, etc. -- everything the widget needs.
3. Remove the `AgendaMeeting` interface and `toCalendarEvent` helper since the data will already be in the correct `UnifiedCalendarEvent` format.
4. Adapt the rendering to use `UnifiedCalendarEvent` fields directly (`event.start`, `event.end`, `event.title`).
5. Keep the 60-second status refresh interval and the `getMeetingStatus` integration.
6. Show a subtle source indicator (e.g., a small Google/TQC icon or label) so users can distinguish event origins.
7. For external events (Google/Microsoft), the "Join" button should be hidden (no internal meeting room), replaced with "View" or omitted.

This ensures the widget becomes a true unified "Today's Agenda" across all connected calendars.
