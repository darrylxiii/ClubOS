-- Create booking availability settings table
CREATE TABLE IF NOT EXISTS public.booking_availability_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Default availability hours
  default_start_time TIME NOT NULL DEFAULT '09:00:00',
  default_end_time TIME NOT NULL DEFAULT '17:00:00',
  
  -- Default available days (0=Sunday, 1=Monday, etc.)
  default_available_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  
  -- Time slot settings
  time_slot_interval INTEGER NOT NULL DEFAULT 30, -- minutes
  
  -- Buffer defaults
  default_buffer_before INTEGER NOT NULL DEFAULT 0, -- minutes
  default_buffer_after INTEGER NOT NULL DEFAULT 0, -- minutes
  
  -- Booking window defaults
  default_advance_booking_days INTEGER NOT NULL DEFAULT 60,
  default_min_notice_hours INTEGER NOT NULL DEFAULT 2,
  
  -- Calendar preferences
  primary_calendar_id UUID REFERENCES public.calendar_connections(id) ON DELETE SET NULL,
  check_all_calendars BOOLEAN NOT NULL DEFAULT true,
  
  -- Timezone settings
  default_timezone TEXT NOT NULL DEFAULT 'Europe/Amsterdam',
  auto_detect_timezone BOOLEAN NOT NULL DEFAULT true,
  
  -- Meeting link preferences
  default_video_provider TEXT, -- 'google_meet', 'zoom', 'microsoft_teams', null
  auto_generate_links BOOLEAN NOT NULL DEFAULT false,
  include_dial_in BOOLEAN NOT NULL DEFAULT false,
  
  -- Branding
  default_color TEXT NOT NULL DEFAULT '#6366f1',
  show_profile_picture BOOLEAN NOT NULL DEFAULT true,
  custom_welcome_message TEXT,
  
  -- Notification settings
  notify_on_booking BOOLEAN NOT NULL DEFAULT true,
  send_reminders BOOLEAN NOT NULL DEFAULT true,
  reminder_minutes_before INTEGER NOT NULL DEFAULT 60,
  send_calendar_invites BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.booking_availability_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own booking availability settings"
  ON public.booking_availability_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own booking availability settings"
  ON public.booking_availability_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own booking availability settings"
  ON public.booking_availability_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own booking availability settings"
  ON public.booking_availability_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_booking_availability_settings_updated_at
  BEFORE UPDATE ON public.booking_availability_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for user lookups
CREATE INDEX idx_booking_availability_settings_user_id 
  ON public.booking_availability_settings(user_id);