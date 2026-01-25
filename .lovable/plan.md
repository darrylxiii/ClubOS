
# Complete Guest Permissions System - Fixes Implementation Plan

## Executive Summary

After a comprehensive audit, I've identified **7 critical integration gaps** that need to be fixed to complete the Guest Permissions & Notifications system. This plan addresses all issues in proper dependency order to ensure error-free deployment.

---

## Issues Identified

| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| 1 | **BookingForm guest state type mismatch** | High | `guests` state is `Array<{ name?; email }>` but needs `GuestWithPermissions[]` |
| 2 | **Missing allowedPermissions prop in BookingForm** | High | BookingForm doesn't fetch or pass guest_permissions from booking_links |
| 3 | **CreateBookingRequest missing permission fields** | High | API interface lacks guest permission fields |
| 4 | **create-booking Zod schema missing permissions** | High | Edge function doesn't validate/store guest permissions |
| 5 | **No anonymous RLS for GuestBookingPortal** | Critical | Guests can't query booking_guests via token - RLS blocks it |
| 6 | **Missing host UI for guest_permissions** | Medium | Scheduling.tsx lacks toggles to configure guest permissions |
| 7 | **TimeProposalsManager not integrated** | Low | Component exists but not wired into host dashboard |

---

## Implementation Plan

### Phase 1: Database Security (RLS Policy)

**File: Database Migration**

Add anonymous access policy for token-based guest authentication:

```sql
-- Allow anonymous users to SELECT booking_guests by access_token
CREATE POLICY "Guests can view their own record via token" ON booking_guests
  FOR SELECT TO anon
  USING (access_token = COALESCE(
    current_setting('request.jwt.claims', true)::json->>'access_token',
    current_setting('request.headers', true)::json->>'x-guest-token'
  )::uuid);
```

However, since the GuestBookingPortal uses authenticated Supabase client but guests aren't logged in, the simpler solution is to:
- Use the edge function `guest-booking-actions` (which uses service role) for all guest data fetching
- Update GuestBookingPortal to call the edge function instead of direct Supabase queries

---

### Phase 2: API & Type Updates

#### 2.1 Update CreateBookingRequest Interface

**File: `src/services/booking.ts`**

```typescript
export interface CreateBookingRequest {
  // ... existing fields ...
  guests?: Array<{ 
    name?: string; 
    email: string;
    can_cancel?: boolean;
    can_reschedule?: boolean;
    can_propose_times?: boolean;
    can_add_attendees?: boolean;
  }>;
  delegatedPermissions?: {
    can_cancel: boolean;
    can_reschedule: boolean;
    can_propose_times: boolean;
    can_add_attendees: boolean;
  };
}
```

#### 2.2 Update create-booking Edge Function Zod Schema

**File: `supabase/functions/create-booking/index.ts`**

```typescript
const bookingSchema = z.object({
  // ... existing fields ...
  guests: z.array(z.object({
    name: z.string().optional(),
    email: z.string().email(),
    can_cancel: z.boolean().optional(),
    can_reschedule: z.boolean().optional(),
    can_propose_times: z.boolean().optional(),
    can_add_attendees: z.boolean().optional(),
  })).max(10).optional(),
  delegatedPermissions: z.object({
    can_cancel: z.boolean(),
    can_reschedule: z.boolean(),
    can_propose_times: z.boolean(),
    can_add_attendees: z.boolean(),
  }).optional(),
});
```

Also update the booking insert to store `delegated_permissions` and ensure `send-booking-confirmation` receives guest permissions.

---

### Phase 3: BookingForm Integration

#### 3.1 Update BookingForm Props & State

**File: `src/components/booking/BookingForm.tsx`**

Changes needed:
1. Import `GuestWithPermissions` type
2. Change guests state type to `GuestWithPermissions[]`
3. Add `guestPermissions` prop from booking_links
4. Pass `allowedPermissions` and `showPermissions` to GuestEmailInput
5. Include guest permissions in createBooking request

