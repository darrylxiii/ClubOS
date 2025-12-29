-- Fix search_path security issue
DROP FUNCTION IF EXISTS public.get_pending_booking_reminders();

CREATE OR REPLACE FUNCTION public.get_pending_booking_reminders()
RETURNS TABLE (
  id UUID,
  booking_id UUID,
  reminder_type TEXT,
  send_before_minutes INTEGER,
  status TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  booking_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    br.id,
    br.booking_id,
    br.reminder_type,
    br.send_before_minutes,
    br.status,
    br.sent_at,
    br.created_at,
    jsonb_build_object(
      'id', b.id,
      'guest_name', b.guest_name,
      'guest_email', b.guest_email,
      'guest_phone', b.guest_phone,
      'scheduled_start', b.scheduled_start,
      'scheduled_end', b.scheduled_end,
      'booking_link', bl.*
    ) as booking_data
  FROM public.booking_reminders br
  JOIN public.bookings b ON b.id = br.booking_id
  JOIN public.booking_links bl ON bl.id = b.booking_link_id
  WHERE br.status = 'pending'
    AND br.send_before_minutes >= EXTRACT(EPOCH FROM (b.scheduled_start - NOW())) / 60;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;