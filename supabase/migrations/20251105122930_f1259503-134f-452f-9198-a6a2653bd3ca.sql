-- Auto-assign primary calendar to booking links that don't have one
-- This will help existing booking links start syncing to calendars

UPDATE booking_links bl
SET primary_calendar_id = (
  SELECT cc.id 
  FROM calendar_connections cc 
  WHERE cc.user_id = bl.user_id 
    AND cc.is_active = true 
  ORDER BY cc.created_at ASC 
  LIMIT 1
)
WHERE bl.primary_calendar_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM calendar_connections cc 
    WHERE cc.user_id = bl.user_id 
      AND cc.is_active = true
  );