-- Create whiteboard_states table for storing current canvas state per channel
CREATE TABLE IF NOT EXISTS whiteboard_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID REFERENCES live_channels(id) ON DELETE CASCADE,
  state_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(channel_id)
);

-- Create whiteboard_history table for undo/redo and audit trail
CREATE TABLE IF NOT EXISTS whiteboard_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID REFERENCES live_channels(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL, -- 'draw', 'erase', 'clear', 'undo', 'redo'
  operation_data JSONB NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for whiteboard_states
ALTER TABLE whiteboard_states ENABLE ROW LEVEL SECURITY;

-- Users can view whiteboard state for channels they have access to
CREATE POLICY "Users can view whiteboard states for accessible channels"
  ON whiteboard_states
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM live_channels lc
      JOIN live_servers ls ON lc.server_id = ls.id
      JOIN live_server_members lsm ON ls.id = lsm.server_id
      WHERE lc.id = channel_id AND lsm.user_id = auth.uid()
    )
  );

-- Users can insert whiteboard state for channels they have access to
CREATE POLICY "Users can insert whiteboard states for accessible channels"
  ON whiteboard_states
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM live_channels lc
      JOIN live_servers ls ON lc.server_id = ls.id
      JOIN live_server_members lsm ON ls.id = lsm.server_id
      WHERE lc.id = channel_id AND lsm.user_id = auth.uid()
    )
  );

-- Users can update whiteboard state for channels they have access to
CREATE POLICY "Users can update whiteboard states for accessible channels"
  ON whiteboard_states
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM live_channels lc
      JOIN live_servers ls ON lc.server_id = ls.id
      JOIN live_server_members lsm ON ls.id = lsm.server_id
      WHERE lc.id = channel_id AND lsm.user_id = auth.uid()
    )
  );

-- Add RLS policies for whiteboard_history
ALTER TABLE whiteboard_history ENABLE ROW LEVEL SECURITY;

-- Users can view history for channels they have access to
CREATE POLICY "Users can view whiteboard history for accessible channels"
  ON whiteboard_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM live_channels lc
      JOIN live_servers ls ON lc.server_id = ls.id
      JOIN live_server_members lsm ON ls.id = lsm.server_id
      WHERE lc.id = channel_id AND lsm.user_id = auth.uid()
    )
  );

-- Users can insert history for channels they have access to
CREATE POLICY "Users can insert whiteboard history for accessible channels"
  ON whiteboard_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM live_channels lc
      JOIN live_servers ls ON lc.server_id = ls.id
      JOIN live_server_members lsm ON ls.id = lsm.server_id
      WHERE lc.id = channel_id AND lsm.user_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX whiteboard_states_channel_id_idx ON whiteboard_states(channel_id);
CREATE INDEX whiteboard_history_channel_id_idx ON whiteboard_history(channel_id);
CREATE INDEX whiteboard_history_created_at_idx ON whiteboard_history(created_at);

-- Add updated_at trigger for whiteboard_states
CREATE OR REPLACE FUNCTION update_whiteboard_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whiteboard_states_updated_at
  BEFORE UPDATE ON whiteboard_states
  FOR EACH ROW
  EXECUTE FUNCTION update_whiteboard_states_updated_at();
