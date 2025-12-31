-- Add performance indexes for meeting transcripts and connection stats
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_meeting_timestamp 
ON meeting_transcripts(meeting_id, timestamp_ms);

CREATE INDEX IF NOT EXISTS idx_meeting_connection_stats_meeting 
ON meeting_connection_stats(meeting_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meeting_connection_stats_user 
ON meeting_connection_stats(user_id, created_at DESC);