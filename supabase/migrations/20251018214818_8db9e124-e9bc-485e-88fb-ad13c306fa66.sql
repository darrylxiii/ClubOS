-- Create meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  agenda TEXT,
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  meeting_code TEXT UNIQUE NOT NULL,
  video_session_id UUID REFERENCES public.video_call_sessions(id),
  status TEXT NOT NULL DEFAULT 'scheduled',
  recurrence_rule TEXT,
  allow_guests BOOLEAN DEFAULT false,
  require_approval BOOLEAN DEFAULT false,
  max_participants INTEGER,
  meeting_password TEXT,
  access_type TEXT NOT NULL DEFAULT 'invite_only',
  branding JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create meeting participants table
CREATE TABLE IF NOT EXISTS public.meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_email TEXT,
  guest_name TEXT,
  role TEXT NOT NULL DEFAULT 'participant',
  status TEXT NOT NULL DEFAULT 'invited',
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create meeting templates table
CREATE TABLE IF NOT EXISTS public.meeting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  settings JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create meeting analytics table
CREATE TABLE IF NOT EXISTS public.meeting_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  total_participants INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  engagement_score NUMERIC,
  chat_messages_count INTEGER DEFAULT 0,
  reactions_count INTEGER DEFAULT 0,
  polls_count INTEGER DEFAULT 0,
  screen_shares_count INTEGER DEFAULT 0,
  recording_duration_minutes INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create meeting summaries table (for AI-generated summaries)
CREATE TABLE IF NOT EXISTS public.meeting_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  summary TEXT,
  key_points JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  highlights JSONB DEFAULT '[]',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_meetings_host_id ON public.meetings(host_id);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_start ON public.meetings(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_meeting_code ON public.meetings(meeting_code);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON public.meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON public.meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_guest_email ON public.meeting_participants(guest_email);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meetings
CREATE POLICY "Hosts can manage their meetings"
  ON public.meetings
  FOR ALL
  USING (host_id = auth.uid());

CREATE POLICY "Participants can view their meetings"
  ON public.meetings
  FOR SELECT
  USING (
    host_id = auth.uid() OR
    id IN (SELECT meeting_id FROM public.meeting_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Public meetings viewable by all"
  ON public.meetings
  FOR SELECT
  USING (access_type = 'public');

-- RLS Policies for meeting_participants
CREATE POLICY "Hosts can manage participants"
  ON public.meeting_participants
  FOR ALL
  USING (
    meeting_id IN (SELECT id FROM public.meetings WHERE host_id = auth.uid())
  );

CREATE POLICY "Participants can view themselves"
  ON public.meeting_participants
  FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policies for templates
CREATE POLICY "Users can manage their templates"
  ON public.meeting_templates
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Public templates viewable by all"
  ON public.meeting_templates
  FOR SELECT
  USING (is_public = true);

-- RLS Policies for analytics
CREATE POLICY "Hosts can view meeting analytics"
  ON public.meeting_analytics
  FOR SELECT
  USING (
    meeting_id IN (SELECT id FROM public.meetings WHERE host_id = auth.uid())
  );

-- RLS Policies for summaries
CREATE POLICY "Participants can view meeting summaries"
  ON public.meeting_summaries
  FOR SELECT
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings WHERE host_id = auth.uid()
      UNION
      SELECT meeting_id FROM public.meeting_participants WHERE user_id = auth.uid()
    )
  );

-- Function to generate unique meeting code
CREATE OR REPLACE FUNCTION generate_meeting_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text) from 1 for 10));
    SELECT EXISTS(SELECT 1 FROM public.meetings WHERE meeting_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Trigger to auto-generate meeting code
CREATE OR REPLACE FUNCTION set_meeting_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.meeting_code IS NULL OR NEW.meeting_code = '' THEN
    NEW.meeting_code := generate_meeting_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_insert_meeting_code
  BEFORE INSERT ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION set_meeting_code();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_meetings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_meetings_timestamp
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_meetings_updated_at();