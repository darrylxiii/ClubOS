-- Fix meeting_participants unique constraints for proper upsert support

-- First, drop any existing partial indexes that might conflict
DROP INDEX IF EXISTS idx_meeting_participants_active_unique;
DROP INDEX IF EXISTS idx_meeting_participants_active_guest_unique;

-- Create partial unique indexes with proper naming for ON CONFLICT support
-- For authenticated users: unique active participant per meeting
CREATE UNIQUE INDEX meeting_participants_user_active_unique 
ON meeting_participants(meeting_id, user_id) 
WHERE left_at IS NULL AND user_id IS NOT NULL;

-- For guests: unique active guest per meeting
CREATE UNIQUE INDEX meeting_participants_guest_active_unique 
ON meeting_participants(meeting_id, session_token) 
WHERE left_at IS NULL AND session_token IS NOT NULL;

-- Add comments for clarity
COMMENT ON INDEX meeting_participants_user_active_unique IS 
  'Ensures only one active authenticated user per meeting';
COMMENT ON INDEX meeting_participants_guest_active_unique IS 
  'Ensures only one active guest session per meeting';