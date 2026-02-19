

# Fix: "record new has no field meeting_type" Booking Error

## Root Cause

The trigger `meeting_scheduled_activity_trigger` fires on every INSERT into the `bookings` table and calls the function `log_meeting_to_activity_feed()`. This function references `NEW.meeting_type` -- but the `bookings` table does not have a `meeting_type` column. This causes every booking creation to fail with:

```
Failed to create booking: record "new" has no field "meeting_type"
```

The table does have `is_interview_booking` and `candidate_id` (which the function also uses), but `meeting_type` was never added.

## Fix: Add missing column via migration

The simplest and safest fix is to add the missing `meeting_type` column to the `bookings` table with a sensible default. This keeps the activity feed logging intact (which is valuable for audit/analytics).

```sql
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS meeting_type text DEFAULT 'booking';
```

This is preferred over modifying the trigger because:
- The `meeting_type` field is useful data to have (distinguishes interviews, calls, etc.)
- The activity feed entry becomes more informative
- No risk of breaking other code that may reference this column

## Other Triggers Verified

All other triggers on the `bookings` table were checked and are clean:
- `create_booking_reminders` -- OK
- `trg_booking_webhook_event` -- OK
- `update_booking_analytics_trigger` -- OK
- `trg_activity_bookings` -- OK
- `trigger_update_behavior_pattern` -- OK
- `update_bookings_updated_at` -- OK

## Impact

After this single migration, booking creation will work end-to-end. No edge function or frontend changes needed.

---

## Technical Details

| Item | Detail |
|---|---|
| Table | `public.bookings` |
| Missing column | `meeting_type` (text, default 'booking') |
| Failing trigger | `meeting_scheduled_activity_trigger` calling `log_meeting_to_activity_feed()` |
| Trigger line | `'meeting_type', NEW.meeting_type` in `jsonb_build_object(...)` |
| Migration | Single `ALTER TABLE ADD COLUMN IF NOT EXISTS` |