```typescript
// Updated state
const [guests, setGuests] = useState<GuestWithPermissions[]>([]);

// Updated props interface
interface BookingFormProps {
  bookingLink: {
    // ... existing ...
    guest_permissions?: {
      allow_guest_cancel?: boolean;
      allow_guest_reschedule?: boolean;
      allow_guest_propose_times?: boolean;
      allow_guest_add_attendees?: boolean;
      booker_can_delegate?: boolean;
    };
  };
  // ...
}

// In JSX
<GuestEmailInput
  guests={guests}
  onChange={setGuests}
  maxGuests={10}
  allowedPermissions={bookingLink.guest_permissions ? {
    can_cancel: bookingLink.guest_permissions.allow_guest_cancel ?? false,
    can_reschedule: bookingLink.guest_permissions.allow_guest_reschedule ?? false,
    can_propose_times: bookingLink.guest_permissions.allow_guest_propose_times ?? true,
    can_add_attendees: bookingLink.guest_permissions.allow_guest_add_attendees ?? false,
  } : undefined}
  showPermissions={bookingLink.guest_permissions?.booker_can_delegate ?? false}
/>
```

#### 3.2 Update createBooking Call

```typescript
const data = await createBooking(
  {
    // ... existing ...
    guests: guests.length > 0 ? guests.map(g => ({
      name: g.name,
      email: g.email,
      can_cancel: g.can_cancel,
      can_reschedule: g.can_reschedule,
      can_propose_times: g.can_propose_times,
      can_add_attendees: g.can_add_attendees,
    })) : undefined,
  },
  // ...
);
```

---

### Phase 4: Update Public Booking Page

**File: `src/pages/BookingPage.tsx`**

Ensure booking_links query includes `guest_permissions`:

```typescript
const { data: bookingLinkData } = await supabase
  .from("booking_links")
  .select(`
    *,
    guest_permissions
  `)
  .eq("slug", slug)
  .single();
```

---

### Phase 5: GuestBookingPortal - Use Edge Function

**File: `src/pages/GuestBookingPortal.tsx`**

Change from direct Supabase queries to edge function calls:

```typescript
const loadBookingAndValidateAccess = async () => {
  if (!bookingId || !accessToken) return;
  
  setLoading(true);
  try {
    // Use the guest-booking-actions edge function for authenticated access
    const { data, error } = await supabase.functions.invoke("guest-booking-actions", {
      body: {
        action: 'get_details',
        accessToken,
        bookingId,
      },
    });

    if (error) throw error;
    
    if (data.success) {
      setBooking(data.booking);
      setGuestRecord({
        id: '', // Not needed for display
        email: data.viewer.email,
        name: data.booking.guests?.find(g => g.email === data.viewer.email)?.name,
        ...data.viewer.permissions,
      });
      setPermissions(data.viewer.permissions);
      setIsAuthenticated(true);
    }
  } catch (error) {
    console.error("Error loading booking:", error);
    toast.error("Could not find this booking or access is invalid");
  } finally {
    setLoading(false);
  }
};
```

---

### Phase 6: Host Configuration UI

**File: `src/pages/Scheduling.tsx`**

Add guest permissions section to booking link creation dialog:

#### 6.1 Update newLink State

```typescript
const [newLink, setNewLink] = useState({
  // ... existing fields ...
  guest_permissions: {
    allow_guest_cancel: false,
    allow_guest_reschedule: false,
    allow_guest_propose_times: true,
    allow_guest_add_attendees: false,
    booker_can_delegate: true,
  },
});
```

#### 6.2 Add UI Section (after Advanced Options)

