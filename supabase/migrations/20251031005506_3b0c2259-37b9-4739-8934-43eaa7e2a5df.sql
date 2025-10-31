-- Add calendar sync fields to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS synced_to_calendar BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS calendar_event_id TEXT,
ADD COLUMN IF NOT EXISTS calendar_provider TEXT;

-- Add calendar integration settings to booking_links
ALTER TABLE booking_links
ADD COLUMN IF NOT EXISTS primary_calendar_id UUID REFERENCES calendar_connections(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS create_quantum_meeting BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_club_ai BOOLEAN DEFAULT false;

-- Create calendar sync log table
CREATE TABLE IF NOT EXISTS calendar_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  calendar_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_booking ON calendar_sync_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_meeting ON bookings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_bookings_calendar_event ON bookings(calendar_event_id);

-- Enable RLS on calendar_sync_log
ALTER TABLE calendar_sync_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view sync logs for their own bookings
CREATE POLICY "Users can view their booking sync logs"
ON calendar_sync_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN booking_links bl ON b.booking_link_id = bl.id
    WHERE b.id = calendar_sync_log.booking_id
    AND bl.user_id = auth.uid()
  )
);