
-- Add last_seen column for heartbeat tracking
ALTER TABLE meeting_participants
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

-- Create index for presence queries
CREATE INDEX IF NOT EXISTS idx_meeting_participants_last_seen 
ON meeting_participants(meeting_id, last_seen) 
WHERE left_at IS NULL;

-- Update existing active participants to have current timestamp
UPDATE meeting_participants
SET last_seen = NOW()
WHERE left_at IS NULL;
