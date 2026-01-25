
# Comprehensive Guest Permissions & Notifications System

## Overview

This plan implements a complete guest management system with:
1. **Enhanced guest emails** - Personalized invitations showing who booked and who hosts
2. **Granular guest permissions** - Booker can grant guests specific rights
3. **Host control layer** - Host configures what permissions bookers can delegate
4. **New "Propose Time" feature** - Allow guests to suggest alternative meeting times
5. **Guest self-service actions** - Cancel, add guests, reschedule (if permitted)

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    PERMISSION HIERARCHY                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  HOST (Ultimate Authority)                                          │
│  └── Controls via booking_links settings:                           │
│       • allow_guest_cancel: boolean                                 │
│       • allow_guest_reschedule: boolean                             │
│       • allow_guest_propose_times: boolean                          │
│       • allow_guest_add_attendees: boolean                          │
│                                                                      │
│  BOOKER (Primary Guest)                                             │
│  └── Can delegate to additional guests (within host limits):        │
│       • can_cancel: boolean                                         │
│       • can_reschedule: boolean                                     │
│       • can_propose_times: boolean                                  │
│       • can_add_attendees: boolean                                  │
│                                                                      │
│  ADDITIONAL GUESTS                                                   │
│  └── Actions limited by:                                            │
│       • Host's booking_link settings (ceiling)                      │
│       • Booker's delegated permissions (floor)                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Changes

### 1. New Table: `booking_guests`
Stores additional guests with individual permission assignments and access tokens.

```sql
CREATE TABLE public.booking_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  access_token UUID DEFAULT gen_random_uuid(),
  
  -- Permissions delegated by booker (capped by host settings)
  can_cancel BOOLEAN DEFAULT false,
  can_reschedule BOOLEAN DEFAULT false,
  can_propose_times BOOLEAN DEFAULT false,
  can_add_attendees BOOLEAN DEFAULT false,
  
  -- Tracking
  email_sent_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(booking_id, email)
);

-- Indexes for fast lookups
CREATE INDEX idx_booking_guests_booking_id ON booking_guests(booking_id);
CREATE INDEX idx_booking_guests_access_token ON booking_guests(access_token);
CREATE INDEX idx_booking_guests_email ON booking_guests(email);
```

### 2. New Table: `booking_time_proposals`
Stores proposed alternative times from guests.

```sql
CREATE TABLE public.booking_time_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  
  proposed_by_email TEXT NOT NULL,
  proposed_by_name TEXT,
  proposed_by_type TEXT NOT NULL CHECK (proposed_by_type IN ('booker', 'guest')),
  
  proposed_start TIMESTAMPTZ NOT NULL,
  proposed_end TIMESTAMPTZ NOT NULL,
  message TEXT,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  responded_at TIMESTAMPTZ,
  response_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '48 hours')
);

CREATE INDEX idx_proposals_booking_id ON booking_time_proposals(booking_id);
CREATE INDEX idx_proposals_status ON booking_time_proposals(status);
```

### 3. Alter Table: `booking_links`
Add host-level permission toggles.

```sql
ALTER TABLE public.booking_links
ADD COLUMN IF NOT EXISTS guest_permissions JSONB DEFAULT '{
  "allow_guest_cancel": false,
  "allow_guest_reschedule": false,
  "allow_guest_propose_times": true,
  "allow_guest_add_attendees": false,
  "booker_can_delegate": true
}'::jsonb;

COMMENT ON COLUMN booking_links.guest_permissions IS 
  'Host-controlled permissions: what guests/bookers can do with this booking type';
```

### 4. Alter Table: `bookings`
Add booker-level permission settings for their guests.

```sql
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS delegated_permissions JSONB DEFAULT '{
  "can_cancel": false,
  "can_reschedule": false,
  "can_propose_times": true,
  "can_add_attendees": false
}'::jsonb;

COMMENT ON COLUMN bookings.delegated_permissions IS 
  'Permissions the booker grants to additional guests (capped by host settings)';
```

### 5. RLS Policies

```sql
-- Enable RLS
ALTER TABLE booking_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_time_proposals ENABLE ROW LEVEL SECURITY;

-- Booking guests: Viewable by host and accessible via token
CREATE POLICY "Hosts can view their booking guests" ON booking_guests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN booking_links bl ON b.booking_link_id = bl.id
      WHERE b.id = booking_guests.booking_id
      AND bl.user_id = auth.uid()
    )
  );

-- Proposals: Same pattern
CREATE POLICY "Hosts can view proposals for their bookings" ON booking_time_proposals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN booking_links bl ON b.booking_link_id = bl.id
      WHERE b.id = booking_time_proposals.booking_id
      AND bl.user_id = auth.uid()
    )
  );
```

