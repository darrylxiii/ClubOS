-- Voice connection stats table for Discord-style quality tracking
CREATE TABLE IF NOT EXISTS public.voice_connection_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.live_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  packet_loss_percent DECIMAL(5,2),
  latency_ms INTEGER,
  jitter_ms INTEGER,
  bitrate_kbps INTEGER,
  connection_state TEXT,
  quality_level TEXT CHECK (quality_level IN ('excellent', 'good', 'fair', 'poor', 'disconnected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice reconnection log for debugging
CREATE TABLE IF NOT EXISTS public.voice_reconnection_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.live_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT,
  success BOOLEAN,
  attempt_number INTEGER,
  retry_delay_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_connection_stats_channel ON public.voice_connection_stats(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_connection_stats_user ON public.voice_connection_stats(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_reconnection_log_channel ON public.voice_reconnection_log(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_reconnection_log_user ON public.voice_reconnection_log(user_id, created_at DESC);

-- RLS policies
ALTER TABLE public.voice_connection_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_reconnection_log ENABLE ROW LEVEL SECURITY;

-- Users can insert their own stats
CREATE POLICY "Users can insert own voice stats"
  ON public.voice_connection_stats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view stats for channels they're in
CREATE POLICY "Users can view voice stats"
  ON public.voice_connection_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_channel_participants
      WHERE channel_id = voice_connection_stats.channel_id
      AND user_id = auth.uid()
    )
  );

-- Users can insert their own reconnection logs
CREATE POLICY "Users can insert own reconnection logs"
  ON public.voice_reconnection_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own reconnection logs
CREATE POLICY "Users can view own reconnection logs"
  ON public.voice_reconnection_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all voice stats
CREATE POLICY "Admins can view all voice stats"
  ON public.voice_connection_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Admins can view all reconnection logs
CREATE POLICY "Admins can view all reconnection logs"
  ON public.voice_reconnection_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Cleanup old stats function (keep last 7 days for stats, 30 for logs)
CREATE OR REPLACE FUNCTION cleanup_old_voice_stats()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM voice_connection_stats
  WHERE created_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  DELETE FROM voice_reconnection_log
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  RETURN deleted_count;
END;
$$;