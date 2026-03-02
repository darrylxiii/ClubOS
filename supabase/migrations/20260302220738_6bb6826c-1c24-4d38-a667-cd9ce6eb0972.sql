
-- Create function to auto-update funnel_config live_stats from real data
CREATE OR REPLACE FUNCTION public.update_funnel_live_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_roles_count integer;
  partnerships_count integer;
  current_stats jsonb;
BEGIN
  -- Count active roles (jobs with status 'open' or 'active')
  SELECT COUNT(*) INTO active_roles_count
  FROM public.jobs
  WHERE status IN ('open', 'active', 'published');

  -- Count partnerships completed in last 30 days
  SELECT COUNT(*) INTO partnerships_count
  FROM public.partner_requests
  WHERE status = 'approved'
    AND created_at >= now() - interval '30 days';

  -- Fallback minimums for social proof (never show 0)
  IF active_roles_count < 3 THEN active_roles_count := 3; END IF;
  IF partnerships_count < 1 THEN partnerships_count := 1; END IF;

  -- Get current stats to preserve other fields
  SELECT live_stats INTO current_stats
  FROM public.funnel_config
  LIMIT 1;

  IF current_stats IS NULL THEN
    current_stats := '{}'::jsonb;
  END IF;

  -- Merge new values
  current_stats := current_stats || jsonb_build_object(
    'active_roles', active_roles_count,
    'partnerships_this_month', partnerships_count
  );

  -- Update
  UPDATE public.funnel_config
  SET live_stats = current_stats,
      updated_at = now();
END;
$$;
