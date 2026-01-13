-- Create booking reminders table
CREATE TABLE IF NOT EXISTS booking_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h', '1h', '15min')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add unique constraint to prevent duplicate reminders
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_reminders_unique 
ON booking_reminders(booking_id, reminder_type);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_booking_reminders_booking 
ON booking_reminders(booking_id);

-- Enable RLS
ALTER TABLE booking_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reminders for their own bookings
CREATE POLICY "Users can view their booking reminders"
ON booking_reminders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN booking_links bl ON b.booking_link_id = bl.id
    WHERE b.id = booking_reminders.booking_id
    AND bl.user_id = auth.uid()
  )
);

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule reminder checking every 5 minutes
SELECT cron.schedule(
  'check-booking-reminders',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://dpjucecmoyfzrduhlctt.supabase.co/functions/v1/send-booking-reminder',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwanVjZWNtb3lmenJkdWhsY3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mjc2MTAsImV4cCI6MjA3NTAwMzYxMH0.hdX709NlaXPUE4ohWtd3LBuAOqPKCBhVep694LC6tRw"}'::jsonb,
        body:=concat('{"triggered_at": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);