---

## Edge Functions

### 1. Update: `send-booking-confirmation`
Enhance to send personalized guest invitations.

**Changes:**
- Create dedicated guest email template showing:
  - Who booked the meeting (booker name/email)
  - Who is hosting (host name)
  - Meeting details
  - Individual action buttons based on permissions
  - Unique guest access link
- Insert records into `booking_guests` table
- Track email sent timestamp

**Guest Email Structure:**
```text
┌────────────────────────────────────────────────────┐
│           [TQC LOGO - 120px]                       │
├────────────────────────────────────────────────────┤
│  YOU'RE INVITED                                    │
│                                                    │
│  {Booker Name} has invited you to:                │
│  ────────────────────────────────                  │
│  📅 {Meeting Title}                                │
│  🗓️ {Date}                                         │
│  🕐 {Time} ({Timezone})                            │
│  ⏱️ {Duration}                                     │
│  👤 Host: {Host Name}                              │
│  📧 Booked by: {Booker Email}                      │
│                                                    │
│  ┌──────────────────────────────────────┐         │
│  │      [QC] Join via Club Meetings     │         │
│  └──────────────────────────────────────┘         │
│                                                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────────┐         │
│  │ Propose │ │ Cancel  │ │ Add Guests  │         │
│  │ Time    │ │ Meeting │ │             │         │
│  └─────────┘ └─────────┘ └─────────────┘         │
│  (buttons shown based on permissions)              │
│                                                    │
│  ────────────────────────────────                  │
│  📎 Add to Calendar: [Google] [Outlook] [Apple]   │
└────────────────────────────────────────────────────┘
```

### 2. New: `guest-booking-actions`
Unified edge function for guest self-service actions.

**Endpoints (via `action` parameter):**
- `cancel` - Cancel meeting (if permitted)
- `propose_time` - Submit alternative time proposal
- `add_guest` - Add another attendee (if permitted)
- `get_details` - Fetch booking details for guest portal

**Security:**
- Validate access via `booking_guests.access_token`
- Check booker token via `bookings.id` + `guest_email` match
- Verify permissions before each action
- Rate limit: 10 requests/minute per token

```typescript
// Pseudocode structure
interface GuestActionRequest {
  action: 'cancel' | 'propose_time' | 'add_guest' | 'get_details';
  accessToken: string;      // For additional guests
  bookingId?: string;       // For booker (with email verification)
  guestEmail?: string;      // For booker verification
  
  // Action-specific data
  cancelReason?: string;
  proposedStart?: string;
  proposedEnd?: string;
  proposalMessage?: string;
  newGuestEmail?: string;
  newGuestName?: string;
  newGuestPermissions?: GuestPermissions;
}
```

### 3. New: `handle-time-proposal`
Host response to time proposals.

**Actions:**
- `accept` - Accept proposal, reschedule booking, notify all parties
- `decline` - Decline with optional message, notify proposer
- `counter` - Suggest different time (creates new proposal in reverse)

### 4. Update: `cancel-booking`
Extend to support guest-initiated cancellations.

**Changes:**
- Accept `accessToken` parameter for guest auth
- Verify guest has `can_cancel` permission
- Add `cancelled_by` field to track who cancelled
- Send notification to all parties (host, booker, other guests)

---

## Frontend Components

### 1. Update: `GuestEmailInput.tsx`
Add permission toggles when host allows delegation.

```tsx
interface GuestWithPermissions {
  email: string;
  name?: string;
  can_cancel?: boolean;
  can_reschedule?: boolean;
  can_propose_times?: boolean;
  can_add_attendees?: boolean;
}

// New props
interface GuestEmailInputProps {
  guests: GuestWithPermissions[];
  onChange: (guests: GuestWithPermissions[]) => void;
  maxGuests?: number;
  allowedPermissions?: {
    can_cancel: boolean;
    can_reschedule: boolean;
    can_propose_times: boolean;
    can_add_attendees: boolean;
  };
  showPermissions?: boolean;
}
```

**UI Addition:**
- Expandable section per guest showing permission toggles
- Only show toggles the host has enabled for this booking link
- Default: `can_propose_times: true`, others `false`

### 2. Update: `Scheduling.tsx` (Booking Link Creation)
Add guest permissions section.

**New UI Section:**
```text
┌──────────────────────────────────────────────────┐
│  👥 Guest Permissions                            │
│  ────────────────────────────                    │
│  Control what guests and attendees can do        │
│                                                  │
│  ☑️ Allow guests to propose alternative times    │
│  ☐ Allow guests to cancel the meeting            │
│  ☐ Allow guests to reschedule                    │
│  ☐ Allow guests to add more attendees            │
│  ────────────────────────────                    │
│  ☑️ Allow booker to delegate permissions         │
│     (Let the person booking decide what their    │
│      guests can do, within your limits)          │
└──────────────────────────────────────────────────┘
```

