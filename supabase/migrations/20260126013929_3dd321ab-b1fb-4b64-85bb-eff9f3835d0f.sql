-- Phase 3: Add unique constraint for active meeting participants
-- This prevents duplicate active participant records per user per meeting

-- First, clean up any existing duplicate active records
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY meeting_id, user_id 
    ORDER BY joined_at DESC NULLS LAST
  ) as rn
  FROM meeting_participants
  WHERE left_at IS NULL AND user_id IS NOT NULL
)
UPDATE meeting_participants 
SET left_at = NOW(), status = 'left'
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Clean up duplicate guest records too
WITH guest_duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY meeting_id, session_token 
    ORDER BY joined_at DESC NULLS LAST
  ) as rn
  FROM meeting_participants
  WHERE left_at IS NULL AND session_token IS NOT NULL
)
UPDATE meeting_participants 
SET left_at = NOW(), status = 'left'
WHERE id IN (SELECT id FROM guest_duplicates WHERE rn > 1);

-- Now create the unique partial indexes to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_participants_unique_active_user
ON meeting_participants(meeting_id, user_id)
WHERE left_at IS NULL AND user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_participants_unique_active_guest
ON meeting_participants(meeting_id, session_token)
WHERE left_at IS NULL AND session_token IS NOT NULL;