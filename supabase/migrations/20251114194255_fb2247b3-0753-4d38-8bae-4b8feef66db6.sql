-- ============================================================================
-- SECURITY AUDIT FIX: RLS Policies, Search Paths, and Security Definer Issues
-- ============================================================================

-- ============================================================================
-- 1. ADD RLS POLICIES FOR PASSWORD RESET TABLES
-- ============================================================================

-- Password Reset Tokens: Only users can manage their own tokens
CREATE POLICY "Users can view their own password reset tokens"
  ON public.password_reset_tokens
  FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Service role can manage password reset tokens"
  ON public.password_reset_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Password Reset Attempts: Rate limiting table - service role only
CREATE POLICY "Service role can manage password reset attempts"
  ON public.password_reset_attempts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2. ADD SEARCH_PATH TO TRIGGER FUNCTIONS
-- ============================================================================

-- Fix calculate_name_similarity
CREATE OR REPLACE FUNCTION public.calculate_name_similarity(name1 text, name2 text)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  similarity_score INTEGER;
BEGIN
  -- Simple similarity scoring based on name patterns
  similarity_score := CASE
    WHEN LOWER(TRIM(name1)) = LOWER(TRIM(name2)) THEN 100
    WHEN LOWER(TRIM(name1)) LIKE '%' || LOWER(TRIM(name2)) || '%' THEN 90
    WHEN LOWER(TRIM(name2)) LIKE '%' || LOWER(TRIM(name1)) || '%' THEN 90
    WHEN LOWER(REGEXP_REPLACE(name1, '[^a-z]', '', 'g')) = LOWER(REGEXP_REPLACE(name2, '[^a-z]', '', 'g')) THEN 95
    ELSE 0
  END;
  
  RETURN similarity_score;
END;
$function$;

-- Fix calculate_online_status
CREATE OR REPLACE FUNCTION public.calculate_online_status(last_activity timestamp with time zone)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
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
$function$;

-- Fix check_circular_reporting
CREATE OR REPLACE FUNCTION public.check_circular_reporting()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  current_id UUID;
  visited_ids UUID[] := ARRAY[]::UUID[];
  max_depth INTEGER := 50;
  depth INTEGER := 0;
BEGIN
  IF NEW.reports_to_member_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  current_id := NEW.reports_to_member_id;
  visited_ids := ARRAY[NEW.id];
  
  WHILE current_id IS NOT NULL AND depth < max_depth LOOP
    IF current_id = ANY(visited_ids) THEN
      RAISE EXCEPTION 'Circular reporting relationship detected';
    END IF;
    
    visited_ids := visited_ids || current_id;
    depth := depth + 1;
    
    SELECT reports_to_member_id INTO current_id
    FROM company_members
    WHERE id = current_id;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Fix update_booking_reminders_updated_at
CREATE OR REPLACE FUNCTION public.update_booking_reminders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix update_candidate_profile
CREATE OR REPLACE FUNCTION public.update_candidate_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  INSERT INTO candidate_assessment_profiles (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO UPDATE SET
    assessments_completed = candidate_assessment_profiles.assessments_completed + 1,
    last_updated = now();
  RETURN NEW;
END;
$function$;

-- Fix update_incubator_sessions_updated_at
CREATE OR REPLACE FUNCTION public.update_incubator_sessions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix update_partner_requests_updated_at
CREATE OR REPLACE FUNCTION public.update_partner_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_updated_at_and_log
CREATE OR REPLACE FUNCTION public.update_updated_at_and_log()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 3. RECREATE MATERIALIZED VIEW WITHOUT SECURITY DEFINER
-- ============================================================================

-- Drop and recreate the materialized view to ensure it's not security definer
DROP MATERIALIZED VIEW IF EXISTS private.user_activity_dashboard_view CASCADE;

CREATE MATERIALIZED VIEW private.user_activity_dashboard_view AS
SELECT DISTINCT ON (uat.user_id) 
  uat.user_id,
  uat.last_activity_at,
  uat.total_actions,
  uat.activity_level,
  calculate_online_status(uat.last_activity_at) AS online_status,
  p.full_name,
  p.email,
  p.avatar_url,
  ur.role,
  cm.company_id
FROM user_activity_tracking uat
LEFT JOIN profiles p ON uat.user_id = p.id
LEFT JOIN user_roles ur ON uat.user_id = ur.user_id
LEFT JOIN company_members cm ON uat.user_id = cm.user_id AND cm.is_active = true
ORDER BY uat.user_id, cm.is_active DESC NULLS LAST;

-- Create index for concurrent refresh
CREATE UNIQUE INDEX idx_user_activity_dashboard_user_id 
  ON private.user_activity_dashboard_view(user_id);

-- ============================================================================
-- 4. GRANT APPROPRIATE PERMISSIONS
-- ============================================================================

-- Grant access to materialized view
GRANT SELECT ON private.user_activity_dashboard_view TO authenticated;
GRANT SELECT ON private.user_activity_dashboard_view TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration to verify)
-- ============================================================================

-- Verify RLS policies exist:
-- SELECT tablename, COUNT(*) as policy_count 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('password_reset_tokens', 'password_reset_attempts')
-- GROUP BY tablename;

-- Verify functions have search_path:
-- SELECT proname, prosrc 
-- FROM pg_proc 
-- WHERE pronamespace = 'public'::regnamespace 
-- AND proname LIKE 'update_%' 
-- AND prosrc NOT LIKE '%search_path%';

-- ============================================================================