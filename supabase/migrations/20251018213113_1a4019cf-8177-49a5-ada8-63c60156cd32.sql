-- Create video call sessions table
CREATE TABLE IF NOT EXISTS video_call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT,
  password TEXT,
  meeting_code TEXT UNIQUE,
  is_recording BOOLEAN DEFAULT false,
  recording_url TEXT,
  transcript JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'paused')),
  settings JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create video call participants table
CREATE TABLE IF NOT EXISTS video_call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES video_call_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'participant' CHECK (role IN ('host', 'co-host', 'participant', 'guest')),
  is_muted BOOLEAN DEFAULT false,
  is_video_off BOOLEAN DEFAULT false,
  is_screen_sharing BOOLEAN DEFAULT false,
  is_hand_raised BOOLEAN DEFAULT false,
  is_speaking BOOLEAN DEFAULT false,
  connection_quality TEXT DEFAULT 'good' CHECK (connection_quality IN ('excellent', 'good', 'fair', 'poor')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create video call signals table for WebRTC signaling
CREATE TABLE IF NOT EXISTS video_call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES video_call_sessions(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate', 'renegotiate')),
  signal_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create video call recordings table
CREATE TABLE IF NOT EXISTS video_call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES video_call_sessions(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  download_url TEXT,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  format TEXT DEFAULT 'webm',
  participants JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Create video call transcripts table
CREATE TABLE IF NOT EXISTS video_call_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES video_call_sessions(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES video_call_participants(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  confidence NUMERIC(3,2),
  timestamp_ms BIGINT NOT NULL,
  is_final BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create video call reactions table
CREATE TABLE IF NOT EXISTS video_call_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES video_call_sessions(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES video_call_participants(id) ON DELETE CASCADE NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('👍', '👏', '❤️', '😂', '🎉', '👋')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE video_call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_call_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_call_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_call_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_call_sessions
CREATE POLICY "Users can view sessions they're part of"
  ON video_call_sessions FOR SELECT
  USING (
    auth.uid() = host_id OR
    EXISTS (
      SELECT 1 FROM video_call_participants vcp
      WHERE vcp.session_id = video_call_sessions.id
      AND vcp.user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can create sessions"
  ON video_call_sessions FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their sessions"
  ON video_call_sessions FOR UPDATE
  USING (auth.uid() = host_id);

-- RLS Policies for video_call_participants
CREATE POLICY "Participants can view other participants in their sessions"
  ON video_call_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM video_call_participants vcp
      WHERE vcp.session_id = video_call_participants.session_id
      AND vcp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join as participants"
  ON video_call_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Participants can update their own data"
  ON video_call_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for video_call_signals
CREATE POLICY "Users can view signals for their sessions"
  ON video_call_signals FOR SELECT
  USING (
    auth.uid() = from_user_id OR
    auth.uid() = to_user_id OR
    to_user_id IS NULL
  );

CREATE POLICY "Users can send signals"
  ON video_call_signals FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update received signals"
  ON video_call_signals FOR UPDATE
  USING (auth.uid() = to_user_id OR to_user_id IS NULL);

-- RLS Policies for video_call_recordings
CREATE POLICY "Session participants can view recordings"
  ON video_call_recordings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM video_call_participants vcp
      WHERE vcp.session_id = video_call_recordings.session_id
      AND vcp.user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can create recordings"
  ON video_call_recordings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM video_call_sessions vcs
      WHERE vcs.id = session_id
      AND vcs.host_id = auth.uid()
    )
  );

-- RLS Policies for video_call_transcripts
CREATE POLICY "Session participants can view transcripts"
  ON video_call_transcripts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM video_call_participants vcp
      WHERE vcp.session_id = video_call_transcripts.session_id
      AND vcp.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create transcripts"
  ON video_call_transcripts FOR INSERT
  WITH CHECK (true);

-- RLS Policies for video_call_reactions
CREATE POLICY "Session participants can view reactions"
  ON video_call_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM video_call_participants vcp
      WHERE vcp.session_id = video_call_reactions.session_id
      AND vcp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can create reactions"
  ON video_call_reactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM video_call_participants vcp
      WHERE vcp.id = participant_id
      AND vcp.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_video_call_sessions_conversation ON video_call_sessions(conversation_id);
CREATE INDEX idx_video_call_sessions_status ON video_call_sessions(status);
CREATE INDEX idx_video_call_participants_session ON video_call_participants(session_id);
CREATE INDEX idx_video_call_participants_user ON video_call_participants(user_id);
CREATE INDEX idx_video_call_signals_session ON video_call_signals(session_id);
CREATE INDEX idx_video_call_signals_processed ON video_call_signals(processed);
CREATE INDEX idx_video_call_transcripts_session ON video_call_transcripts(session_id);

-- Enable realtime for signaling
ALTER PUBLICATION supabase_realtime ADD TABLE video_call_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE video_call_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE video_call_reactions;