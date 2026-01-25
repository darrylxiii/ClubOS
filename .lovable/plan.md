
# Automatic Calendar Sync for All Meeting Participants

## Current State Analysis

### What Works Today
1. **Host Calendar Sync** - When a booking is created, the meeting is automatically synced to the **host's** calendar (Google or Microsoft) if they have configured a "Primary Calendar" for their booking link
2. **Manual Add to Calendar** - Guests see "Add to Google/Outlook/Apple Calendar" buttons on the confirmation page
3. **ICS Attachment** - Confirmation emails include a `.ics` file attachment that participants can manually import
4. **Attendee List** - The calendar event is created with all attendees listed (host, booker, additional guests)

### What's Missing (Why It's Not Automatic)
1. **Google API Flag Missing** - The `sync-booking-to-calendar` edge function creates events but doesn't include `sendUpdates=all` query parameter, so Google doesn't send calendar invites to attendees
2. **Microsoft API Flag Missing** - Similarly, the Microsoft Graph API call doesn't include the invite-sending body parameters
3. **Apple Calendar** - No server-side integration exists (Apple doesn't provide a public calendar API like Google/Microsoft)
4. **Guest Calendar Connections** - Guests don't connect their calendars, so TQC can't create events directly in their calendars

---

## Solution Architecture

### Option A: Enable Automatic Calendar Invites via Host's Calendar (Recommended)
When the host creates an event in their calendar with attendees, the calendar provider (Google/Microsoft) automatically sends invitation emails to all attendees. This is the standard behavior - we just need to enable it.

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTOMATIC INVITE FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Guest books meeting via /book/:slug                             │
│     ↓                                                                │
│  2. create-booking edge function creates booking                     │
│     ↓                                                                │
│  3. sync-booking-to-calendar is triggered                           │
│     ↓                                                                │
│  4. Google/Microsoft API creates event with ALL attendees           │
│     + sendUpdates=all (Google) / sendInvitations=true (Microsoft)   │
│     ↓                                                                │
│  5. Calendar provider automatically emails invites to:              │
│     • Host (organizer)                                               │
│     • Primary guest (booker)                                         │
│     • Additional guests                                              │
│     ↓                                                                │
│  6. Recipients click "Accept" → Event appears in THEIR calendar     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Option B: Direct Calendar Creation for Connected Guests (Future Enhancement)
Allow guests to connect their own calendars and create events directly. This requires guests to have TQC accounts and OAuth flows.

---

## Implementation Plan

### Phase 1: Fix Google Calendar Invites

**File: `supabase/functions/google-calendar-events/index.ts`**

The Google Calendar API requires the `sendUpdates` query parameter to send email notifications to attendees:

```typescript
// Current (broken) - line 143-150
const response = await fetch(
  'https://www.googleapis.com/calendar/v3/calendars/primary/events',
  { method: 'POST', headers, body: JSON.stringify(event) }
);

// Fixed - Add sendUpdates=all parameter
const response = await fetch(
  'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
  { method: 'POST', headers, body: JSON.stringify(event) }
);
```

Also need to format the event body correctly for Google:
```typescript
const googleEvent = {
  summary: event.summary,
  description: event.description,
  start: { dateTime: event.start, timeZone: 'UTC' },
  end: { dateTime: event.end, timeZone: 'UTC' },
  attendees: event.attendees.map(email => ({ 
    email, 
    responseStatus: email === event.organizer?.email ? 'accepted' : 'needsAction' 
  })),
  conferenceData: event.conferenceData, // For Google Meet
  location: event.location,
  guestsCanModify: false,
  guestsCanInviteOthers: false,
  guestsCanSeeOtherGuests: true,
};
```

---

### Phase 2: Fix Microsoft/Outlook Calendar Invites

**File: `supabase/functions/microsoft-calendar-events/index.ts`**

Microsoft Graph API uses different parameters for sending invites:

```typescript
// Current (line 49-56)
const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify(event),
});

// Fixed - Format event for Microsoft with invite settings
const msEvent = {
  subject: event.summary,
  body: { contentType: 'HTML', content: event.description },
  start: { dateTime: event.start, timeZone: 'UTC' },
  end: { dateTime: event.end, timeZone: 'UTC' },
  attendees: event.attendees.map(email => ({
    emailAddress: { address: email },
    type: email === event.organizer?.email ? 'required' : 'required',
  })),
  location: { displayName: event.location || 'Video Call' },
  isOnlineMeeting: true,
  responseRequested: true, // Request RSVP
};

// Microsoft sends invites by default when attendees are included
```

---

### Phase 3: Update sync-booking-to-calendar Orchestration

**File: `supabase/functions/sync-booking-to-calendar/index.ts`**

Pass a flag to control whether invites should be sent:

```typescript
// Add to eventDetails (around line 126-144)
const eventDetails = {
  summary: `${booking.booking_links?.title || 'Meeting'} - ${booking.guest_name}`,
  // ... existing fields ...
  sendInvites: true, // New flag to control invite sending
};

// Pass to provider functions
const { data: eventData, error: eventError } = await supabaseClient.functions.invoke(
  functionName,
  {
    body: {
      action: 'createEvent',
      connectionId: calendar.id,
      accessToken: calendar.access_token,
      event: eventDetails,
      sendInvites: true, // Enable invite sending
    }
  }
);
```

---

### Phase 4: Apple Calendar (ICS Email Attachment)

Apple doesn't provide a public calendar API. The industry-standard approach is to send an **ICS attachment** via email, which Apple Mail and other clients recognize as a calendar invite.

**Current State**: The ICS file is generated in `send-booking-confirmation` but may not be properly attached.

**Enhancement needed in `supabase/functions/send-booking-confirmation/index.ts`**:
1. Ensure the ICS content is sent as a proper `text/calendar` MIME attachment
2. Set `METHOD:REQUEST` in the ICS (already done) so it appears as an invite
3. Send to all guests (booker + additional guests)

When recipients receive the email:
- **Apple Mail**: Shows "Add to Calendar" button automatically
- **Gmail**: Shows "Add to Google Calendar" via Schema.org markup
- **Outlook**: Recognizes the ICS attachment and offers to add

---

### Phase 5: Host Setting for Invite Sending

**File: `src/components/scheduling/BookingAvailabilitySettings.tsx`**

A toggle already exists (`send_calendar_invites`) at line 543-552, but it needs to be:
1. Stored in `booking_availability_settings` table
2. Read by `sync-booking-to-calendar` to decide whether to send invites

**Database**: Add column if not exists:
```sql
ALTER TABLE booking_availability_settings 
ADD COLUMN IF NOT EXISTS send_calendar_invites BOOLEAN DEFAULT true;
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/google-calendar-events/index.ts` | Add `?sendUpdates=all` to event creation URL, properly format attendees |
| `supabase/functions/microsoft-calendar-events/index.ts` | Format event body with attendees in Microsoft Graph format |
| `supabase/functions/sync-booking-to-calendar/index.ts` | Pass `sendInvites` flag to provider functions |
| `supabase/functions/send-booking-confirmation/index.ts` | Ensure ICS is properly attached for Apple/fallback |
| Database migration | Add `send_calendar_invites` column if missing |

---

## What Each Participant Will See

### After Implementation

| Participant | What Happens |
|-------------|--------------|
| **Host** | Event appears in their connected calendar (already works) |
| **Primary Guest (Booker)** | Receives Google/Outlook calendar invite email → Click "Yes" → Event in their calendar |
| **Additional Guests** | Same as booker - receive invite, accept, event appears |
| **Apple Calendar Users** | Email contains ICS attachment → "Add to Calendar" button → Event in their calendar |

---

## OAuth Scope Requirements

### Google Calendar
Current scopes should already include `calendar.events` write access. Verify:
- `https://www.googleapis.com/auth/calendar.events`

### Microsoft Graph  
Current scopes should include `Calendars.ReadWrite`. The edge function `microsoft-calendar-auth/index.ts` already requests this scope.

---

## Testing Checklist

After implementation:
- [ ] Book a meeting with a Google Calendar host
- [ ] Verify booker receives Google Calendar invite email
- [ ] Verify additional guests receive invite emails
- [ ] Accept invite → confirm event appears in guest's calendar
- [ ] Repeat with Microsoft/Outlook host
- [ ] Verify Apple Calendar users receive ICS that imports correctly
- [ ] Test the host toggle to disable invite sending
- [ ] Verify meeting updates/cancellations also sync

---

## Summary

The core fix is straightforward:
1. **Google**: Add `?sendUpdates=all` to the API URL
2. **Microsoft**: Format attendees correctly (already sends invites by default)
3. **Apple**: ICS attachment in emails (already partially implemented)

This leverages the native invite system of each calendar provider rather than requiring guests to connect their own calendars.
