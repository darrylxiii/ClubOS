-- Phase 3 Database Schema Additions for Enterprise Voice/Video

-- Add E2E Encryption key storage
CREATE TABLE IF NOT EXISTS meeting_encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  key_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Call quality feedback from users
CREATE TABLE IF NOT EXISTS call_quality_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id),
  channel_id UUID REFERENCES live_channels(id),
  user_id UUID NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  issues TEXT[], -- ['audio_quality', 'video_quality', 'connection_drops', 'echo', 'latency']
  comment TEXT,
  connection_stats_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meeting audit logs for compliance
CREATE TABLE IF NOT EXISTS meeting_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'join', 'leave', 'mute', 'unmute', 'screen_share_start', 'screen_share_stop', 'recording_start', 'recording_stop'
  metadata JSONB,
  ip_hash TEXT, -- SHA256 hash of IP for privacy
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_quality_feedback_meeting ON call_quality_feedback(meeting_id);
CREATE INDEX IF NOT EXISTS idx_call_quality_feedback_channel ON call_quality_feedback(channel_id);
CREATE INDEX IF NOT EXISTS idx_call_quality_feedback_rating ON call_quality_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_call_quality_feedback_created ON call_quality_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_audit_logs_meeting ON meeting_audit_logs(meeting_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_audit_logs_user ON meeting_audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_audit_logs_action ON meeting_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_meeting_encryption_keys_meeting ON meeting_encryption_keys(meeting_id);

-- Enable RLS on new tables
ALTER TABLE call_quality_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_encryption_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_quality_feedback
-- Users can submit their own feedback
CREATE POLICY "Users can submit own feedback" ON call_quality_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON call_quality_feedback
  FOR SELECT USING (auth.uid() = user_id);

-- Admins/strategists can read all feedback for analytics
CREATE POLICY "Admins can read all feedback" ON call_quality_feedback
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

-- RLS Policies for meeting_audit_logs
-- Audit logs visible to admins only for compliance
CREATE POLICY "Admins can read audit logs" ON meeting_audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- System can insert audit logs (via service role)
CREATE POLICY "System can insert audit logs" ON meeting_audit_logs
  FOR INSERT WITH CHECK (true);

-- RLS Policies for meeting_encryption_keys
-- Meeting participants can read encryption keys
CREATE POLICY "Participants can read encryption keys" ON meeting_encryption_keys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM meeting_participants mp
      WHERE mp.meeting_id = meeting_encryption_keys.meeting_id
      AND (mp.user_id = auth.uid() OR mp.session_token = auth.uid()::text)
    )
  );

-- Meeting hosts can manage encryption keys
CREATE POLICY "Hosts can manage encryption keys" ON meeting_encryption_keys
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_encryption_keys.meeting_id
      AND m.host_id = auth.uid()
    )
  );

-- Add simulcast and recording columns to meeting_connection_stats if they don't exist
ALTER TABLE meeting_connection_stats 
ADD COLUMN IF NOT EXISTS simulcast_layers_active INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS recording_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS e2ee_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS noise_cancellation_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS content_type TEXT; -- 'camera', 'screen_share_detail', 'screen_share_motion'

-- Add similar columns to voice_connection_stats
ALTER TABLE voice_connection_stats
ADD COLUMN IF NOT EXISTS noise_cancellation_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS audio_level_db REAL,
ADD COLUMN IF NOT EXISTS speaking_time_ms INTEGER DEFAULT 0;