-- Phase 1: Add missing columns to existing tables
ALTER TABLE public.meeting_invitations 
  ADD COLUMN IF NOT EXISTS inviter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS invitation_method TEXT DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Add constraint if it doesn't exist  
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'meeting_invitations_invitation_method_check'
  ) THEN
    ALTER TABLE public.meeting_invitations 
      ADD CONSTRAINT meeting_invitations_invitation_method_check 
      CHECK (invitation_method IN ('email', 'link', 'dropdown', 'template'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meeting_invitations_inviter ON public.meeting_invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_method ON public.meeting_invitations(invitation_method);

-- Phase 2: Add PMR table (Personal Meeting Rooms)
CREATE TABLE IF NOT EXISTS public.personal_meeting_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_code TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  allow_guests BOOLEAN DEFAULT true,
  require_approval BOOLEAN DEFAULT false,
  custom_branding JSONB DEFAULT '{}'::jsonb,
  total_meetings INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pmr_user ON public.personal_meeting_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_pmr_code ON public.personal_meeting_rooms(room_code);

ALTER TABLE public.personal_meeting_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view PMRs" ON public.personal_meeting_rooms;
CREATE POLICY "Users can view PMRs"
  ON public.personal_meeting_rooms FOR SELECT
  USING (user_id = auth.uid() OR is_active = true);

DROP POLICY IF EXISTS "Users can manage their PMR" ON public.personal_meeting_rooms;
CREATE POLICY "Users can manage their PMR"
  ON public.personal_meeting_rooms FOR ALL
  USING (user_id = auth.uid());

-- Phase 3: Enhance meetings table with new columns
ALTER TABLE public.meetings 
  ADD COLUMN IF NOT EXISTS created_via TEXT,
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.meeting_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pmr_id UUID REFERENCES public.personal_meeting_rooms(id) ON DELETE SET NULL;

-- Add constraint if needed
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'meetings_created_via_check'
  ) THEN
    ALTER TABLE public.meetings 
      ADD CONSTRAINT meetings_created_via_check 
      CHECK (created_via IN ('scheduled', 'instant', 'template', 'pmr'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meetings_created_via ON public.meetings(created_via);
CREATE INDEX IF NOT EXISTS idx_meetings_template ON public.meetings(template_id);
CREATE INDEX IF NOT EXISTS idx_meetings_pmr ON public.meetings(pmr_id);

-- Phase 4: Meeting Join Tracking table
CREATE TABLE IF NOT EXISTS public.meeting_join_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_email TEXT,
  join_method TEXT,
  join_source TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  time_to_join_seconds INTEGER
);

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'meeting_join_logs_join_method_check'
  ) THEN
    ALTER TABLE public.meeting_join_logs 
      ADD CONSTRAINT meeting_join_logs_join_method_check 
      CHECK (join_method IN ('code', 'link', 'invitation', 'calendar', 'pmr'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_join_logs_meeting ON public.meeting_join_logs(meeting_id);
CREATE INDEX IF NOT EXISTS idx_join_logs_method ON public.meeting_join_logs(join_method);

ALTER TABLE public.meeting_join_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view join logs" ON public.meeting_join_logs;
CREATE POLICY "Users can view join logs"
  ON public.meeting_join_logs FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_id AND m.host_id = auth.uid())
  );

DROP POLICY IF EXISTS "System inserts join logs" ON public.meeting_join_logs;
CREATE POLICY "System inserts join logs"
  ON public.meeting_join_logs FOR INSERT
  WITH CHECK (true);

-- Phase 5: Functions
CREATE OR REPLACE FUNCTION public.generate_pmr_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_code TEXT;
  v_counter INTEGER := 0;
BEGIN
  SELECT LOWER(REGEXP_REPLACE(COALESCE(full_name, 'user'), '[^a-zA-Z0-9]+', '-', 'g'))
  INTO v_username
  FROM profiles WHERE id = p_user_id;
  
  v_code := SUBSTRING(TRIM(BOTH '-' FROM v_username), 1, 20) || '-room';
  
  WHILE EXISTS (SELECT 1 FROM personal_meeting_rooms WHERE room_code = v_code) LOOP
    v_counter := v_counter + 1;
    v_code := SUBSTRING(TRIM(BOTH '-' FROM v_username), 1, 17) || '-rm-' || v_counter;
  END LOOP;
  
  RETURN v_code;
END;
$$;