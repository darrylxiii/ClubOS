-- Add guest platform choice columns to booking_links
ALTER TABLE booking_links 
ADD COLUMN IF NOT EXISTS allow_guest_platform_choice BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS available_platforms TEXT[] DEFAULT ARRAY['quantum_club'];

-- Backfill data: if Google Meet is selected, add it to available platforms
UPDATE booking_links 
SET available_platforms = ARRAY['quantum_club', 'google_meet']
WHERE video_conferencing_provider = 'google_meet' OR video_platform = 'google_meet';

-- Add video_platform column to bookings to track guest's choice
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS guest_selected_platform TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_booking_links_allow_guest_platform 
ON booking_links(allow_guest_platform_choice) WHERE allow_guest_platform_choice = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN booking_links.allow_guest_platform_choice IS 'If true, guests can choose their preferred video platform from available_platforms';
COMMENT ON COLUMN booking_links.available_platforms IS 'Array of platforms guests can choose from: quantum_club, google_meet';
COMMENT ON COLUMN bookings.guest_selected_platform IS 'The platform the guest selected when booking (if allow_guest_platform_choice was enabled)';