-- Create booking links table for shareable scheduling pages
CREATE TABLE public.booking_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  buffer_before_minutes INTEGER DEFAULT 0,
  buffer_after_minutes INTEGER DEFAULT 0,
  advance_booking_days INTEGER DEFAULT 60,
  min_notice_hours INTEGER DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  custom_questions JSONB DEFAULT '[]'::jsonb,
  confirmation_message TEXT,
  redirect_url TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table for scheduled appointments
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_link_id UUID NOT NULL REFERENCES public.booking_links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  custom_responses JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  calendar_event_id TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT
);

-- Enable Row Level Security
ALTER TABLE public.booking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_links
CREATE POLICY "Users can view their own booking links"
  ON public.booking_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own booking links"
  ON public.booking_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own booking links"
  ON public.booking_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own booking links"
  ON public.booking_links FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Active booking links are viewable by everyone"
  ON public.booking_links FOR SELECT
  USING (is_active = true);

-- RLS Policies for bookings
CREATE POLICY "Users can view their own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Guests can view their bookings by email"
  ON public.bookings FOR SELECT
  USING (guest_email = (auth.jwt()->>'email'));

-- Create indexes for performance
CREATE INDEX idx_booking_links_slug ON public.booking_links(slug);
CREATE INDEX idx_booking_links_user_id ON public.booking_links(user_id);
CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX idx_bookings_scheduled_start ON public.bookings(scheduled_start);
CREATE INDEX idx_bookings_guest_email ON public.bookings(guest_email);

-- Trigger for updated_at
CREATE TRIGGER update_booking_links_updated_at
  BEFORE UPDATE ON public.booking_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();