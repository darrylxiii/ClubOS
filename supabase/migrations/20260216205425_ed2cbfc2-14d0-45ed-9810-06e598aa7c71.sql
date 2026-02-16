-- Fix: Restrict bookings INSERT to service_role only
-- Forces all booking creation through the edge function which has
-- reCAPTCHA, rate limiting, and input validation

DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;

CREATE POLICY "Only service role can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
