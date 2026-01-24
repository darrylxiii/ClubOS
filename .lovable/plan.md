

# Fix Booking Confirmation Database Trigger Error

## Problem Identified

The booking confirmation fails with the error:
```
record "new" has no field "scheduled_at"
```

### Root Cause Analysis

A database trigger `trg_activity_bookings` fires on every `INSERT` or `UPDATE` to the `bookings` table. The trigger calls `log_user_activity()` which has **two critical bugs**:

| Bug | Location | Issue |
|-----|----------|-------|
| 1. Wrong column name | Line 104 | References `NEW.scheduled_at` but column is `scheduled_start` |
| 2. Identity mismatch | Line 96 | Uses `NEW.candidate_id` which may be `NULL` for non-interview bookings |

### Bookings Table Schema (Verified)

```text
scheduled_start     TIMESTAMPTZ  ← Correct column name
scheduled_end       TIMESTAMPTZ
user_id            UUID         ← Host user
candidate_id       UUID         ← May be NULL for general bookings
```

### Current Buggy Trigger Code

```sql
-- supabase/migrations/20260121020842_...sql (lines 95-106)
ELSIF TG_TABLE_NAME = 'bookings' THEN
  target_user_id := NEW.candidate_id;          -- BUG: May be NULL
  activity_type_name := CASE 
    WHEN TG_OP = 'INSERT' THEN 'interview_scheduled'
    WHEN TG_OP = 'UPDATE' AND NEW.status = 'completed' THEN 'interview_completed'
    ELSE NULL
  END;
  activity_data := jsonb_build_object(
    'booking_id', NEW.id,
    'scheduled_at', NEW.scheduled_at,           -- BUG: Column doesn't exist
    'status', NEW.status
  );
```

---

## Solution: Fix the `log_user_activity()` Function

### Database Migration Required

Create a new migration to fix the trigger function with correct column references:

```sql
-- Fix log_user_activity() function for bookings table
CREATE OR REPLACE FUNCTION public.log_user_activity()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  activity_type_name TEXT;
  activity_data JSONB;
BEGIN
  -- Determine user_id based on table
  IF TG_TABLE_NAME = 'applications' THEN
    target_user_id := NEW.candidate_id;
    activity_type_name := CASE 
      WHEN TG_OP = 'INSERT' THEN 'application_submitted'
      WHEN TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN 'application_status_changed'
      ELSE NULL
    END;
    activity_data := jsonb_build_object(
      'job_id', NEW.job_id,
      'status', NEW.status,
      'action', TG_OP
    );
  ELSIF TG_TABLE_NAME = 'assessment_results' THEN
    target_user_id := NEW.user_id;
    activity_type_name := 'assessment_completed';
    activity_data := jsonb_build_object(
      'assessment_id', NEW.assessment_id,
      'assessment_name', NEW.assessment_name,
      'score', NEW.score
    );
  ELSIF TG_TABLE_NAME = 'bookings' THEN
    -- FIX 1: Use candidate_id if available, otherwise fall back to user_id (host)
    -- For interview bookings, candidate_id should be set
    -- For general bookings, use user_id as the activity owner
    target_user_id := COALESCE(NEW.candidate_id, NEW.user_id);
    
    activity_type_name := CASE 
      WHEN TG_OP = 'INSERT' THEN 
        CASE WHEN NEW.candidate_id IS NOT NULL THEN 'interview_scheduled' ELSE 'booking_created' END
      WHEN TG_OP = 'UPDATE' AND NEW.status = 'completed' THEN 'interview_completed'
      WHEN TG_OP = 'UPDATE' AND NEW.status = 'cancelled' THEN 'booking_cancelled'
      ELSE NULL
    END;
    
    -- FIX 2: Use scheduled_start instead of scheduled_at
    activity_data := jsonb_build_object(
      'booking_id', NEW.id,
      'scheduled_start', NEW.scheduled_start,
      'scheduled_end', NEW.scheduled_end,
      'status', NEW.status,
      'guest_name', NEW.guest_name
    );
  ELSIF TG_TABLE_NAME = 'milestone_comments' THEN
    target_user_id := NEW.user_id;
    activity_type_name := 'comment_added';
    activity_data := jsonb_build_object(
      'milestone_id', NEW.milestone_id,
      'comment_id', NEW.id
    );
  END IF;

  -- Only insert if we have a valid activity type AND user_id
  IF activity_type_name IS NOT NULL AND target_user_id IS NOT NULL THEN
    INSERT INTO public.activity_timeline (user_id, activity_type, activity_data, created_at)
    VALUES (target_user_id, activity_type_name, activity_data, now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## Implementation Details

### Fixes Applied

| Issue | Before | After |
|-------|--------|-------|
| Column reference | `NEW.scheduled_at` (doesn't exist) | `NEW.scheduled_start` |
| Identity fallback | `NEW.candidate_id` (may be NULL) | `COALESCE(NEW.candidate_id, NEW.user_id)` |
| Activity data | Only booking_id, scheduled_at, status | booking_id, scheduled_start, scheduled_end, status, guest_name |
| Activity types | Only interview_scheduled, interview_completed | Added booking_created, booking_cancelled |

### Why This Fix Works

1. **Column Name Fix**: The `bookings` table uses `scheduled_start` and `scheduled_end` columns (verified from schema). The trigger was referencing a non-existent `scheduled_at` column.

2. **Identity Fallback**: For general booking links (non-interview), `candidate_id` is `NULL`. Using `COALESCE()` ensures we always have a valid `user_id` to log activity against.

3. **Richer Activity Data**: Including more fields in `activity_data` makes the timeline more useful for UI display.

---

## Files to Modify

| File | Changes |
|------|---------|
| Database Migration (new) | Fix `log_user_activity()` function with correct column references |

---

## Verification Checklist

After applying the fix:
- [ ] `/book/:slug` page loads without errors
- [ ] Selecting a time slot works correctly
- [ ] Clicking "Confirm Booking" creates the booking successfully
- [ ] No "scheduled_at" errors in console/logs
- [ ] Activity timeline correctly logs booking events
- [ ] Both interview bookings (with candidate_id) and general bookings (without) work

---

## Technical Notes

### Database Trigger Execution Flow

```text
INSERT INTO bookings (...)
    │
    ▼
AFTER INSERT TRIGGER: trg_activity_bookings
    │
    ▼
FUNCTION: log_user_activity()
    │
    ├─→ Builds activity_data using NEW.scheduled_at  ← ERROR HERE
    │
    └─→ Postgres error: record "new" has no field "scheduled_at"
```

### After Fix

```text
INSERT INTO bookings (...)
    │
    ▼
AFTER INSERT TRIGGER: trg_activity_bookings
    │
    ▼
FUNCTION: log_user_activity()
    │
    ├─→ Builds activity_data using NEW.scheduled_start  ← CORRECT
    │
    └─→ INSERT INTO activity_timeline (...)  ← SUCCESS
```

