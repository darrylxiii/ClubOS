-- Add team scheduling and advanced features to booking system

-- Add team/round-robin support to booking links
ALTER TABLE public.booking_links
ADD COLUMN IF NOT EXISTS team_members uuid[] DEFAULT ARRAY[]::uuid[],
ADD COLUMN IF NOT EXISTS scheduling_type text DEFAULT 'individual' CHECK (scheduling_type IN ('individual', 'round_robin', 'pooled', 'collective')),
ADD COLUMN IF NOT EXISTS routing_rules jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS video_conferencing_provider text CHECK (video_conferencing_provider IN ('google_meet', 'zoom', 'teams', 'webex', 'none')),
ADD COLUMN IF NOT EXISTS auto_generate_meeting_link boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS max_bookings_per_day integer,
ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_waitlist boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS single_use boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS max_uses integer,
ADD COLUMN IF NOT EXISTS use_count integer DEFAULT 0;

-- Create booking reminders table
CREATE TABLE IF NOT EXISTS public.booking_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('email', 'sms', 'both')),
  send_before_minutes integer NOT NULL,
  sent_at timestamp with time zone,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at timestamp with time zone DEFAULT now()
);

-- Create booking workflows table
CREATE TABLE IF NOT EXISTS public.booking_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id uuid NOT NULL REFERENCES public.booking_links(id) ON DELETE CASCADE,
  workflow_type text NOT NULL CHECK (workflow_type IN ('confirmation', 'reminder', 'follow_up', 'no_show', 'cancellation')),
  trigger_minutes integer,
  email_template text,
  sms_template text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create meeting polls table
CREATE TABLE IF NOT EXISTS public.meeting_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id uuid NOT NULL REFERENCES public.booking_links(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  proposed_times jsonb NOT NULL DEFAULT '[]'::jsonb,
  votes jsonb DEFAULT '{}'::jsonb,
  selected_time timestamp with time zone,
  status text DEFAULT 'active' CHECK (status IN ('active', 'closed', 'booked')),
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone
);

-- Create booking waitlist table
CREATE TABLE IF NOT EXISTS public.booking_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id uuid NOT NULL REFERENCES public.booking_links(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text,
  preferred_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  notified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Create booking analytics table
CREATE TABLE IF NOT EXISTS public.booking_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id uuid NOT NULL REFERENCES public.booking_links(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  views integer DEFAULT 0,
  bookings_created integer DEFAULT 0,
  bookings_completed integer DEFAULT 0,
  bookings_cancelled integer DEFAULT 0,
  no_shows integer DEFAULT 0,
  conversion_rate numeric,
  avg_booking_time_minutes numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(booking_link_id, date)
);

-- Add video link and enhanced fields to bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS video_meeting_link text,
ADD COLUMN IF NOT EXISTS video_meeting_id text,
ADD COLUMN IF NOT EXISTS video_meeting_password text,
ADD COLUMN IF NOT EXISTS attended boolean,
ADD COLUMN IF NOT EXISTS no_show boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS assigned_team_member uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Create booking calendar sync table
CREATE TABLE IF NOT EXISTS public.booking_calendar_syncs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  calendar_provider text NOT NULL CHECK (calendar_provider IN ('google', 'outlook', 'apple')),
  calendar_event_id text NOT NULL,
  synced_at timestamp with time zone DEFAULT now(),
  last_updated timestamp with time zone DEFAULT now(),
  sync_status text DEFAULT 'synced' CHECK (sync_status IN ('synced', 'failed', 'pending')),
  UNIQUE(booking_id, calendar_provider)
);

-- Enable RLS
ALTER TABLE public.booking_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_calendar_syncs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_reminders
CREATE POLICY "Booking owners can view reminders"
  ON public.booking_reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_reminders.booking_id
      AND b.user_id = auth.uid()
    )
  );

-- RLS Policies for booking_workflows
CREATE POLICY "Booking link owners can manage workflows"
  ON public.booking_workflows FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_links bl
      WHERE bl.id = booking_workflows.booking_link_id
      AND bl.user_id = auth.uid()
    )
  );

-- RLS Policies for meeting_polls
CREATE POLICY "Poll creators can manage polls"
  ON public.meeting_polls FOR ALL
  USING (created_by = auth.uid());

CREATE POLICY "Anyone can view active polls"
  ON public.meeting_polls FOR SELECT
  USING (status = 'active');

-- RLS Policies for booking_waitlist
CREATE POLICY "Booking link owners can view waitlist"
  ON public.booking_waitlist FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_links bl
      WHERE bl.id = booking_waitlist.booking_link_id
      AND bl.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can join waitlist"
  ON public.booking_waitlist FOR INSERT
  WITH CHECK (true);

-- RLS Policies for booking_analytics
CREATE POLICY "Booking link owners can view analytics"
  ON public.booking_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_links bl
      WHERE bl.id = booking_analytics.booking_link_id
      AND bl.user_id = auth.uid()
    )
  );

-- RLS Policies for booking_calendar_syncs
CREATE POLICY "Booking owners can view calendar syncs"
  ON public.booking_calendar_syncs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_calendar_syncs.booking_id
      AND b.user_id = auth.uid()
    )
  );

-- Create function to update analytics
CREATE OR REPLACE FUNCTION public.update_booking_analytics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_analytics (booking_link_id, date, bookings_created)
    VALUES (NEW.booking_link_id, CURRENT_DATE, 1)
    ON CONFLICT (booking_link_id, date)
    DO UPDATE SET
      bookings_created = booking_analytics.bookings_created + 1,
      updated_at = now();
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      UPDATE public.booking_analytics
      SET bookings_cancelled = bookings_cancelled + 1,
          updated_at = now()
      WHERE booking_link_id = NEW.booking_link_id
      AND date = CURRENT_DATE;
    ELSIF NEW.attended = true AND OLD.attended IS NULL THEN
      UPDATE public.booking_analytics
      SET bookings_completed = bookings_completed + 1,
          updated_at = now()
      WHERE booking_link_id = NEW.booking_link_id
      AND date = CURRENT_DATE;
    ELSIF NEW.no_show = true AND OLD.no_show = false THEN
      UPDATE public.booking_analytics
      SET no_shows = no_shows + 1,
          updated_at = now()
      WHERE booking_link_id = NEW.booking_link_id
      AND date = CURRENT_DATE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for analytics
DROP TRIGGER IF EXISTS update_booking_analytics_trigger ON public.bookings;
CREATE TRIGGER update_booking_analytics_trigger
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_booking_analytics();