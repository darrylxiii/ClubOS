-- Force drop everything with CASCADE
DROP FUNCTION IF EXISTS is_conversation_participant(uuid, uuid) CASCADE;

-- Drop and recreate all conversation_participants policies
DROP POLICY IF EXISTS "Users can view their own participations" ON conversation_participants CASCADE;
DROP POLICY IF EXISTS "Users can insert their own participations" ON conversation_participants CASCADE;
DROP POLICY IF EXISTS "Users can update their own participation settings" ON conversation_participants CASCADE;
DROP POLICY IF EXISTS "Users can delete their own participations" ON conversation_participants CASCADE;

CREATE POLICY "Users view own participations"
  ON conversation_participants
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own participations"
  ON conversation_participants
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own participations"
  ON conversation_participants
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own participations"
  ON conversation_participants
  FOR DELETE
  USING (user_id = auth.uid());

-- Drop and recreate conversation policies
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations CASCADE;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations CASCADE;
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON conversations CASCADE;

CREATE POLICY "View participating conversations"
  ON conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Create conversations"
  ON conversations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Update participating conversations"
  ON conversations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
    )
  );

-- Recreate read receipts policy
DROP POLICY IF EXISTS "Users can create read receipts for their messages" ON message_read_receipts CASCADE;

CREATE POLICY "Create read receipts"
  ON message_read_receipts
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_read_receipts.message_id
      AND cp.user_id = auth.uid()
    )
  );