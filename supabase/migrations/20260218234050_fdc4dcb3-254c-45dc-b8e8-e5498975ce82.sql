
-- Add payment columns to booking_links
ALTER TABLE public.booking_links 
  ADD COLUMN IF NOT EXISTS payment_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_amount numeric(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_currency text DEFAULT 'eur';

-- Add payment tracking to bookings
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_amount numeric(10,2) DEFAULT NULL;

-- Webhook events table for external consumers (n8n, Zapier)
CREATE TABLE IF NOT EXISTS public.booking_webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  booking_link_id uuid REFERENCES public.booking_links(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivered boolean DEFAULT false,
  delivery_attempts integer DEFAULT 0,
  last_delivery_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only booking link owners can see their webhook events
CREATE POLICY "Users can view webhook events for their booking links"
  ON public.booking_webhook_events
  FOR SELECT
  USING (
    booking_link_id IN (
      SELECT id FROM public.booking_links WHERE user_id = auth.uid()
    )
  );

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_webhook_events_booking_link ON public.booking_webhook_events(booking_link_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON public.booking_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_delivered ON public.booking_webhook_events(delivered) WHERE NOT delivered;

-- Trigger to auto-emit webhook events on booking changes
CREATE OR REPLACE FUNCTION public.emit_booking_webhook_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.booking_webhook_events (event_type, booking_id, booking_link_id, payload)
  VALUES (
    CASE TG_OP
      WHEN 'INSERT' THEN 'booking.created'
      WHEN 'UPDATE' THEN 
        CASE 
          WHEN NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN 'booking.cancelled'
          WHEN NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN 'booking.confirmed'
          ELSE 'booking.updated'
        END
      WHEN 'DELETE' THEN 'booking.deleted'
    END,
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.booking_link_id, OLD.booking_link_id),
    jsonb_build_object(
      'booking_id', COALESCE(NEW.id, OLD.id),
      'guest_name', COALESCE(NEW.guest_name, OLD.guest_name),
      'guest_email', COALESCE(NEW.guest_email, OLD.guest_email),
      'scheduled_start', COALESCE(NEW.scheduled_start, OLD.scheduled_start),
      'scheduled_end', COALESCE(NEW.scheduled_end, OLD.scheduled_end),
      'status', COALESCE(NEW.status, OLD.status),
      'payment_status', COALESCE(NEW.payment_status, OLD.payment_status)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_booking_webhook_event ON public.bookings;
CREATE TRIGGER trg_booking_webhook_event
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.emit_booking_webhook_event();
