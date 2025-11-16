-- Fix meeting participants access control bypass
-- This prevents unauthorized users from joining meetings by validating access controls

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can insert participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Anyone can join as participant" ON public.meeting_participants;

-- Create a function to validate meeting access
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
BEGIN
  -- Get meeting details
  SELECT * INTO meeting_rec
  FROM meetings
  WHERE id = _meeting_id;
  
  -- Check if meeting exists
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is host
  IF meeting_rec.host_id = _user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if meeting allows public access
  IF meeting_rec.access_type = 'public' AND meeting_rec.allow_guests = TRUE THEN
    -- Check max participants
    IF meeting_rec.max_participants IS NOT NULL THEN
      SELECT COUNT(*) INTO participant_count
      FROM meeting_participants
      WHERE meeting_id = _meeting_id
        AND left_at IS NULL;
      
      IF participant_count >= meeting_rec.max_participants THEN
        RETURN FALSE;
      END IF;
    END IF;
    
    RETURN TRUE;
  END IF;
  
  -- For invite_only meetings, check if user is invited
  IF EXISTS (
    SELECT 1 FROM meeting_participants
    WHERE meeting_id = _meeting_id
      AND user_id = _user_id
      AND status IN ('invited', 'accepted')
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Create secure policy that enforces access controls
CREATE POLICY "Users can join meetings they have access to" 
ON public.meeting_participants
FOR INSERT
WITH CHECK (
  can_join_meeting(meeting_id, auth.uid())
);

-- Add comment documenting the security fix
COMMENT ON FUNCTION public.can_join_meeting IS 
'Validates if a user can join a meeting by checking access_type, host status, guest allowance, and capacity limits. Used to enforce meeting privacy and access controls.';

COMMENT ON POLICY "Users can join meetings they have access to" ON public.meeting_participants IS 
'Enforces meeting access controls including access_type, capacity limits, and invitation status. Prevents unauthorized joining of private meetings.';