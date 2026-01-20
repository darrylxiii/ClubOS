-- Phase 1: Database Schema Enhancement

-- Add video_platform enum column to booking_links
ALTER TABLE booking_links 
ADD COLUMN IF NOT EXISTS video_platform TEXT 
CHECK (video_platform IN ('quantum_club', 'google_meet', 'zoom', 'microsoft_teams', 'none'))
DEFAULT 'quantum_club';

-- Add Google Meet specific settings
ALTER TABLE booking_links
ADD COLUMN IF NOT EXISTS google_meet_settings JSONB DEFAULT '{
  "auto_create": true,
  "enable_recording": false,
  "send_email_notifications": true
}'::jsonb;

-- Migrate existing data to new structure
UPDATE booking_links
SET video_platform = CASE
  WHEN create_quantum_meeting = true THEN 'quantum_club'
  WHEN video_conferencing_provider = 'google_meet' THEN 'google_meet'
  WHEN video_conferencing_provider = 'zoom' THEN 'zoom'
  WHEN video_conferencing_provider = 'microsoft_teams' THEN 'microsoft_teams'
  ELSE 'quantum_club'
END
WHERE video_platform IS NULL;

-- Add video platform tracking to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS active_video_platform TEXT
CHECK (active_video_platform IN ('quantum_club', 'google_meet', 'zoom', 'microsoft_teams'));

-- Add Google Meet event metadata
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS google_meet_event_id TEXT,
ADD COLUMN IF NOT EXISTS google_meet_hangout_link TEXT;

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_bookings_active_video_platform 
ON bookings(active_video_platform) WHERE active_video_platform IS NOT NULL;

-- Analytics view for video platform usage
CREATE OR REPLACE VIEW booking_video_platform_analytics AS
SELECT 
  bl.user_id,
  b.active_video_platform,
  COUNT(*) as booking_count,
  COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_count,
  COUNT(CASE WHEN b.attended = true THEN 1 END) as attended_count,
  ROUND(AVG(CASE WHEN b.attended = true THEN 1.0 ELSE 0.0 END) * 100, 2) as attendance_rate
FROM bookings b
JOIN booking_links bl ON b.booking_link_id = bl.id
WHERE b.created_at > NOW() - INTERVAL '30 days'
GROUP BY bl.user_id, b.active_video_platform;