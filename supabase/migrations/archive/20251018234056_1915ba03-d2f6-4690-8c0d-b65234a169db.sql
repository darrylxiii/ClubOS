-- Clean up duplicate meeting participants
-- First, mark old duplicates as left
UPDATE meeting_participants
SET left_at = joined_at + INTERVAL '1 minute', status = 'left'
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY meeting_id, COALESCE(user_id::text, session_token)
      ORDER BY joined_at DESC
    ) as rn
    FROM meeting_participants
    WHERE left_at IS NULL
  ) t
  WHERE rn > 1
);

-- Add unique constraint to prevent duplicate active participants
CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_participants_active_unique
ON meeting_participants(meeting_id, user_id)
WHERE left_at IS NULL AND user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_participants_active_guest_unique
ON meeting_participants(meeting_id, session_token)
WHERE left_at IS NULL AND session_token IS NOT NULL;