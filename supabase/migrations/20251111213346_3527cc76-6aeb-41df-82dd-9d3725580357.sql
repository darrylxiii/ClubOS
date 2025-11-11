-- Add guests column to bookings table for multiple attendees support
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS guests JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN bookings.guests IS 'Array of additional guest objects: [{ name: "John Doe", email: "john@example.com" }]';

-- Create index for better query performance on guests
CREATE INDEX IF NOT EXISTS idx_bookings_guests ON bookings USING GIN(guests);