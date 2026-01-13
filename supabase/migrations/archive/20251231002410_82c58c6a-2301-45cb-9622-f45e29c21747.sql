-- Add retry tracking for stuck recordings
ALTER TABLE meeting_recordings_extended 
  ADD COLUMN IF NOT EXISTS analysis_retry_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_analysis_attempt timestamp with time zone;

-- Add index for performance on stuck recording queries
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_analysis_status 
  ON meeting_recordings_extended(analysis_status, processing_status, analysis_retry_count);

-- Add meeting data audit table for tracking data quality
CREATE TABLE IF NOT EXISTS meeting_data_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
  recording_id uuid REFERENCES meeting_recordings_extended(id) ON DELETE CASCADE,
  check_type text NOT NULL,
  passed boolean NOT NULL,
  details jsonb,
  checked_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE meeting_data_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view audit data (simplify for now, we'll tighten later)
CREATE POLICY "Authenticated users can view audit data" ON meeting_data_audit
  FOR SELECT TO authenticated USING (true);

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_meeting_data_audit_meeting ON meeting_data_audit(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_data_audit_recording ON meeting_data_audit(recording_id);