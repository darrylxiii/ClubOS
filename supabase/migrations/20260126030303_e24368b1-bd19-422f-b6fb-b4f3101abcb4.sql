-- Update can_join_meeting function to allow join when host is actively present
-- This fixes the logical flaw where invite_only meetings block users joining via shared links

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
    WHERE cb.id = meeting_rec.booking_id
      AND ci.email = (SELECT email FROM auth.users WHERE id = _user_id)
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;