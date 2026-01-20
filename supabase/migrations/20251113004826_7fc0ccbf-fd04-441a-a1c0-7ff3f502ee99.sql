-- Phase 1: Fix handle_guest_approval() trigger with simplified conflict handling
CREATE OR REPLACE FUNCTION public.handle_guest_approval()
RETURNS TRIGGER AS $$
DECLARE
  existing_participant_id UUID;
BEGIN
  -- Only proceed if status changed from pending to approved
  IF NEW.request_status = 'approved' AND OLD.request_status = 'pending' THEN
    
    RAISE NOTICE '[Trigger] Guest approval: % (session: %) for meeting %', 
      NEW.guest_name, NEW.session_token, NEW.meeting_id;
    
    -- Check if participant already exists and is active
    SELECT id INTO existing_participant_id
    FROM public.meeting_participants
    WHERE meeting_id = NEW.meeting_id
      AND session_token = NEW.session_token
      AND left_at IS NULL
    LIMIT 1;
    
    IF existing_participant_id IS NOT NULL THEN
      -- Update existing participant to accepted status
      UPDATE public.meeting_participants
      SET 
        status = 'accepted',
        joined_at = NOW(),
        guest_name = NEW.guest_name,
        guest_email = NEW.guest_email
      WHERE id = existing_participant_id;
      
      RAISE NOTICE '[Trigger] Updated existing participant: %', existing_participant_id;
    ELSE
      -- Insert new participant
      INSERT INTO public.meeting_participants (
        meeting_id,
        guest_name,
        guest_email,
        session_token,
        role,
        status,
        joined_at,
        left_at
      )
      VALUES (
        NEW.meeting_id,
        NEW.guest_name,
        NEW.guest_email,
        NEW.session_token,
        'guest',
        'accepted',
        NOW(),
        NULL
      );
      
      RAISE NOTICE '[Trigger] Created new participant';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Phase 3: Clean up stuck join requests
WITH stuck_requests AS (
  SELECT DISTINCT
    jr.id as request_id
  FROM public.meeting_join_requests jr
  INNER JOIN public.meeting_participants mp 
    ON jr.session_token = mp.session_token 
    AND jr.meeting_id = mp.meeting_id
  WHERE jr.request_status = 'pending'
    AND mp.status = 'accepted'
    AND mp.left_at IS NULL
)
UPDATE public.meeting_join_requests
SET 
  request_status = 'approved',
  responded_at = NOW()
FROM stuck_requests
WHERE meeting_join_requests.id = stuck_requests.request_id;