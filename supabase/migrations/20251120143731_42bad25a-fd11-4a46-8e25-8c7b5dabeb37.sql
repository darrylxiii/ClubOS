-- Create table for user activity tracking if not exists
CREATE TABLE IF NOT EXISTS public.user_activity_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  total_actions INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  total_session_duration_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'offline',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_activity_tracking_user_id ON public.user_activity_tracking(user_id);

-- Enable RLS
ALTER TABLE public.user_activity_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own activity
CREATE POLICY "Users can view own activity"
  ON public.user_activity_tracking FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can view all activity
CREATE POLICY "Admins can view all activity"
  ON public.user_activity_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create table for user events if not exists
CREATE TABLE IF NOT EXISTS public.user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_category TEXT,
  action_data JSONB,
  page_path TEXT,
  referrer TEXT,
  device_type TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for user_events
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON public.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_session_id ON public.user_events(session_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event_type ON public.user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON public.user_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own events
CREATE POLICY "Users can view own events"
  ON public.user_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can view all events
CREATE POLICY "Admins can view all events"
  ON public.user_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create RPC function: track_user_event
CREATE OR REPLACE FUNCTION public.track_user_event(
  p_user_id UUID,
  p_session_id TEXT,
  p_event_type TEXT,
  p_event_category TEXT DEFAULT NULL,
  p_action_data JSONB DEFAULT NULL,
  p_page_path TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT NULL,
  p_duration_seconds INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_events (
    user_id,
    session_id,
    event_type,
    event_category,
    action_data,
    page_path,
    referrer,
    device_type,
    duration_seconds
  ) VALUES (
    p_user_id,
    p_session_id,
    p_event_type,
    p_event_category,
    p_action_data,
    p_page_path,
    p_referrer,
    p_device_type,
    p_duration_seconds
  );
END;
$$;

-- Create RPC function: update_user_activity_tracking
CREATE OR REPLACE FUNCTION public.update_user_activity_tracking(
  p_user_id UUID,
  p_action_type TEXT,
  p_increment_actions BOOLEAN DEFAULT TRUE,
  p_session_id TEXT DEFAULT NULL,
  p_is_login BOOLEAN DEFAULT FALSE,
  p_is_logout BOOLEAN DEFAULT FALSE,
  p_session_duration_minutes INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_activity_tracking (
    user_id,
    last_activity_at,
    total_actions,
    session_count,
    total_session_duration_minutes,
    status
  ) VALUES (
    p_user_id,
    NOW(),
    CASE WHEN p_increment_actions THEN 1 ELSE 0 END,
    CASE WHEN p_is_login THEN 1 ELSE 0 END,
    COALESCE(p_session_duration_minutes, 0),
    CASE 
      WHEN p_is_logout THEN 'offline'
      ELSE 'online'
    END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_activity_at = NOW(),
    total_actions = user_activity_tracking.total_actions + CASE WHEN p_increment_actions THEN 1 ELSE 0 END,
    session_count = user_activity_tracking.session_count + CASE WHEN p_is_login THEN 1 ELSE 0 END,
    total_session_duration_minutes = user_activity_tracking.total_session_duration_minutes + COALESCE(p_session_duration_minutes, 0),
    status = CASE 
      WHEN p_is_logout THEN 'offline'
      WHEN p_is_login THEN 'online'
      ELSE user_activity_tracking.status
    END,
    updated_at = NOW();
END;
$$;

-- Add unique constraint for user_id
ALTER TABLE public.user_activity_tracking DROP CONSTRAINT IF EXISTS user_activity_tracking_user_id_key;
ALTER TABLE public.user_activity_tracking ADD CONSTRAINT user_activity_tracking_user_id_key UNIQUE (user_id);