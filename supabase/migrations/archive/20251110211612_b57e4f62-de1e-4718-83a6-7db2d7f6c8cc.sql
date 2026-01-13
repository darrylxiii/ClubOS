-- PHASE 1: Backfill all existing users into activity tracking
INSERT INTO public.user_activity_tracking (user_id, last_activity_at, online_status, activity_level)
SELECT 
  au.id,
  COALESCE(
    (SELECT MAX(created_at) FROM posts WHERE user_id = au.id),
    (SELECT MAX(created_at) FROM messages WHERE sender_id = au.id),
    au.created_at
  ) as last_activity_at,
  'offline' as online_status,
  'inactive' as activity_level
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_activity_tracking uat WHERE uat.user_id = au.id
);

-- Create trigger to auto-track new signups
CREATE OR REPLACE FUNCTION public.auto_track_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_activity_tracking (user_id, last_activity_at, online_status, activity_level)
  VALUES (NEW.id, NOW(), 'offline', 'inactive')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created_track_activity ON auth.users;
CREATE TRIGGER on_auth_user_created_track_activity
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_track_new_user();

-- PHASE 2: Create function to calculate dynamic online status
CREATE OR REPLACE FUNCTION public.calculate_online_status(last_activity timestamp with time zone)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF last_activity IS NULL THEN
    RETURN 'offline';
  END IF;
  
  IF last_activity > NOW() - INTERVAL '2 minutes' THEN
    RETURN 'online';
  ELSIF last_activity > NOW() - INTERVAL '30 minutes' THEN
    RETURN 'away';
  ELSE
    RETURN 'offline';
  END IF;
END;
$$;

-- Create materialized view for dashboard performance (use DISTINCT ON to handle duplicates)
DROP MATERIALIZED VIEW IF EXISTS public.user_activity_dashboard_view CASCADE;
CREATE MATERIALIZED VIEW public.user_activity_dashboard_view AS
SELECT DISTINCT ON (uat.user_id)
  uat.user_id,
  uat.last_activity_at,
  uat.total_actions,
  uat.activity_level,
  public.calculate_online_status(uat.last_activity_at) as online_status,
  p.full_name,
  p.email,
  p.avatar_url,
  ur.role,
  cm.company_id
FROM public.user_activity_tracking uat
LEFT JOIN public.profiles p ON uat.user_id = p.id
LEFT JOIN public.user_roles ur ON uat.user_id = ur.user_id
LEFT JOIN public.company_members cm ON uat.user_id = cm.user_id AND cm.is_active = true
ORDER BY uat.user_id, cm.is_active DESC NULLS LAST;

-- Create index for fast refresh
CREATE UNIQUE INDEX user_activity_dashboard_view_user_id_idx ON public.user_activity_dashboard_view(user_id);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_activity_dashboard_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_activity_dashboard_view;
END;
$$;

-- PHASE 3: Update RPC functions to use dynamic status
CREATE OR REPLACE FUNCTION public.update_user_online_status(
  p_user_id UUID,
  p_status TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- We no longer store static status, only update last_activity_at
  UPDATE public.user_activity_tracking
  SET 
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Insert if doesn't exist
  IF NOT FOUND THEN
    INSERT INTO public.user_activity_tracking (user_id, last_activity_at, online_status, activity_level)
    VALUES (p_user_id, NOW(), 'offline', 'inactive');
  END IF;
END;
$$;