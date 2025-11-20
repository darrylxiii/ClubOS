-- Enhanced RLS policies for conversations and messages
-- Add conversation metadata columns for new features
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false;
ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON conversations(is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_conversation_participants_muted ON conversation_participants(user_id, is_muted);

-- Enhanced RLS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversation settings" ON conversations;
DROP POLICY IF EXISTS "Users can delete conversations they created" ON conversations;

-- Recreate with enhanced security
CREATE POLICY "Users can view conversations they participate in" ON conversations
FOR SELECT USING (
  id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update conversation metadata" ON conversations
FOR UPDATE USING (
  id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- Enhanced participant policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their participant settings" ON conversation_participants;

CREATE POLICY "Users can view conversation participants" ON conversation_participants
FOR SELECT USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own participant settings" ON conversation_participants
FOR UPDATE USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Function to check if user is conversation participant
CREATE OR REPLACE FUNCTION is_conversation_participant(conv_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure message read receipts can only be created by participants
DROP POLICY IF EXISTS "Users can create read receipts for messages" ON message_read_receipts;

CREATE POLICY "Users can create read receipts for messages" ON message_read_receipts
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  message_id IN (
    SELECT m.id FROM messages m
    WHERE is_conversation_participant(m.conversation_id, auth.uid())
  )
);