

# Replace Meetings Widget with Today's Agenda

## What changes

Replace the current `ActiveMeetingsWidget` on the home page (which shows generic stats like "1 Active Now" and "36 In Calls") with a clean **"Today's Agenda"** widget that lists the user's meetings for the day in chronological order.

## How it will look

- Header: "Today's Agenda" with a date label (e.g., "Thursday, Feb 13")
- A timeline-style list of the day's meetings, each showing:
  - Time (e.g., "10:00 AM - 10:30 AM")
  - Meeting title
  - Status badge: "Live" (green pulse), "Next" (gold accent), or time remaining
  - A "Join" button for meetings that are live or starting within 5 minutes
- Empty state: "No meetings scheduled today" with a link to the calendar
- Footer link: "View Full Calendar" pointing to `/meetings?tab=calendar`

## Design alignment

- Dark, minimal card with subtle glass styling (matching existing `glass-subtle` pattern)
- Gold accent (`accent-gold`) for the "Next" badge on the soonest upcoming meeting
- Status uses the existing `getMeetingStatus` utility from `src/utils/meetingStatus.ts`
- Only one primary action per meeting row (Join or View)

---

## Technical details

### Files changed

| File | Change |
|---|---|
| `src/components/clubhome/ActiveMeetingsWidget.tsx` | Full rewrite: replace stats grid with a chronological agenda list of today's meetings for the logged-in user. Fetch user's meetings (hosted + participant) for today, sort by start time, render timeline cards with live status using `getMeetingStatus`. |

### Data fetching

Query both `meetings` (where `host_id = user.id`) and `meeting_participants` (where `user_id = user.id`) for today's date range, deduplicate, and sort by `scheduled_start`. Reuse the same pattern already in `src/pages/Meetings.tsx` (lines 75-98).

### Status logic

Reuse `getMeetingStatus()` from `src/utils/meetingStatus.ts` to determine live/starting-soon/upcoming/ended states and join-ability per meeting. A 60-second interval will refresh statuses so "starting soon" countdowns stay accurate.

### No new dependencies

Uses existing components (`Card`, `Badge`, `Button`, `Avatar`) and utilities (`date-fns`, `getMeetingStatus`).

