-- Phase 4: Calendar & Availability Performance Improvements

-- Add index for user scheduled bookings (critical for availability queries)
CREATE INDEX IF NOT EXISTS idx_bookings_user_scheduled 
ON public.bookings(user_id, scheduled_start, status);

-- Add index for calendar connections lookup
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_active 
ON public.calendar_connections(user_id, is_active);

-- Add token_expired_at tracking column to calendar_connections
ALTER TABLE public.calendar_connections 
ADD COLUMN IF NOT EXISTS token_expired_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0;

-- Add onboarding_completed flag to profiles for availability setup
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS availability_onboarding_completed BOOLEAN DEFAULT false;

-- Add index for meetings by host and time (for conflict detection)
CREATE INDEX IF NOT EXISTS idx_meetings_host_scheduled 
ON public.meetings(host_id, scheduled_start, scheduled_end);

-- Add comment for documentation
COMMENT ON COLUMN public.calendar_connections.token_expired_at IS 'Timestamp when the OAuth token was detected as permanently expired';
COMMENT ON COLUMN public.calendar_connections.last_error IS 'Last error message from calendar sync attempt';
COMMENT ON COLUMN public.calendar_connections.error_count IS 'Consecutive error count for circuit breaker logic';
COMMENT ON COLUMN public.profiles.availability_onboarding_completed IS 'Whether user has completed the availability setup wizard';