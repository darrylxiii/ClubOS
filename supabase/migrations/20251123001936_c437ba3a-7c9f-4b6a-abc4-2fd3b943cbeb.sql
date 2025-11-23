-- Add tracking metadata for interview linking
ALTER TABLE detected_interviews 
ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS linked_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS auto_linked BOOLEAN DEFAULT false;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_detected_interviews_status_scheduled ON detected_interviews(status, scheduled_start) WHERE status IN ('confirmed', 'pending_review');
CREATE INDEX IF NOT EXISTS idx_detected_interviews_job_scheduled ON detected_interviews(job_id, scheduled_start) WHERE status != 'dismissed';

-- Add comment
COMMENT ON COLUMN detected_interviews.linked_at IS 'Timestamp when interview was linked to job/application';
COMMENT ON COLUMN detected_interviews.linked_by IS 'User who manually linked the interview (null for auto-linked)';
COMMENT ON COLUMN detected_interviews.auto_linked IS 'True if interview was automatically linked by detection algorithm';