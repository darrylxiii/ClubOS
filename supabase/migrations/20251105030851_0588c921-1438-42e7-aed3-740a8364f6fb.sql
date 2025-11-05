-- Phase 1.1: Enable Realtime for Bookings Table
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- Phase 1.2: Create Analytics Tables
CREATE TABLE IF NOT EXISTS public.booking_funnel_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id UUID REFERENCES public.booking_links(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  step TEXT NOT NULL,
  timezone TEXT,
  user_agent TEXT,
  referrer TEXT,
  step_duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_funnel_booking_link ON booking_funnel_analytics(booking_link_id, created_at DESC);
CREATE INDEX idx_funnel_session ON booking_funnel_analytics(session_id, created_at);
CREATE INDEX idx_funnel_step ON booking_funnel_analytics(step, created_at DESC);

CREATE TABLE IF NOT EXISTS public.booking_slot_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id UUID REFERENCES public.booking_links(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour < 24),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  timezone TEXT NOT NULL,
  views_count INTEGER DEFAULT 0,
  bookings_count INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(booking_link_id, date, hour)
);

CREATE INDEX idx_slot_analytics_booking_link ON booking_slot_analytics(booking_link_id, date DESC);
CREATE INDEX idx_slot_analytics_popular ON booking_slot_analytics(booking_link_id, bookings_count DESC);

-- RLS Policies for Analytics Tables
ALTER TABLE public.booking_funnel_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_slot_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert on funnel analytics"
ON public.booking_funnel_analytics FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view own funnel analytics"
ON public.booking_funnel_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM booking_links bl 
    WHERE bl.id = booking_funnel_analytics.booking_link_id 
    AND bl.user_id = auth.uid()
  )
);

CREATE POLICY "Allow anonymous operations on slot analytics"
ON public.booking_slot_analytics FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view own slot analytics"
ON public.booking_slot_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM booking_links bl 
    WHERE bl.id = booking_slot_analytics.booking_link_id 
    AND bl.user_id = auth.uid()
  )
);

-- Phase 1.4: Update Waitlist Table Schema
ALTER TABLE public.booking_waitlist 
ADD COLUMN IF NOT EXISTS preferred_time_range TEXT CHECK (preferred_time_range IN ('morning', 'afternoon', 'evening')),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_waitlist_booking_link_notified 
ON booking_waitlist(booking_link_id, notified, created_at);

CREATE INDEX IF NOT EXISTS idx_waitlist_email 
ON booking_waitlist(guest_email);

-- Phase 2.2: Add Custom Answers Column
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS custom_answers JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_bookings_custom_answers 
ON bookings USING gin(custom_answers);

-- Database function for tracking slot views
CREATE OR REPLACE FUNCTION public.track_slot_view(
  p_booking_link_id UUID,
  p_slot_start TIMESTAMP WITH TIME ZONE,
  p_timezone TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot_date DATE;
  slot_hour INTEGER;
  slot_dow INTEGER;
BEGIN
  slot_date := (p_slot_start AT TIME ZONE p_timezone)::DATE;
  slot_hour := EXTRACT(HOUR FROM (p_slot_start AT TIME ZONE p_timezone));
  slot_dow := EXTRACT(DOW FROM (p_slot_start AT TIME ZONE p_timezone));
  
  INSERT INTO booking_slot_analytics (
    booking_link_id,
    date,
    hour,
    day_of_week,
    timezone,
    views_count
  )
  VALUES (
    p_booking_link_id,
    slot_date,
    slot_hour,
    slot_dow,
    p_timezone,
    1
  )
  ON CONFLICT (booking_link_id, date, hour)
  DO UPDATE SET
    views_count = booking_slot_analytics.views_count + 1,
    updated_at = now();
END;
$$;