-- Extend notification_preferences for meeting notifications
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS email_meetings BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sound_meetings BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS browser_meetings BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS meeting_sound_type TEXT DEFAULT 'chime',
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME,
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME;

-- Create meeting notification queue
CREATE TABLE IF NOT EXISTS meeting_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_invitation_id UUID NOT NULL REFERENCES meeting_invitations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'browser', 'sound')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create meeting notification analytics
CREATE TABLE IF NOT EXISTS meeting_notification_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_invitation_id UUID NOT NULL REFERENCES meeting_invitations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response_action TEXT CHECK (response_action IN ('accepted', 'declined', 'maybe', 'ignored')),
  response_time_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_meeting_notification_queue_user_status 
ON meeting_notification_queue(user_id, status);

CREATE INDEX IF NOT EXISTS idx_meeting_notification_queue_invitation 
ON meeting_notification_queue(meeting_invitation_id);

CREATE INDEX IF NOT EXISTS idx_meeting_notification_analytics_user 
ON meeting_notification_analytics(user_id);

CREATE INDEX IF NOT EXISTS idx_meeting_notification_analytics_invitation 
ON meeting_notification_analytics(meeting_invitation_id);

-- Enable RLS
ALTER TABLE meeting_notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notification_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_notification_queue
CREATE POLICY "Users can view their own notification queue"
ON meeting_notification_queue FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification queue"
ON meeting_notification_queue FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification queue"
ON meeting_notification_queue FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for meeting_notification_analytics
CREATE POLICY "Users can view their own notification analytics"
ON meeting_notification_analytics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification analytics"
ON meeting_notification_analytics FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to automatically queue notifications when meeting invitation is created
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic notification queueing
DROP TRIGGER IF EXISTS trigger_queue_meeting_notifications ON meeting_invitations;
CREATE TRIGGER trigger_queue_meeting_notifications
AFTER INSERT ON meeting_invitations
FOR EACH ROW
EXECUTE FUNCTION queue_meeting_notifications();

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE meeting_notification_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE meeting_notification_analytics;