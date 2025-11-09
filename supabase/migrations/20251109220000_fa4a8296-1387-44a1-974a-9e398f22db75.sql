-- ============================================
-- COMPREHENSIVE FIX: Resolve White Screen Issue
-- ============================================

-- 1. Drop all conflicting structures
DROP TRIGGER IF EXISTS create_booking_reminders ON public.bookings CASCADE;
DROP TRIGGER IF EXISTS update_booking_reminders_updated_at ON public.booking_reminders CASCADE;
DROP FUNCTION IF EXISTS public.create_booking_reminders_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.update_booking_reminders_updated_at() CASCADE;
DROP TABLE IF EXISTS public.booking_reminders CASCADE;

-- 2. Recreate booking_reminders with correct schema
CREATE TABLE public.booking_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h', '1h', '5min')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_booking_reminders_scheduled ON public.booking_reminders(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_booking_reminders_booking ON public.booking_reminders(booking_id);

-- 3. Add missing columns to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS quantum_meeting_link TEXT,
ADD COLUMN IF NOT EXISTS quantum_meeting_code TEXT,
ADD COLUMN IF NOT EXISTS enable_recording BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS calendar_sync_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_sync_attempt TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_error_message TEXT;

-- Add check constraint for calendar_sync_status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'bookings_calendar_sync_status_check'
  ) THEN
    ALTER TABLE public.bookings 
    ADD CONSTRAINT bookings_calendar_sync_status_check 
    CHECK (calendar_sync_status IN ('pending', 'synced', 'failed', 'out_of_sync'));
  END IF;
END $$;

-- 4. Add missing columns to booking_links
ALTER TABLE public.booking_links
ADD COLUMN IF NOT EXISTS preferred_video_provider TEXT DEFAULT 'quantum_club',
ADD COLUMN IF NOT EXISTS auto_record BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS share_recording_with_guest BOOLEAN DEFAULT false;

-- 5. Create calendar_sync_log table
CREATE TABLE IF NOT EXISTS public.calendar_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  provider TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  calendar_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_booking ON public.calendar_sync_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_created ON public.calendar_sync_log(created_at DESC);

-- 6. Fix RLS policies for guest access
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Guests can view bookings by ID" ON public.bookings;
DROP POLICY IF EXISTS "Everyone can view active booking links details" ON public.booking_links;
DROP POLICY IF EXISTS "Public can view booking link host profiles" ON public.profiles;

-- Create guest-accessible policies for bookings
CREATE POLICY "Guests can view bookings by ID"
  ON public.bookings FOR SELECT
  TO public, authenticated, anon
  USING (true);

CREATE POLICY "Users can manage their own bookings"
  ON public.bookings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create guest-accessible policies for booking_links
CREATE POLICY "Everyone can view active booking links"
  ON public.booking_links FOR SELECT
  TO public, authenticated, anon
  USING (is_active = true);

CREATE POLICY "Users can manage their own booking links"
  ON public.booking_links FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create guest-accessible policies for profiles (host info only)
CREATE POLICY "Public can view booking link host profiles"
  ON public.profiles FOR SELECT
  TO public, authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_links
      WHERE booking_links.user_id = profiles.id
      AND booking_links.is_active = true
    )
  );

-- 7. Add RLS for new tables
ALTER TABLE public.booking_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their booking reminders"
  ON public.booking_reminders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = booking_reminders.booking_id 
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage reminders"
  ON public.booking_reminders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their sync logs"
  ON public.calendar_sync_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = calendar_sync_log.booking_id 
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage sync logs"
  ON public.calendar_sync_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 8. Recreate reminder trigger
CREATE OR REPLACE FUNCTION public.create_booking_reminders_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND NEW.scheduled_start > NOW() THEN
    -- 24 hour reminder
    IF NEW.scheduled_start > NOW() + INTERVAL '24 hours' THEN
      INSERT INTO public.booking_reminders (booking_id, reminder_type, scheduled_for)
      VALUES (NEW.id, '24h', NEW.scheduled_start - INTERVAL '24 hours')
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- 1 hour reminder
    IF NEW.scheduled_start > NOW() + INTERVAL '1 hour' THEN
      INSERT INTO public.booking_reminders (booking_id, reminder_type, scheduled_for)
      VALUES (NEW.id, '1h', NEW.scheduled_start - INTERVAL '1 hour')
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- 5 minute reminder
    IF NEW.scheduled_start > NOW() + INTERVAL '5 minutes' THEN
      INSERT INTO public.booking_reminders (booking_id, reminder_type, scheduled_for)
      VALUES (NEW.id, '5min', NEW.scheduled_start - INTERVAL '5 minutes')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_booking_reminders_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_booking_reminders
  AFTER INSERT OR UPDATE OF status, scheduled_start ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_booking_reminders_trigger();

CREATE TRIGGER update_booking_reminders_updated_at
  BEFORE UPDATE ON public.booking_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_booking_reminders_updated_at();