-- Phase 1: Add provider column to calendar_connections
ALTER TABLE IF EXISTS calendar_connections 
ADD COLUMN IF NOT EXISTS provider TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_calendar_connections_provider 
ON calendar_connections(provider) WHERE provider IS NOT NULL;

-- Phase 1: Add detection_source to detected_interviews
ALTER TABLE IF EXISTS detected_interviews
ADD COLUMN IF NOT EXISTS detection_source TEXT DEFAULT 'calendar';

CREATE INDEX IF NOT EXISTS idx_detected_interviews_detection_source
ON detected_interviews(detection_source);

-- Phase 2: Create RPC function for booking reminders
CREATE OR REPLACE FUNCTION get_pending_booking_reminders()
RETURNS TABLE (
  reminder_id UUID,
  booking_id UUID,
  reminder_type TEXT,
  send_before_minutes INTEGER,
  guest_email TEXT,
  guest_name TEXT,
  guest_phone TEXT,
  scheduled_start TIMESTAMPTZ,
  link_title TEXT,
  duration_minutes INTEGER,
  user_id UUID
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT 
    br.id as reminder_id,
    br.booking_id,
    br.reminder_type,
    br.send_before_minutes,
    b.guest_email,
    b.guest_name,
    b.guest_phone,
    b.scheduled_start,
    bl.title as link_title,
    bl.duration_minutes,
    bl.user_id
  FROM booking_reminders br
  INNER JOIN bookings b ON br.booking_id = b.id
  INNER JOIN booking_links bl ON b.booking_link_id = bl.id
  WHERE br.status = 'pending'
  AND EXTRACT(EPOCH FROM (b.scheduled_start - NOW())) / 60 <= br.send_before_minutes
  AND EXTRACT(EPOCH FROM (b.scheduled_start - NOW())) / 60 > 0
  ORDER BY b.scheduled_start ASC;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_pending_booking_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_booking_reminders() TO service_role;