-- Create message reactions table
CREATE TABLE IF NOT EXISTS live_channel_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES live_channel_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE live_channel_message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view reactions"
  ON live_channel_message_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add their own reactions"
  ON live_channel_message_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON live_channel_message_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE live_channel_message_reactions;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message 
  ON live_channel_message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_user 
  ON live_channel_message_reactions(user_id);