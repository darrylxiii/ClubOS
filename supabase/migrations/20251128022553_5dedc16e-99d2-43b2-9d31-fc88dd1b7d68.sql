-- Fix RLS policies for live_channel_participants to allow better join experience
DROP POLICY IF EXISTS "Users can view participants in channels they are members of" ON live_channel_participants;
DROP POLICY IF EXISTS "Users can insert their own participant record" ON live_channel_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON live_channel_participants;
DROP POLICY IF EXISTS "Users can delete their own participant record" ON live_channel_participants;

-- New improved policies
CREATE POLICY "Users can view participants if they are server members"
ON live_channel_participants
FOR SELECT
USING (
  channel_id IN (
    SELECT c.id 
    FROM live_channels c
    WHERE c.server_id IN (
      SELECT server_id FROM live_server_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage their own participant records"
ON live_channel_participants
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create channel-attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('channel-attachments', 'channel-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for channel-attachments
CREATE POLICY "Users can upload attachments to channels they're in"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'channel-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view attachments in their channels"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'channel-attachments'
  AND (
    -- User uploaded it
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- User is in a server that has this channel
    (storage.foldername(name))[2] IN (
      SELECT c.id::text
      FROM live_channels c
      WHERE c.server_id IN (
        SELECT server_id FROM live_server_members WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'channel-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add function to cleanup stale participants (older than 5 minutes with no activity)
CREATE OR REPLACE FUNCTION cleanup_stale_channel_participants()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM live_channel_participants
  WHERE last_activity_at < NOW() - INTERVAL '5 minutes';
END;
$$;