-- Phase 3: Race Condition Prevention - Database Constraints & Functions

-- 1. Create function to acquire advisory lock for booking slot
CREATE OR REPLACE FUNCTION public.try_acquire_booking_slot_lock(
  p_user_id UUID,
  p_scheduled_start TIMESTAMP WITH TIME ZONE,
  p_scheduled_end TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  lock_key BIGINT;
BEGIN
  -- Generate a deterministic lock key based on user_id and time slot
  -- This ensures the same slot always gets the same lock
  lock_key := ('x' || substr(md5(
    p_user_id::text || 
    p_scheduled_start::text || 
    p_scheduled_end::text
  ), 1, 15))::bit(60)::bigint;
  
  -- Try to acquire advisory lock (non-blocking)
  -- Returns true if lock acquired, false if already locked
  RETURN pg_try_advisory_lock(lock_key);
END;
$$;

-- 2. Create function to release advisory lock for booking slot
CREATE OR REPLACE FUNCTION public.release_booking_slot_lock(
  p_user_id UUID,
  p_scheduled_start TIMESTAMP WITH TIME ZONE,
  p_scheduled_end TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  lock_key BIGINT;
BEGIN
  -- Generate the same lock key
  lock_key := ('x' || substr(md5(
    p_user_id::text || 
    p_scheduled_start::text || 
    p_scheduled_end::text
  ), 1, 15))::bit(60)::bigint;
  
  -- Release advisory lock
  RETURN pg_advisory_unlock(lock_key);
END;
$$;

-- 3. Create function to check for booking conflicts (used in constraint)
CREATE OR REPLACE FUNCTION public.check_booking_conflict(
  p_user_id UUID,
  p_scheduled_start TIMESTAMP WITH TIME ZONE,
  p_scheduled_end TIMESTAMP WITH TIME ZONE,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM bookings 
    WHERE user_id = p_user_id
      AND status = 'confirmed'
      AND id != COALESCE(p_exclude_booking_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        -- Overlapping time slots
        (scheduled_start < p_scheduled_end AND scheduled_end > p_scheduled_start)
      )
  );
END;
$$;

-- 4. Add partial unique index to prevent overlapping bookings for same user
-- This is more efficient than a check constraint and prevents race conditions at DB level
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_no_overlap
ON bookings (user_id, scheduled_start, scheduled_end)
WHERE status = 'confirmed';

-- 5. Add index for faster conflict checking
CREATE INDEX IF NOT EXISTS idx_bookings_user_time_status
ON bookings (user_id, scheduled_start, scheduled_end, status)
WHERE status = 'confirmed';

-- 6. Create table to track failed calendar checks (for analytics)
CREATE TABLE IF NOT EXISTS public.booking_calendar_check_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  error_message TEXT,
  timeout BOOLEAN DEFAULT false,
  bypassed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on calendar check failures table
ALTER TABLE public.booking_calendar_check_failures ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can insert
CREATE POLICY "Service role can insert calendar check failures"
ON public.booking_calendar_check_failures
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Users can view their own calendar check failures
CREATE POLICY "Users can view own calendar check failures"
ON public.booking_calendar_check_failures
FOR SELECT
USING (auth.uid() = user_id);

-- 7. Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_calendar_check_failures_user_created
ON booking_calendar_check_failures (user_id, created_at DESC);

-- 8. Add index for provider analytics
CREATE INDEX IF NOT EXISTS idx_calendar_check_failures_provider
ON booking_calendar_check_failures (provider, created_at DESC);

COMMENT ON TABLE public.booking_calendar_check_failures IS 'Tracks calendar availability check failures for monitoring and analytics';
COMMENT ON FUNCTION public.try_acquire_booking_slot_lock IS 'Acquires advisory lock for booking slot to prevent race conditions';
COMMENT ON FUNCTION public.release_booking_slot_lock IS 'Releases advisory lock for booking slot';
COMMENT ON FUNCTION public.check_booking_conflict IS 'Checks if a booking time slot conflicts with existing confirmed bookings';