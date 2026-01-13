
-- Add search_path to handle_guest_approval function to prevent schema poisoning attacks
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
      role,
      joined_at,
      is_active,
      connection_quality,
      audio_enabled,
      video_enabled
    )
    VALUES (
      NEW.meeting_id,
      NEW.user_id,
      NEW.guest_name,
      NEW.guest_email,
      'guest',
      NOW(),
      true,
      'good',
      true,
      true
    )
    ON CONFLICT (meeting_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(guest_email, ''))
    DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
