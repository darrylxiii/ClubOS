-- ============================================================================
-- COMPREHENSIVE SECURITY FIXES
-- Addresses: Security Definer Views, Function Search Paths, RLS Policies, 
-- and Materialized View Security
-- ============================================================================

-- ============================================================================
-- 1. FIX SECURITY DEFINER VIEWS
-- ============================================================================

-- Ensure public_talent_strategists view uses SECURITY INVOKER
DROP VIEW IF EXISTS public.public_talent_strategists CASCADE;

CREATE VIEW public.public_talent_strategists
WITH (security_invoker = true)
AS
SELECT 
  id,
  full_name,
  title,
  bio,
  specialties,
  availability,
  photo_url,
  created_at,
  updated_at
FROM public.talent_strategists;

GRANT SELECT ON public.public_talent_strategists TO authenticated, anon;

COMMENT ON VIEW public.public_talent_strategists IS 
  'Public view with SECURITY INVOKER - respects RLS policies of querying user';

-- ============================================================================
-- 2. ADD SEARCH_PATH TO FUNCTIONS MISSING IT
-- ============================================================================

-- Fix extract_email_domain function
CREATE OR REPLACE FUNCTION public.extract_email_domain(email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN LOWER(SPLIT_PART(email, '@', 2));
END;
$$;

-- Fix handle_guest_approval trigger function
CREATE OR REPLACE FUNCTION public.handle_guest_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_participant_id UUID;
BEGIN
  -- Only proceed if status changed from pending to approved
  IF NEW.request_status = 'approved' AND OLD.request_status = 'pending' THEN
    
    -- Check if participant already exists and is active
    SELECT id INTO existing_participant_id
    FROM public.meeting_participants
    WHERE meeting_id = NEW.meeting_id
      AND session_token = NEW.session_token
      AND left_at IS NULL
    LIMIT 1;
    
    IF existing_participant_id IS NOT NULL THEN
      -- Update existing participant
      UPDATE public.meeting_participants
      SET 
        status = 'accepted',
        joined_at = NOW(),
        guest_name = NEW.guest_name,
        guest_email = NEW.guest_email
      WHERE id = existing_participant_id;
    ELSE
      -- Insert new participant
      INSERT INTO public.meeting_participants (
        meeting_id,
        guest_name,
        guest_email,
        session_token,
        role,
        status,
        joined_at,
        left_at
      )
      VALUES (
        NEW.meeting_id,
        NEW.guest_name,
        NEW.guest_email,
        NEW.session_token,
        'guest',
        'accepted',
        NOW(),
        NULL
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. SECURE MATERIALIZED VIEWS
-- ============================================================================

-- Revoke public access to materialized views
REVOKE ALL ON private.user_activity_dashboard_view FROM anon, authenticated;

-- Only allow access through a secure function
CREATE OR REPLACE FUNCTION public.refresh_activity_dashboard_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.user_activity_dashboard_view;
END;
$$;

-- Grant execute only to authenticated users
GRANT EXECUTE ON FUNCTION public.refresh_activity_dashboard_view() TO authenticated;

-- Secure popular_courses materialized view if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE schemaname = 'public' AND matviewname = 'popular_courses'
  ) THEN
    -- Revoke public access
    EXECUTE 'REVOKE ALL ON public.popular_courses FROM anon, authenticated';
    
    -- Create secure access function
    CREATE OR REPLACE FUNCTION public.get_popular_courses()
    RETURNS TABLE (
      id uuid,
      name text,
      description text,
      total_enrollments bigint
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      RETURN QUERY
      SELECT 
        pc.id,
        pc.name,
        pc.description,
        pc.total_enrollments
      FROM public.popular_courses pc
      WHERE pc.is_published = true;
    END;
    $func$;
    
    GRANT EXECUTE ON FUNCTION public.get_popular_courses() TO authenticated, anon;
  END IF;
END $$;

-- ============================================================================
-- 4. ADD RLS POLICIES TO TABLES MISSING THEM
-- ============================================================================

-- Check and add policies for tables with RLS enabled but no policies

-- guest_requests table - ensure proper policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'guest_requests'
  ) THEN
    -- Check if RLS is enabled but no policies exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'guest_requests'
    ) THEN
      -- Add policies for guest_requests
      CREATE POLICY "Meeting hosts can view guest requests"
        ON public.guest_requests
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = guest_requests.meeting_id
              AND m.host_id = auth.uid()
          )
        );
      
      CREATE POLICY "Anyone can create guest requests"
        ON public.guest_requests
        FOR INSERT
        TO anon, authenticated
        WITH CHECK (true);
      
      CREATE POLICY "Meeting hosts can update guest requests"
        ON public.guest_requests
        FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = guest_requests.meeting_id
              AND m.host_id = auth.uid()
          )
        );
    END IF;
  END IF;
END $$;

-- skill_assessments table - ensure proper policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'skill_assessments'
  ) THEN
    -- Check if RLS is enabled but no policies exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'skill_assessments'
    ) THEN
      -- Add policies for skill_assessments
      CREATE POLICY "Users can view their own skill assessments"
        ON public.skill_assessments
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid());
      
      CREATE POLICY "Admins can view all skill assessments"
        ON public.skill_assessments
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role = 'admin'
          )
        );
      
      CREATE POLICY "Users can insert their own skill assessments"
        ON public.skill_assessments
        FOR INSERT
        TO authenticated
        WITH CHECK (user_id = auth.uid());
      
      CREATE POLICY "Users can update their own skill assessments"
        ON public.skill_assessments
        FOR UPDATE
        TO authenticated
        USING (user_id = auth.uid());
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 5. ADD SECURITY COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.extract_email_domain(text) IS 
  'Securely extracts domain from email. Uses SECURITY DEFINER with fixed search_path.';

COMMENT ON FUNCTION public.handle_guest_approval() IS 
  'Trigger function for guest approval. Uses SECURITY DEFINER with fixed search_path.';

COMMENT ON FUNCTION public.refresh_activity_dashboard_view() IS 
  'Securely refreshes activity dashboard materialized view. SECURITY DEFINER with fixed search_path.';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Security fixes applied successfully:';
  RAISE NOTICE '  ✓ Views converted to SECURITY INVOKER';
  RAISE NOTICE '  ✓ Functions updated with SET search_path';
  RAISE NOTICE '  ✓ Materialized views secured';
  RAISE NOTICE '  ✓ RLS policies added to tables';
END $$;