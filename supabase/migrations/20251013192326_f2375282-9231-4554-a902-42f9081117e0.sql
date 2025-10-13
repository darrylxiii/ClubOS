-- Add read_at tracking for messages
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;

-- Create index for read receipts
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at);

-- Create message_read_receipts table for group conversations
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view read receipts for their conversations" ON message_read_receipts;
DROP POLICY IF EXISTS "Users can create read receipts" ON message_read_receipts;

-- RLS Policies for read receipts
CREATE POLICY "Users can view read receipts for their conversations"
ON message_read_receipts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_read_receipts.message_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create read receipts"
ON message_read_receipts FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_read_receipts.message_id
    AND cp.user_id = auth.uid()
  )
);

-- Enable realtime for read receipts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'message_read_receipts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_read_receipts;
  END IF;
END $$;