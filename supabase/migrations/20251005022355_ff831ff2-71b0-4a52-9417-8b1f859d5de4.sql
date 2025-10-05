-- Fix Bookings Data Exposure: Remove public INSERT policy
-- This prevents attackers from scraping customer contact information

-- Drop the vulnerable public INSERT policy
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;

-- Create a secure policy that only allows authenticated booking owners to insert
-- Bookings for guests will be created via the edge function using service role
CREATE POLICY "Booking owners can create bookings"
ON public.bookings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Note: The create-booking edge function now uses service role key to bypass RLS
-- and securely handle guest bookings with proper validation