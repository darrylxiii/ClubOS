
-- ============================================================
-- Club AI Notetaker: Database Schema Changes
-- ============================================================

-- 1. Add notetaker_enabled to bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS notetaker_enabled boolean DEFAULT false;

-- 2. Add scheduling columns to meeting_bot_sessions
ALTER TABLE public.meeting_bot_sessions
ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id),
ADD COLUMN IF NOT EXISTS scheduled_join_at timestamptz,
ADD COLUMN IF NOT EXISTS scheduled_leave_at timestamptz,
ADD COLUMN IF NOT EXISTS google_meet_space_name text,
ADD COLUMN IF NOT EXISTS google_meet_conference_id text,
ADD COLUMN IF NOT EXISTS artifacts_collected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS transcript_entry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_message text;

-- Index for cron lookups
CREATE INDEX IF NOT EXISTS idx_meeting_bot_sessions_status_scheduled
ON public.meeting_bot_sessions (connection_status, scheduled_join_at)
WHERE connection_status IN ('scheduled', 'joined');

CREATE INDEX IF NOT EXISTS idx_meeting_bot_sessions_booking
ON public.meeting_bot_sessions (booking_id);

-- 3. Create notetaker_settings table
CREATE TABLE IF NOT EXISTS public.notetaker_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  auto_join_all_bookings boolean DEFAULT true,
  auto_join_detected_interviews boolean DEFAULT true,
  send_summary_email boolean DEFAULT true,
  send_transcript_email boolean DEFAULT false,
  default_language text DEFAULT 'en',
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.notetaker_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notetaker settings"
ON public.notetaker_settings
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_notetaker_settings_user
ON public.notetaker_settings (user_id);

-- Index for cron: find upcoming bookings with notetaker enabled
CREATE INDEX IF NOT EXISTS idx_bookings_notetaker_upcoming
ON public.bookings (scheduled_start, notetaker_enabled)
WHERE notetaker_enabled = true AND status = 'confirmed';
