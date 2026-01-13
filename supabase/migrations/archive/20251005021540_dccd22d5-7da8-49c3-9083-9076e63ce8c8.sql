-- Phase 1, Step 2: Fix Bookings Data Theft
-- Drop the vulnerable policy that allows email-based access
DROP POLICY IF EXISTS "Guests can view their bookings by email" ON public.bookings;

-- Create a more secure policy that requires proper authentication
CREATE POLICY "Booking owners can view their bookings"
ON public.bookings
FOR SELECT
USING (auth.uid() = user_id);

-- Phase 1, Step 3: Remove Conversation Stats Public Access
-- Drop the overly permissive ALL policy
DROP POLICY IF EXISTS "System can manage conversation stats" ON public.conversation_stats;

-- Participant-restricted SELECT policy already exists
-- System updates will use service role key instead of public policy