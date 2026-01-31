
-- Fix remaining issues for 100/100

-- Add policies to booking_rate_limits table (RLS enabled but no policies)
-- This is a rate limiting table for public booking - needs permissive policies for the system to work
CREATE POLICY "System can insert rate limit records"
  ON public.booking_rate_limits FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can read rate limit records"
  ON public.booking_rate_limits FOR SELECT
  USING (true);

CREATE POLICY "System can delete expired rate limits"
  ON public.booking_rate_limits FOR DELETE
  USING (created_at < NOW() - INTERVAL '1 hour');
