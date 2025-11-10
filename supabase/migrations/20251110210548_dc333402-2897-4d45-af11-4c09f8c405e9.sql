-- Comprehensive Universal Activity Monitoring System
-- Tracks activity for ALL users (candidates, partners, admins, strategists, etc.)

-- Create user_activity_tracking table for ALL users
CREATE TABLE IF NOT EXISTS public.user_activity_tracking (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activity_level TEXT NOT NULL DEFAULT 'inactive' CHECK (activity_level IN ('highly_active', 'active', 'moderate', 'low', 'inactive')),
  session_count INTEGER DEFAULT 0,
  total_actions INTEGER DEFAULT 0,
  last_action_type TEXT,
  online_status TEXT NOT NULL DEFAULT 'offline' CHECK (online_status IN ('online', 'away', 'busy', 'offline')),
  activity_score NUMERIC DEFAULT 0,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activity_tracking ENABLE ROW LEVEL SECURITY;

-- Policies - anyone can view (for admin monitoring), users can update their own
CREATE POLICY "Anyone can view user activity"
ON public.user_activity_tracking FOR SELECT
USING (true);

CREATE POLICY "Users can update their own activity"
ON public.user_activity_tracking FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own activity"
ON public.user_activity_tracking FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_last_activity ON public.user_activity_tracking(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_level ON public.user_activity_tracking(activity_level);
CREATE INDEX IF NOT EXISTS idx_user_activity_online_status ON public.user_activity_tracking(online_status);
CREATE INDEX IF NOT EXISTS idx_user_activity_score ON public.user_activity_tracking(activity_score DESC);

-- Function to calculate activity level based on last activity time
CREATE OR REPLACE FUNCTION public.calculate_activity_level(last_activity TIMESTAMP WITH TIME ZONE)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  hours_since_activity NUMERIC;
BEGIN
  hours_since_activity := EXTRACT(EPOCH FROM (now() - last_activity)) / 3600;
  
  IF hours_since_activity < 1 THEN
    RETURN 'highly_active';
  ELSIF hours_since_activity < 24 THEN
    RETURN 'active';
  ELSIF hours_since_activity < 168 THEN -- 7 days
    RETURN 'moderate';
  ELSIF hours_since_activity < 720 THEN -- 30 days
    RETURN 'low';
  ELSE
    RETURN 'inactive';
  END IF;
END;
$$;

-- Function to update activity tracking
CREATE OR REPLACE FUNCTION public.update_user_activity_tracking(
  p_user_id UUID,
  p_action_type TEXT DEFAULT NULL,
  p_increment_actions BOOLEAN DEFAULT true
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_level TEXT;
BEGIN
  -- Calculate new activity level
  v_activity_level := calculate_activity_level(now());
  
  INSERT INTO public.user_activity_tracking (
    user_id,
    last_activity_at,
    activity_level,
    total_actions,
    last_action_type,
    activity_score,
    updated_at
  )
  VALUES (
    p_user_id,
    now(),
    v_activity_level,
    CASE WHEN p_increment_actions THEN 1 ELSE 0 END,
    p_action_type,
    1,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_activity_at = now(),
    activity_level = v_activity_level,
    total_actions = CASE 
      WHEN p_increment_actions THEN user_activity_tracking.total_actions + 1 
      ELSE user_activity_tracking.total_actions 
    END,
    last_action_type = COALESCE(p_action_type, user_activity_tracking.last_action_type),
    activity_score = user_activity_tracking.activity_score + 1,
    updated_at = now();
END;
$$;

-- Function to update online status
CREATE OR REPLACE FUNCTION public.update_user_online_status(
  p_user_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_activity_tracking (
    user_id,
    online_status,
    last_activity_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_status,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    online_status = p_status,
    last_activity_at = now(),
    updated_at = now();
END;
$$;

-- Sync with existing user_presence table
INSERT INTO public.user_activity_tracking (user_id, online_status, last_activity_at)
SELECT 
  user_id,
  status as online_status,
  COALESCE(last_seen, now()) as last_activity_at
FROM public.user_presence
ON CONFLICT (user_id) DO UPDATE SET
  online_status = EXCLUDED.online_status,
  last_activity_at = EXCLUDED.last_activity_at;

-- Enable realtime for activity tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity_tracking;