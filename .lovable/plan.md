

# Fix "Failed to Join Meeting" Error - RLS Policy Bug

## Problem Summary

Sebastiaan cannot join the meeting because the database is blocking his attempt to insert a participant record. The error message "Failed to join meeting. Please check connection" is misleading - the real issue is a Row Level Security (RLS) policy violation.

## Root Cause

The meeting has `access_type: invite_only`, and the RLS policy uses a function called `can_join_meeting()` that contains a logical flaw:

```text
For invite_only meetings:
  → Check if user already has a participant record with status 'invited' or 'accepted'
  → If YES → Allow INSERT
  → If NO → Block INSERT
```

**The contradiction**: How can a user have a participant record if they haven't been able to INSERT one yet? This only works if someone pre-creates an invite record for them.

Since users are joining via meeting code/link (not via explicit invitations), there's no pre-created record, and they get blocked.

---

## The Fix

Update the `can_join_meeting` function to allow authenticated users to join meetings in these scenarios:

1. **User is the host** → Already works
2. **Meeting is public with allow_guests** → Already works  
3. **Meeting is invite_only AND user has existing invite** → Already works
4. **NEW: Meeting is invite_only AND host is present** → Implied consent
5. **NEW: Meeting is open access** → Allow any authenticated user

Additionally, for the immediate fix, we should change the meeting's `access_type` to `open` or add Sebastiaan as an invited participant.

---

## Implementation Plan

### Phase 1: Update the can_join_meeting Function

**Database Migration:**

```sql
CREATE OR REPLACE FUNCTION public.can_join_meeting(
  _meeting_id UUID,
  _user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meeting_rec RECORD;
  participant_count INTEGER;
  host_is_present BOOLEAN;
BEGIN
  -- Get meeting details
  SELECT * INTO meeting_rec
  FROM meetings
  WHERE id = _meeting_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Always allow host
  IF meeting_rec.host_id = _user_id THEN
    RETURN TRUE;
  END IF;
  
  -- For public/open meetings with guests allowed
  IF meeting_rec.access_type IN ('public', 'open') AND meeting_rec.allow_guests = TRUE THEN
    -- Check max participants if set
    IF meeting_rec.max_participants IS NOT NULL THEN
      SELECT COUNT(*) INTO participant_count
      FROM meeting_participants
      WHERE meeting_id = _meeting_id AND left_at IS NULL;
      
      IF participant_count >= meeting_rec.max_participants THEN
        RETURN FALSE;
      END IF;
    END IF;
    RETURN TRUE;
  END IF;
  
  -- For invite_only: Check if user was explicitly invited
  IF EXISTS (
    SELECT 1 FROM meeting_participants
    WHERE meeting_id = _meeting_id
      AND user_id = _user_id
      AND status IN ('invited', 'accepted')
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- NEW: For invite_only meetings, allow join if host is actively present
  -- This handles the case where host shares a link and expects guests to join
  IF meeting_rec.access_type = 'invite_only' THEN
    SELECT EXISTS (
      SELECT 1 FROM meeting_participants
      WHERE meeting_id = _meeting_id
        AND user_id = meeting_rec.host_id
        AND left_at IS NULL
        AND last_seen > NOW() - INTERVAL '2 minutes'
    ) INTO host_is_present;
    
    IF host_is_present THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- NEW: If user has a booking/calendar entry for this meeting, allow join
  IF EXISTS (
    SELECT 1 FROM calendar_bookings cb
    JOIN calendar_invitees ci ON ci.booking_id = cb.id
    WHERE cb.id = (SELECT booking_id FROM meetings WHERE id = _meeting_id)
      AND ci.email = (SELECT email FROM auth.users WHERE id = _user_id)
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;
```

### Phase 2: Clean Up Database State

Reset any problematic participant records and add Sebastiaan as an invited participant for immediate testing:

```sql
-- Find Sebastiaan's user ID
SELECT id, email FROM auth.users WHERE email ILIKE '%sebastiaan%';

-- Add him as invited participant (if known)
INSERT INTO meeting_participants (meeting_id, user_id, status)
VALUES ('b1d749ce-33a3-4956-ac4a-b1759c353b4c', 'SEBASTIAAN_USER_ID', 'invited')
ON CONFLICT (meeting_id, user_id) WHERE left_at IS NULL 
DO UPDATE SET status = 'invited', left_at = NULL;
```

### Phase 3: Improve Error Messages

Update `MeetingRoom.tsx` to show specific error messages:

```typescript
} catch (error: any) {
  console.error('[MeetingRoom] ❌ Error joining meeting:', error);
  
  // Detect RLS violation
  const isRLSError = error?.message?.includes('row-level security') || 
                     error?.code === 'PGRST301';
  
  toast.error(
    isRLSError ? 'Not authorized to join' : 'Failed to join meeting',
    {
      description: isRLSError 
        ? 'You may need an invitation from the host to join this private meeting'
        : 'Please check your connection and try again',
      action: !isRLSError ? {
        label: 'Retry',
        onClick: () => handleJoinMeeting()
      } : undefined
    }
  );
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| Database Migration | Update `can_join_meeting` function to allow join when host is present |
| `src/pages/MeetingRoom.tsx` | Improve error handling to show RLS-specific messages |

---

## Immediate Workaround (Before Code Fix)

If you want Sebastiaan to join right now without waiting for the code fix, I can:

1. **Option A**: Change the meeting's `access_type` from `invite_only` to `open`
2. **Option B**: Add Sebastiaan as an invited participant manually

---

## Expected Results After Fix

| Scenario | Before | After |
|----------|--------|-------|
| User joins invite_only meeting via link | ❌ RLS blocks INSERT | ✅ Allowed if host is present |
| Error message on RLS block | "Check connection" | "Need invitation from host" |
| Host shares link, guests click | Cannot join | Can join immediately |

---

## Technical Details

### Why This Happened

The original `can_join_meeting` function was designed for explicit invitation workflows (host invites specific users). But the actual usage pattern is:

1. Host creates meeting → Shares link/code
2. Guest clicks link → Expects to join directly

The function didn't account for this "implicit invitation" pattern where having the link IS the invitation.

### The Fix Philosophy

The updated function allows joining when:
- Host is actively in the meeting (implies consent to receive guests)
- User was explicitly invited (original behavior)
- Meeting is public/open (original behavior)
- User has a calendar booking for the meeting (new)

This maintains security for invite_only meetings while supporting the practical reality of how video meetings work.

