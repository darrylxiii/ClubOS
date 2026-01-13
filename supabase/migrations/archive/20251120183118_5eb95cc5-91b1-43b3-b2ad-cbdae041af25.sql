-- Drop the overly strict conversation_participants policies
DROP POLICY IF EXISTS "Users view own participations" ON conversation_participants;
DROP POLICY IF EXISTS "Users insert own participations" ON conversation_participants;
DROP POLICY IF EXISTS "Users update own participations" ON conversation_participants;
DROP POLICY IF EXISTS "Users delete own participations" ON conversation_participants;

-- Create relaxed policies for conversation_participants
-- Allow users to see ALL participants in conversations they're part of
CREATE POLICY "Participants see all in their conversations"
  ON conversation_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- Allow authenticated users to insert any participant (needed for conversation creation)
CREATE POLICY "Authenticated can insert participations"
  ON conversation_participants
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can only update their own participation settings
CREATE POLICY "Participants update own participation"
  ON conversation_participants
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can only delete their own participation
CREATE POLICY "Participants delete own participation"
  ON conversation_participants
  FOR DELETE
  USING (user_id = auth.uid());

-- Enable RLS on message_notifications if not already enabled
ALTER TABLE message_notifications ENABLE ROW LEVEL SECURITY;

-- Add policies for message_notifications
DROP POLICY IF EXISTS "Users read own notifications" ON message_notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON message_notifications;

CREATE POLICY "Users read own notifications"
  ON message_notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON message_notifications
  FOR UPDATE
  USING (user_id = auth.uid());