-- Create polls table for advanced poll features
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES live_channel_messages(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES live_channels(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of option strings
  poll_type TEXT DEFAULT 'single', -- 'single', 'multiple', 'ranking'
  allow_add_options BOOLEAN DEFAULT false,
  show_results_before_vote BOOLEAN DEFAULT true,
  close_at TIMESTAMPTZ,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id)
);

-- Create poll_votes table for storing votes
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_options JSONB NOT NULL, -- Array of option indices for single/multiple choice
  ranking JSONB, -- Array of option indices in ranked order
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id) -- One vote per user per poll
);

-- Add RLS policies for polls
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

-- Users can view polls in channels they have access to
CREATE POLICY "Users can view polls in accessible channels"
  ON polls
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM live_channels lc
      JOIN live_servers ls ON lc.server_id = ls.id
      JOIN live_server_members lsm ON ls.id = lsm.server_id
      WHERE lc.id = channel_id AND lsm.user_id = auth.uid()
    )
  );

-- Users can create polls in channels they have access to
CREATE POLICY "Users can create polls in accessible channels"
  ON polls
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM live_channels lc
      JOIN live_servers ls ON lc.server_id = ls.id
      JOIN live_server_members lsm ON ls.id = lsm.server_id
      WHERE lc.id = channel_id AND lsm.user_id = auth.uid()
    )
  );

-- Poll creators can update their own polls
CREATE POLICY "Poll creators can update own polls"
  ON polls
  FOR UPDATE
  USING (created_by = auth.uid());

-- Add RLS policies for poll_votes
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Users can view votes for polls they have access to
CREATE POLICY "Users can view votes in accessible polls"
  ON poll_votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM polls p
      JOIN live_channels lc ON p.channel_id = lc.id
      JOIN live_servers ls ON lc.server_id = ls.id
      JOIN live_server_members lsm ON ls.id = lsm.server_id
      WHERE p.id = poll_id AND lsm.user_id = auth.uid()
    )
  );

-- Users can insert their own votes
CREATE POLICY "Users can insert own votes"
  ON poll_votes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own votes
CREATE POLICY "Users can update own votes"
  ON poll_votes
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes"
  ON poll_votes
  FOR DELETE
  USING (user_id = auth.uid());

-- Add indexes for performance
CREATE INDEX polls_channel_id_idx ON polls(channel_id);
CREATE INDEX polls_message_id_idx ON polls(message_id);
CREATE INDEX polls_created_by_idx ON polls(created_by);
CREATE INDEX poll_votes_poll_id_idx ON poll_votes(poll_id);
CREATE INDEX poll_votes_user_id_idx ON poll_votes(user_id);

-- Add updated_at trigger for poll_votes
CREATE OR REPLACE FUNCTION update_poll_votes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER poll_votes_updated_at
  BEFORE UPDATE ON poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_poll_votes_updated_at();

-- Function to auto-close polls when close_at is reached
CREATE OR REPLACE FUNCTION auto_close_polls()
RETURNS void AS $$
BEGIN
  UPDATE polls
  SET is_closed = true
  WHERE close_at IS NOT NULL
    AND close_at <= NOW()
    AND is_closed = false;
END;
$$ LANGUAGE plpgsql;

-- Note: You would schedule this function to run periodically
-- For example, using pg_cron or a Supabase Edge Function on a schedule
