-- Add created_by column to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Backfill existing conversations with the first participant's user_id
UPDATE conversations SET created_by = (
  SELECT user_id FROM conversation_participants 
  WHERE conversation_id = conversations.id 
  ORDER BY joined_at ASC LIMIT 1
) WHERE created_by IS NULL;

-- Set default for new rows
ALTER TABLE conversations ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "View participating conversations" ON conversations;

-- Create updated SELECT policy that includes creator check
CREATE POLICY "View participating conversations" ON conversations
FOR SELECT USING (
  created_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id 
    AND cp.user_id = auth.uid()
  )
  OR
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  has_role(auth.uid(), 'strategist'::app_role)
);