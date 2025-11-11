-- Create database trigger to automatically add guest to meeting_participants when join request is approved
-- This ensures guests can immediately connect via WebRTC after approval

CREATE OR REPLACE FUNCTION handle_guest_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed from pending to approved
  IF NEW.request_status = 'approved' AND OLD.request_status = 'pending' THEN
    -- Insert guest into meeting_participants table
    INSERT INTO meeting_participants (
      meeting_id,
      user_id,
      guest_name,
      guest_email,
      session_token,
      role,
      status,
      joined_at
    ) VALUES (
      NEW.meeting_id,
      NULL,
      NEW.guest_name,
      NEW.guest_email,
      NEW.session_token,
      'participant',
      'accepted',
      NOW()
    )
    ON CONFLICT (meeting_id, session_token) 
    DO UPDATE SET
      status = 'accepted',
      left_at = NULL,
      joined_at = NOW()
    WHERE meeting_participants.left_at IS NOT NULL;
    
    -- Log the action
    RAISE NOTICE 'Guest % (session: %) added to meeting % participants', NEW.guest_name, NEW.session_token, NEW.meeting_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS guest_approval_participant_insert ON meeting_join_requests;

CREATE TRIGGER guest_approval_participant_insert
AFTER UPDATE ON meeting_join_requests
FOR EACH ROW
EXECUTE FUNCTION handle_guest_approval();