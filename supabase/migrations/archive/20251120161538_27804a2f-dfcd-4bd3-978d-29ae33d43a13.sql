-- Fix function search path security issue
CREATE OR REPLACE FUNCTION queue_meeting_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue notifications for new invitations
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- Queue email notification
    INSERT INTO meeting_notification_queue (meeting_invitation_id, user_id, notification_type)
    VALUES (NEW.id, NEW.invitee_id, 'email');
    
    -- Queue browser notification
    INSERT INTO meeting_notification_queue (meeting_invitation_id, user_id, notification_type)
    VALUES (NEW.id, NEW.invitee_id, 'browser');
    
    -- Queue sound notification
    INSERT INTO meeting_notification_queue (meeting_invitation_id, user_id, notification_type)
    VALUES (NEW.id, NEW.invitee_id, 'sound');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;