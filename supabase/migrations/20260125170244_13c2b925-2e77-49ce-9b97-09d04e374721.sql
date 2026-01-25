-- Phase 1 Missing Tables: Guest Domain Behavior & No-Show Interventions

-- Guest domain behavior for ML pattern analysis
CREATE TABLE IF NOT EXISTS public.guest_domain_behavior (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_email_domain TEXT NOT NULL UNIQUE,
  total_bookings INTEGER DEFAULT 0,
  completed_bookings INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  cancelled_count INTEGER DEFAULT 0,
  rescheduled_count INTEGER DEFAULT 0,
  average_booking_lead_time_hours NUMERIC,
  average_meeting_duration_minutes NUMERIC,
  last_booking_at TIMESTAMPTZ,
  first_booking_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- No-show intervention tracking
CREATE TABLE IF NOT EXISTS public.no_show_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  prediction_id UUID REFERENCES booking_no_show_predictions(id) ON DELETE CASCADE,
  intervention_type TEXT NOT NULL CHECK (intervention_type IN ('extra_reminder', 'sms_confirmation', 'host_notification', 'calendar_confirmation', 'waitlist_preparation')),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  response_received BOOLEAN DEFAULT FALSE,
  response_type TEXT,
  response_at TIMESTAMPTZ,
  effectiveness_outcome TEXT CHECK (effectiveness_outcome IN ('attended', 'no_show', 'cancelled', 'rescheduled', 'unknown')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preferred meeting hours for focus time defender
CREATE TABLE IF NOT EXISTS public.preferred_meeting_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_hour INTEGER CHECK (start_hour BETWEEN 0 AND 23),
  end_hour INTEGER CHECK (end_hour BETWEEN 0 AND 23),
  is_available BOOLEAN DEFAULT TRUE,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, day_of_week)
);

-- Enable RLS on new tables
ALTER TABLE public.guest_domain_behavior ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_show_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferred_meeting_hours ENABLE ROW LEVEL SECURITY;

-- RLS for guest_domain_behavior (read for authenticated, write for system)
CREATE POLICY "Authenticated users can view domain patterns" 
ON public.guest_domain_behavior FOR SELECT 
TO authenticated USING (true);

-- RLS for no_show_interventions (use user_id from bookings)
CREATE POLICY "Host can view intervention for their bookings" 
ON public.no_show_interventions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.id = booking_id AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all interventions" 
ON public.no_show_interventions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'strategist')
  )
);

-- RLS for preferred_meeting_hours
CREATE POLICY "Users can view own preferred hours" 
ON public.preferred_meeting_hours FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own preferred hours" 
ON public.preferred_meeting_hours FOR ALL 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add missing RLS policies for voice/whatsapp sessions
CREATE POLICY "Hosts can insert voice sessions" 
ON public.voice_booking_sessions FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Hosts can update voice sessions" 
ON public.voice_booking_sessions FOR UPDATE 
USING (true);

CREATE POLICY "Hosts can insert whatsapp sessions" 
ON public.whatsapp_booking_sessions FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Hosts can update whatsapp sessions" 
ON public.whatsapp_booking_sessions FOR UPDATE 
USING (true);

CREATE POLICY "Admins can manage whatsapp templates" 
ON public.whatsapp_templates FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_domain_behavior_domain 
ON public.guest_domain_behavior(guest_email_domain);

CREATE INDEX IF NOT EXISTS idx_no_show_interventions_booking 
ON public.no_show_interventions(booking_id);

CREATE INDEX IF NOT EXISTS idx_no_show_interventions_prediction 
ON public.no_show_interventions(prediction_id);

CREATE INDEX IF NOT EXISTS idx_preferred_meeting_hours_user 
ON public.preferred_meeting_hours(user_id);