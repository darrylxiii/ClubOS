-- Phase 1: Live Hub Database Schema

-- Main servers table (The Quantum Club as default)
CREATE TABLE live_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  banner_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channels (voice, text, video, stage, screenshare)
CREATE TABLE live_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES live_servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel_type TEXT CHECK (channel_type IN ('voice', 'text', 'stage', 'video', 'screenshare')) NOT NULL,
  category TEXT,
  position INT DEFAULT 0,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  is_locked BOOLEAN DEFAULT false,
  user_limit INT DEFAULT 99,
  auto_record BOOLEAN DEFAULT false,
  auto_transcribe BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active participants in channels
CREATE TABLE live_channel_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES live_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('speaker', 'listener', 'moderator', 'host')) DEFAULT 'speaker',
  is_muted BOOLEAN DEFAULT false,
  is_deafened BOOLEAN DEFAULT false,
  is_video_on BOOLEAN DEFAULT false,
  is_screen_sharing BOOLEAN DEFAULT false,
  is_speaking BOOLEAN DEFAULT false,
  is_hand_raised BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- Channel messages
CREATE TABLE live_channel_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES live_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments JSONB,
  is_pinned BOOLEAN DEFAULT false,
  reply_to_id UUID REFERENCES live_channel_messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channel recordings with AI processing
CREATE TABLE live_channel_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES live_channels(id) ON DELETE CASCADE,
  started_by UUID REFERENCES auth.users(id),
  storage_path TEXT,
  duration_seconds INT,
  file_size_bytes BIGINT,
  participants JSONB DEFAULT '[]',
  transcript JSONB DEFAULT '[]',
  ai_summary TEXT,
  ai_action_items JSONB DEFAULT '[]',
  ai_decisions JSONB DEFAULT '[]',
  ai_insights JSONB DEFAULT '{}',
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Server membership for access control
CREATE TABLE live_server_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES live_servers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'member', 'guest')) DEFAULT 'member',
  nickname TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE live_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_channel_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_channel_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_server_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_servers
CREATE POLICY "Users can view servers they are members of"
  ON live_servers FOR SELECT
  USING (
    id IN (
      SELECT server_id FROM live_server_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Server owners can update their servers"
  ON live_servers FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can create servers"
  ON live_servers FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- RLS Policies for live_channels
CREATE POLICY "Members can view server channels"
  ON live_channels FOR SELECT
  USING (
    server_id IN (
      SELECT server_id FROM live_server_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Server admins can manage channels"
  ON live_channels FOR ALL
  USING (
    server_id IN (
      SELECT server_id FROM live_server_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for live_channel_participants
CREATE POLICY "Users can view participants in their channels"
  ON live_channel_participants FOR SELECT
  USING (
    channel_id IN (
      SELECT id FROM live_channels 
      WHERE server_id IN (
        SELECT server_id FROM live_server_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can join channels"
  ON live_channel_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participant status"
  ON live_channel_participants FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can leave channels"
  ON live_channel_participants FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for live_channel_messages
CREATE POLICY "Members can view channel messages"
  ON live_channel_messages FOR SELECT
  USING (
    channel_id IN (
      SELECT id FROM live_channels 
      WHERE server_id IN (
        SELECT server_id FROM live_server_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can send messages"
  ON live_channel_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    channel_id IN (
      SELECT id FROM live_channels 
      WHERE server_id IN (
        SELECT server_id FROM live_server_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own messages"
  ON live_channel_messages FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
  ON live_channel_messages FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for live_channel_recordings
CREATE POLICY "Participants can view recordings"
  ON live_channel_recordings FOR SELECT
  USING (
    channel_id IN (
      SELECT id FROM live_channels 
      WHERE server_id IN (
        SELECT server_id FROM live_server_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Channel moderators can create recordings"
  ON live_channel_recordings FOR INSERT
  WITH CHECK (started_by = auth.uid());

-- RLS Policies for live_server_members
CREATE POLICY "Members can view other members"
  ON live_server_members FOR SELECT
  USING (
    server_id IN (
      SELECT server_id FROM live_server_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Server owners can manage members"
  ON live_server_members FOR ALL
  USING (
    server_id IN (
      SELECT server_id FROM live_server_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner'
    )
  );

-- Enable Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE live_channel_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE live_channel_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE live_channels;

-- Create indexes for performance
CREATE INDEX idx_live_channels_server_id ON live_channels(server_id);
CREATE INDEX idx_live_channel_participants_channel_id ON live_channel_participants(channel_id);
CREATE INDEX idx_live_channel_participants_user_id ON live_channel_participants(user_id);
CREATE INDEX idx_live_channel_messages_channel_id ON live_channel_messages(channel_id);
CREATE INDEX idx_live_channel_messages_created_at ON live_channel_messages(created_at DESC);
CREATE INDEX idx_live_channel_recordings_channel_id ON live_channel_recordings(channel_id);
CREATE INDEX idx_live_server_members_server_id ON live_server_members(server_id);
CREATE INDEX idx_live_server_members_user_id ON live_server_members(user_id);

-- Function to update last_activity_at
CREATE OR REPLACE FUNCTION update_participant_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_participant_activity_trigger
  BEFORE UPDATE ON live_channel_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_activity();

-- Function to auto-remove inactive participants (left hanging)
CREATE OR REPLACE FUNCTION cleanup_inactive_participants()
RETURNS void AS $$
BEGIN
  DELETE FROM live_channel_participants
  WHERE last_activity_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;