-- Phase 3: Focus Time Defender & Smart Scheduling
-- Focus time blocks for protecting deep work
CREATE TABLE public.focus_time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  block_type TEXT NOT NULL DEFAULT 'focus' CHECK (block_type IN ('focus', 'lunch', 'personal', 'no_meetings', 'deep_work')),
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  auto_detected BOOLEAN DEFAULT false,
  sync_to_calendar BOOLEAN DEFAULT true,
  calendar_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Learned productivity patterns from user behavior
CREATE TABLE public.productivity_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hour_of_day INTEGER NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  productivity_score NUMERIC CHECK (productivity_score BETWEEN 0 AND 100),
  meeting_success_rate NUMERIC CHECK (meeting_success_rate BETWEEN 0 AND 100),
  avg_response_time_minutes INTEGER,
  focus_quality_score NUMERIC CHECK (focus_quality_score BETWEEN 0 AND 100),
  sample_size INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, hour_of_day, day_of_week)
);

-- Team meeting load tracking for burnout prevention
CREATE TABLE public.team_meeting_load (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meeting_count INTEGER DEFAULT 0,
  meeting_minutes INTEGER DEFAULT 0,
  back_to_back_count INTEGER DEFAULT 0,
  longest_meeting_minutes INTEGER DEFAULT 0,
  focus_time_minutes INTEGER DEFAULT 0,
  load_score INTEGER CHECK (load_score BETWEEN 0 AND 100),
  burnout_risk TEXT CHECK (burnout_risk IN ('low', 'medium', 'high', 'critical')),
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Focus time preferences per user
CREATE TABLE public.focus_time_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  enable_focus_defender BOOLEAN DEFAULT true,
  auto_detect_patterns BOOLEAN DEFAULT true,
  min_focus_block_minutes INTEGER DEFAULT 60,
  max_daily_meetings INTEGER DEFAULT 6,
  max_weekly_meeting_hours INTEGER DEFAULT 20,
  preferred_meeting_hours JSONB DEFAULT '{"start": 9, "end": 17}',
  buffer_between_meetings_minutes INTEGER DEFAULT 15,
  protect_mornings BOOLEAN DEFAULT true,
  morning_end_hour INTEGER DEFAULT 11,
  allow_override_with_reason BOOLEAN DEFAULT true,
  notification_when_protected BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.focus_time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productivity_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_meeting_load ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_time_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for focus_time_blocks
CREATE POLICY "Users can manage own focus blocks" 
ON public.focus_time_blocks FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all focus blocks" 
ON public.focus_time_blocks FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
  )
);

-- RLS Policies for productivity_patterns
CREATE POLICY "Users can view own patterns" 
ON public.productivity_patterns FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage patterns" 
ON public.productivity_patterns FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for team_meeting_load
CREATE POLICY "Users can view own load" 
ON public.team_meeting_load FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view team load" 
ON public.team_meeting_load FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')
  )
);

CREATE POLICY "System can manage load data" 
ON public.team_meeting_load FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for focus_time_preferences
CREATE POLICY "Users can manage own preferences" 
ON public.focus_time_preferences FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_focus_blocks_user ON public.focus_time_blocks(user_id);
CREATE INDEX idx_focus_blocks_day ON public.focus_time_blocks(day_of_week, is_active);
CREATE INDEX idx_productivity_user_time ON public.productivity_patterns(user_id, day_of_week, hour_of_day);
CREATE INDEX idx_team_load_user_date ON public.team_meeting_load(user_id, date);
CREATE INDEX idx_team_load_burnout ON public.team_meeting_load(burnout_risk) WHERE burnout_risk IN ('high', 'critical');

-- Triggers for updated_at
CREATE TRIGGER update_focus_time_blocks_updated_at
  BEFORE UPDATE ON public.focus_time_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_productivity_patterns_updated_at
  BEFORE UPDATE ON public.productivity_patterns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_meeting_load_updated_at
  BEFORE UPDATE ON public.team_meeting_load
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_focus_time_preferences_updated_at
  BEFORE UPDATE ON public.focus_time_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();