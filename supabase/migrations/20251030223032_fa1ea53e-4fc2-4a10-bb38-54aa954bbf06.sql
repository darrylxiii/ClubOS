-- Create meeting bots table
CREATE TABLE IF NOT EXISTS public.meeting_bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_type TEXT NOT NULL DEFAULT 'notetaker',
  display_name TEXT NOT NULL DEFAULT 'QUIN Notetaker',
  avatar_url TEXT,
  capabilities JSONB DEFAULT '{"transcription": true, "recording": true, "analysis": true}'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create meeting bot sessions table
CREATE TABLE IF NOT EXISTS public.meeting_bot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES public.meeting_bots(id),
  session_token TEXT UNIQUE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  connection_status TEXT DEFAULT 'connecting',
  recording_url TEXT,
  transcript_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(meeting_id, bot_id, joined_at)
);

-- Create meeting transcripts table
CREATE TABLE IF NOT EXISTS public.meeting_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  bot_session_id UUID REFERENCES public.meeting_bot_sessions(id),
  participant_id TEXT,
  participant_name TEXT,
  text TEXT NOT NULL,
  timestamp_ms BIGINT NOT NULL,
  is_final BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'en',
  confidence FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_meeting ON public.meeting_transcripts(meeting_id, timestamp_ms);
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_bot_session ON public.meeting_transcripts(bot_session_id);

-- Create meeting insights table
CREATE TABLE IF NOT EXISTS public.meeting_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  bot_session_id UUID REFERENCES public.meeting_bot_sessions(id),
  summary TEXT,
  key_points JSONB,
  action_items JSONB,
  decisions JSONB,
  participants_summary JSONB,
  topics JSONB,
  sentiment_analysis JSONB,
  questions_asked JSONB,
  full_transcript TEXT,
  analysis_status TEXT DEFAULT 'pending',
  processing_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.meeting_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_bots
CREATE POLICY "Meeting bots are viewable by everyone"
  ON public.meeting_bots FOR SELECT
  USING (true);

-- RLS Policies for meeting_bot_sessions
CREATE POLICY "Bot sessions viewable by meeting participants"
  ON public.meeting_bot_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meeting_participants
      WHERE meeting_id = meeting_bot_sessions.meeting_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage bot sessions"
  ON public.meeting_bot_sessions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for meeting_transcripts
CREATE POLICY "Transcripts viewable by meeting participants"
  ON public.meeting_transcripts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meeting_participants
      WHERE meeting_id = meeting_transcripts.meeting_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert transcripts"
  ON public.meeting_transcripts FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for meeting_insights
CREATE POLICY "Insights viewable by meeting participants"
  ON public.meeting_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meeting_participants
      WHERE meeting_id = meeting_insights.meeting_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage insights"
  ON public.meeting_insights FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Insert default QUIN Notetaker bot
INSERT INTO public.meeting_bots (bot_type, display_name, status, capabilities)
VALUES (
  'notetaker',
  'QUIN Notetaker',
  'active',
  '{"transcription": true, "recording": true, "analysis": true, "sentiment_analysis": true}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Add enable_notetaker field to meetings table
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS enable_notetaker BOOLEAN DEFAULT false;

-- Enable realtime for transcripts
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_transcripts;