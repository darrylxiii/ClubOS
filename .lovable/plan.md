

# Add Attendee Avatars and Click-to-Detail to Home Agenda Widget

## What Changes

The home page "Upcoming Meetings" widget will show **stacked attendee avatars** next to each meeting and become **clickable** to open the full meeting detail modal (the same one used in the /meetings calendar).

## Visual Result

Each meeting row will look like:

```text
9:00 AM    Client Interview    [JD][AK][+3]    Join
Tomorrow   Panel Review        [SM][RB]         
```

- Up to 3 stacked circular avatars showing attendee initials (derived from email)
- A "+N" overflow indicator when there are more than 3 attendees
- Clicking any row opens the `EventDetailModal` with full details (time, location, attendees, description, actions)

## Data Source

- The `attendees` field already exists on `UnifiedCalendarEvent` as `string[]` (email addresses)
- Google Calendar events already populate this from the invite's attendee list
- Microsoft events follow the same pattern
- Internal TQC meetings currently do not populate attendees (will show no avatars, which is correct)

## Technical Details

### File: `src/components/clubhome/ActiveMeetingsWidget.tsx`

**1. Import `EventDetailModal`**
- Import from `@/components/meetings/EventDetailModal`
- Import `Avatar`, `AvatarFallback` from `@/components/ui/avatar`

**2. Add modal state**
- `selectedEvent` state (`UnifiedCalendarEvent | null`)
- `detailOpen` state (`boolean`)

**3. Make each row clickable**
- Wrap each event row in a clickable container with `cursor-pointer`
- On click: set `selectedEvent` and open the modal
- Prevent click propagation on the "Join" button so it still works independently

**4. Add stacked avatars component**
- Inline helper to extract initials from email (e.g., `john.doe@gmail.com` becomes `JD`)
- Render up to 3 overlapping `Avatar` circles (using negative margin for stacking: `-ml-2`)
- Show `+N` pill for overflow
- Size: `h-6 w-6` to fit the compact row layout

**5. Render `EventDetailModal` at the bottom**
- Pass `selectedEvent`, `detailOpen`, and `onOpenChange` to the modal

### No other files need changes
- `EventDetailModal` already handles all event types (TQC, Google, Microsoft)
- `UnifiedCalendarEvent.attendees` is already populated by `calendarAggregation.ts`
- Avatar/AvatarFallback components already exist

### Design Considerations
- Avatars use the existing `bg-muted` style with `text-xs` initials for consistency
- Stacking uses `flex -space-x-2` pattern (standard overlap technique)
- The "+N" overflow badge uses `bg-muted text-muted-foreground` to stay subtle
- Row hover state already exists (`hover:bg-card/40`), adding `cursor-pointer` completes the interaction affordance
- Join button click propagation is stopped so clicking "Join" does not also open the detail modal
