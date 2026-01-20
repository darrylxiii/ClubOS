-- Create meeting_connection_stats table for quality monitoring
CREATE TABLE IF NOT EXISTS public.meeting_connection_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  user_id UUID NOT NULL,
  packet_loss_percent DECIMAL(5,2),
  latency_ms INTEGER,
  jitter_ms INTEGER,
  bitrate_kbps INTEGER,
  video_bitrate_kbps INTEGER,
  connection_state TEXT,
  quality_level TEXT CHECK (quality_level IN ('excellent', 'good', 'fair', 'poor', 'disconnected')),
  codec TEXT,
  fec_enabled BOOLEAN DEFAULT false,
  turn_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for fast queries
CREATE INDEX IF NOT EXISTS idx_meeting_connection_stats_meeting ON public.meeting_connection_stats(meeting_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_connection_stats_user ON public.meeting_connection_stats(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.meeting_connection_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can insert their own connection stats"
  ON public.meeting_connection_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own connection stats"
  ON public.meeting_connection_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Add columns to voice_connection_stats if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'voice_connection_stats' AND column_name = 'codec') THEN
    ALTER TABLE public.voice_connection_stats ADD COLUMN codec TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'voice_connection_stats' AND column_name = 'fec_enabled') THEN
    ALTER TABLE public.voice_connection_stats ADD COLUMN fec_enabled BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'voice_connection_stats' AND column_name = 'turn_used') THEN
    ALTER TABLE public.voice_connection_stats ADD COLUMN turn_used BOOLEAN DEFAULT false;
  END IF;
END $$;