```tsx
{/* Guest Permissions Section */}
<div className="space-y-4 pt-4 border-t">
  <h3 className="font-semibold flex items-center gap-2">
    <Users className="h-4 w-4" />
    Guest Permissions
  </h3>
  <p className="text-sm text-muted-foreground">
    Control what guests and attendees can do with bookings
  </p>
  
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <Label htmlFor="allow_propose_times" className="text-sm font-normal">
        Allow guests to propose alternative times
      </Label>
      <Switch
        id="allow_propose_times"
        checked={newLink.guest_permissions.allow_guest_propose_times}
        onCheckedChange={(checked) => setNewLink({
          ...newLink,
          guest_permissions: { ...newLink.guest_permissions, allow_guest_propose_times: checked }
        })}
      />
    </div>
    
    <div className="flex items-center justify-between">
      <Label htmlFor="allow_cancel" className="text-sm font-normal">
        Allow guests to cancel the meeting
      </Label>
      <Switch
        id="allow_cancel"
        checked={newLink.guest_permissions.allow_guest_cancel}
        onCheckedChange={(checked) => setNewLink({
          ...newLink,
          guest_permissions: { ...newLink.guest_permissions, allow_guest_cancel: checked }
        })}
      />
    </div>
    
    <div className="flex items-center justify-between">
      <Label htmlFor="allow_reschedule" className="text-sm font-normal">
        Allow guests to reschedule
      </Label>
      <Switch
        id="allow_reschedule"
        checked={newLink.guest_permissions.allow_guest_reschedule}
        onCheckedChange={(checked) => setNewLink({
          ...newLink,
          guest_permissions: { ...newLink.guest_permissions, allow_guest_reschedule: checked }
        })}
      />
    </div>
    
    <div className="flex items-center justify-between">
      <Label htmlFor="allow_add_attendees" className="text-sm font-normal">
        Allow guests to add more attendees
      </Label>
      <Switch
        id="allow_add_attendees"
        checked={newLink.guest_permissions.allow_guest_add_attendees}
        onCheckedChange={(checked) => setNewLink({
          ...newLink,
          guest_permissions: { ...newLink.guest_permissions, allow_guest_add_attendees: checked }
        })}
      />
    </div>
    
    <Separator className="my-2" />
    
    <div className="flex items-center justify-between">
      <div>
        <Label htmlFor="booker_delegate" className="text-sm font-normal">
          Allow booker to delegate permissions
        </Label>
        <p className="text-xs text-muted-foreground">
          Let the person booking decide what their guests can do
        </p>
      </div>
      <Switch
        id="booker_delegate"
        checked={newLink.guest_permissions.booker_can_delegate}
        onCheckedChange={(checked) => setNewLink({
          ...newLink,
          guest_permissions: { ...newLink.guest_permissions, booker_can_delegate: checked }
        })}
      />
    </div>
  </div>
</div>
```

#### 6.3 Update Reset State

Also update the reset state in `createBookingLink` success handler to include guest_permissions default.

---

### Phase 7: Update create-booking to Store delegated_permissions

**File: `supabase/functions/create-booking/index.ts`**

When inserting the booking, include delegated_permissions if provided:

```typescript
const { data: booking, error: bookingError } = await supabaseClient
  .from("bookings")
  .insert({
    // ... existing fields ...
    delegated_permissions: delegatedPermissions || {
      can_cancel: false,
      can_reschedule: false,
      can_propose_times: true,
      can_add_attendees: false,
    },
  })
  .select()
  .single();
```

---

### Phase 8: Optional - TimeProposalsManager Integration

**File: `src/pages/Scheduling.tsx`**

Add a tab or section to show pending time proposals using the TimeProposalsManager component.

This is lower priority but completes the host experience.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/booking.ts` | Add guest permission fields to CreateBookingRequest |
| `supabase/functions/create-booking/index.ts` | Update Zod schema, store delegated_permissions |
| `src/components/booking/BookingForm.tsx` | Update guests state type, pass allowedPermissions to GuestEmailInput |
| `src/pages/BookingPage.tsx` | Include guest_permissions in booking_links query |
| `src/pages/GuestBookingPortal.tsx` | Use edge function instead of direct queries |
| `src/pages/Scheduling.tsx` | Add guest_permissions to newLink state and UI toggles |

---

## Testing Checklist

- [ ] Host can configure guest permissions when creating booking link
- [ ] Booker sees permission toggles when adding guests (if booker_can_delegate is true)
- [ ] Guest receives email with correct permission-based action buttons
- [ ] Guest can access portal via unique token link
- [ ] Guest can propose alternative times (if permitted)
- [ ] Guest can cancel meeting (if permitted)
- [ ] Host sees pending time proposals
- [ ] All parties notified of changes

---

## Expected Outcomes

1. Complete end-to-end guest permission flow
2. Host controls ceiling of what guests can do
3. Booker can delegate within host limits
4. Guests have self-service portal with granted permissions
5. No RLS errors for guest access
6. All emails properly personalized with permissions
