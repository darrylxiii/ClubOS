
# Fix: Booking Page Card Too Narrow

## Problem
The `max-w-2xl` (672px) constraint added in the last update is too tight for the booking page layout. The calendar and time slot columns are cramped, and the overall page feels compressed on desktop browsers (visible in the screenshot: calendar dates are cut off, content feels squeezed).

## Fix
In `src/pages/BookingPage.tsx`, line 322, change `max-w-2xl` to `max-w-4xl`:

```
// Before
<Card className="max-w-2xl mx-auto" ...>

// After
<Card className="max-w-4xl mx-auto" ...>
```

`max-w-4xl` = 896px, which gives the two-column date/time layout proper breathing room while still centering nicely on wide screens.

## Technical Details
- **File**: `src/pages/BookingPage.tsx`, line 322
- **Change**: Replace `max-w-2xl` with `max-w-4xl`
- Single line change, no other files affected
