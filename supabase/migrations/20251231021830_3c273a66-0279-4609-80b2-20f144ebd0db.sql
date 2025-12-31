-- Phase 3: Booking Approval Workflow Infrastructure

-- Add requires_approval flag to booking_links
ALTER TABLE public.booking_links 
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;

-- Add approval fields to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create booking_approval_requests table for tracking approval workflow
CREATE TABLE IF NOT EXISTS public.booking_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')) NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.booking_approval_requests ENABLE ROW LEVEL SECURITY;

-- Hosts can view and manage their own approval requests
CREATE POLICY "Users can view their own approval requests"
ON public.booking_approval_requests
FOR SELECT
USING (
  booking_id IN (
    SELECT id FROM public.bookings WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own approval requests"
ON public.booking_approval_requests
FOR UPDATE
USING (
  booking_id IN (
    SELECT id FROM public.bookings WHERE user_id = auth.uid()
  )
);

-- Index for pending approvals lookup
CREATE INDEX IF NOT EXISTS idx_booking_approval_requests_status 
ON public.booking_approval_requests(status, expires_at);

CREATE INDEX IF NOT EXISTS idx_booking_approval_requests_booking 
ON public.booking_approval_requests(booking_id);

-- Add index for bookings by status
CREATE INDEX IF NOT EXISTS idx_bookings_status 
ON public.bookings(status);

-- Update timestamp trigger for approval requests
CREATE TRIGGER update_booking_approval_requests_updated_at
BEFORE UPDATE ON public.booking_approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();