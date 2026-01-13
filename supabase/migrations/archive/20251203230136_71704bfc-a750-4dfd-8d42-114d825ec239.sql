-- Add jitter buffer and DTX tracking columns to voice_connection_stats
ALTER TABLE voice_connection_stats 
ADD COLUMN IF NOT EXISTS jitter_buffer_ms INTEGER,
ADD COLUMN IF NOT EXISTS buffer_underruns INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dtx_enabled BOOLEAN DEFAULT false;

-- Add mobile device tracking
ALTER TABLE voice_connection_stats
ADD COLUMN IF NOT EXISTS is_mobile BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS device_type TEXT;

-- Create voice quality alerts table for admin monitoring
CREATE TABLE IF NOT EXISTS voice_quality_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES live_channels(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('packet_loss', 'high_latency', 'connection_failed', 'buffer_underrun', 'poor_quality')),
  severity TEXT CHECK (severity IN ('warning', 'critical')),
  details JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for fast queries
CREATE INDEX IF NOT EXISTS idx_voice_quality_alerts_channel ON voice_quality_alerts(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_quality_alerts_meeting ON voice_quality_alerts(meeting_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_quality_alerts_unresolved ON voice_quality_alerts(resolved) WHERE resolved = false;

-- Add jitter buffer tracking to meeting_connection_stats
ALTER TABLE meeting_connection_stats
ADD COLUMN IF NOT EXISTS jitter_buffer_ms INTEGER,
ADD COLUMN IF NOT EXISTS buffer_underruns INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dtx_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_mobile BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS device_type TEXT;

-- Enable RLS on voice_quality_alerts
ALTER TABLE voice_quality_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for voice_quality_alerts - simplified
CREATE POLICY "Users can view their own alerts"
ON voice_quality_alerts FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create alerts"
ON voice_quality_alerts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own alerts"
ON voice_quality_alerts FOR UPDATE
USING (user_id = auth.uid());