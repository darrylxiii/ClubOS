-- Phase 1 & 2 Remediation: Add SMS reminders infrastructure and indexes

-- Add sms_reminders column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS sms_reminders BOOLEAN DEFAULT false;

-- Create booking_reminder_logs table for tracking sent reminders
CREATE TABLE IF NOT EXISTS public.booking_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('email', 'sms')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  metadata JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_reminder_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for booking_reminder_logs (service role only - no direct user access)
CREATE POLICY "Service role can manage reminder logs"
ON public.booking_reminder_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create missing performance indexes
CREATE INDEX IF NOT EXISTS idx_bookings_link_status 
ON public.bookings(booking_link_id, status);

CREATE INDEX IF NOT EXISTS idx_booking_links_user_active 
ON public.booking_links(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_booking_reminder_logs_booking 
ON public.booking_reminder_logs(booking_id);

-- Add comment for documentation
COMMENT ON TABLE public.booking_reminder_logs IS 'Tracks all booking reminders sent via email or SMS';
COMMENT ON COLUMN public.bookings.sms_reminders IS 'Whether the guest opted in to receive SMS reminders';