### 3. New: `GuestBookingPortal.tsx`
Guest-specific booking management page.

**Route:** `/booking/:bookingId/guest/:accessToken`

**Features:**
- View booking details
- See host and booker info
- Action buttons based on permissions:
  - "Propose Different Time" → Opens proposal form
  - "Cancel Meeting" → Confirmation dialog
  - "Add Attendee" → Guest input form
- View proposal history and status

### 4. New: `ProposeTimeDialog.tsx`
Dialog for proposing alternative times.

**UI:**
- Calendar/time picker
- Optional message field
- Preview of proposed time
- Submit button

### 5. New: `TimeProposalsManager.tsx`
Host view for managing time proposals.

**Route:** Integrated into `/scheduling` or booking detail view

**Features:**
- List pending proposals
- Accept/Decline buttons
- Counter-propose option
- Proposal history

### 6. Update: `BookingForm.tsx`
Show permission delegation UI when adding guests.

---

## Email Templates

### 1. `GuestInvitationEmail`
New template for additional guest invitations.

**Content:**
- Personalized greeting
- Who invited them (booker)
- Host information
- Meeting details
- Permission-based action buttons
- Calendar add buttons
- Unique access link in footer

### 2. `TimeProposalReceivedEmail`
Notify host of new time proposals.

### 3. `TimeProposalResponseEmail`
Notify proposer of accept/decline.

### 4. `GuestCancellationEmail`
Notify all parties when a guest cancels.

### 5. `GuestAddedEmail`
Notify when a guest adds another attendee.

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `supabase/functions/guest-booking-actions/index.ts` | Guest self-service actions |
| `supabase/functions/handle-time-proposal/index.ts` | Host response to proposals |
| `src/pages/GuestBookingPortal.tsx` | Guest portal page |
| `src/components/booking/ProposeTimeDialog.tsx` | Time proposal UI |
| `src/components/booking/TimeProposalsManager.tsx` | Host proposal management |
| `src/components/booking/GuestPermissionToggles.tsx` | Permission toggle UI |

### Modified Files
| File | Changes |
|------|---------|
| `supabase/functions/send-booking-confirmation/index.ts` | Enhanced guest emails, insert booking_guests records |
| `supabase/functions/cancel-booking/index.ts` | Support guest-initiated cancellations |
| `src/components/booking/GuestEmailInput.tsx` | Add permission toggles |
| `src/pages/Scheduling.tsx` | Add guest permissions section to booking link form |
| `src/components/booking/BookingForm.tsx` | Show permission delegation when host allows |
| `src/App.tsx` | Add new route for guest portal |

---

## Implementation Order

### Phase 1: Database & Backend Foundation
1. Create migration for new tables and columns
2. Implement `guest-booking-actions` edge function
3. Update `send-booking-confirmation` for guest emails
4. Update `cancel-booking` for guest-initiated cancellations

### Phase 2: Host Configuration
5. Update booking link creation UI with guest permissions
6. Create `GuestPermissionToggles` component
7. Wire up new booking_links columns

### Phase 3: Guest Experience
8. Create `GuestBookingPortal` page
9. Update `GuestEmailInput` with permission toggles
10. Update `BookingForm` to pass permissions

### Phase 4: Time Proposals
11. Create `ProposeTimeDialog` component
12. Create `handle-time-proposal` edge function
13. Create `TimeProposalsManager` for hosts
14. Add proposal notification emails

### Phase 5: Polish & Testing
15. Comprehensive email template updates
16. Error handling and edge cases
17. Rate limiting and security hardening

---

## Security Considerations

1. **Token-based access** - Each guest gets unique UUID token
2. **Permission ceiling** - Guest permissions cannot exceed host settings
3. **Rate limiting** - All guest actions rate-limited per token
4. **Audit logging** - Track all guest actions for accountability
5. **Token expiry** - Consider expiring tokens after meeting ends
6. **Email verification** - Booker verified by booking ID + email match

---

## Testing Checklist

- [ ] Guest receives personalized invitation email
- [ ] Email shows booker name and host name
- [ ] Permission buttons only show when allowed
- [ ] Guest can access portal via unique link
- [ ] Guest can propose alternative time (if permitted)
- [ ] Guest can cancel meeting (if permitted)
- [ ] Guest can add attendees (if permitted)
- [ ] Host receives proposal notifications
- [ ] Host can accept/decline proposals
- [ ] All parties notified of changes
- [ ] Permissions cannot exceed host limits
- [ ] Rate limiting works correctly
- [ ] Cancelled bookings prevent further actions
