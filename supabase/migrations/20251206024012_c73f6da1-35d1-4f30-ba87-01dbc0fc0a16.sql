-- Add scheduled_send_at column to booking_reminders for event-driven scheduling
ALTER TABLE booking_reminders 
ADD COLUMN IF NOT EXISTS scheduled_send_at TIMESTAMPTZ;

-- Backfill existing reminders with calculated send times
UPDATE booking_reminders br
SET scheduled_send_at = (
  SELECT b.scheduled_start - (br.send_before_minutes || ' minutes')::INTERVAL
  FROM bookings b WHERE b.id = br.booking_id
)
WHERE scheduled_send_at IS NULL;

-- Create index for efficient queries on pending reminders
CREATE INDEX IF NOT EXISTS idx_booking_reminders_scheduled_send 
ON booking_reminders(scheduled_send_at) WHERE status = 'pending';

-- Mark past reminders as failed (cleanup stale data - missed send window)
UPDATE booking_reminders br
SET status = 'failed'
WHERE status = 'pending'
AND scheduled_send_at < NOW();

-- Function to unschedule a booking reminder cron job
CREATE OR REPLACE FUNCTION unschedule_booking_reminder(p_reminder_id UUID)
RETURNS VOID AS $$
DECLARE
  job_name TEXT;
BEGIN
  job_name := 'reminder_' || p_reminder_id::TEXT;
  
  -- Try to unschedule the job (ignore if it doesn't exist)
  BEGIN
    PERFORM cron.unschedule(job_name);
  EXCEPTION WHEN OTHERS THEN
    -- Job doesn't exist or already unscheduled - that's fine
    NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;