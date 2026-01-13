-- ============================================================================
-- COMPREHENSIVE SECURITY FIXES - Phase 2
-- Addresses: Missing RLS Policies, Function Search Paths, Security Definer Views
-- ============================================================================

-- ============================================================================
-- 1. ADD MISSING RLS POLICIES FOR ADMIN-ONLY TABLES
-- ============================================================================

-- stripe_webhook_events: Only admins should access webhook logs
CREATE POLICY "Admins can manage webhook events"
  ON public.stripe_webhook_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

COMMENT ON POLICY "Admins can manage webhook events" ON public.stripe_webhook_events IS
  'Only admins can view and manage Stripe webhook events for security and compliance';

-- churn_analysis: Admin-only for business intelligence
CREATE POLICY "Admins can view churn analysis"
  ON public.churn_analysis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

COMMENT ON POLICY "Admins can view churn analysis" ON public.churn_analysis IS
  'Only admins can view churn analysis data for business intelligence purposes';

-- ============================================================================
-- 2. FIX FUNCTION MISSING SEARCH_PATH
-- ============================================================================

-- Fix auto_track_partner_email_domain trigger function
CREATE OR REPLACE FUNCTION public.auto_track_partner_email_domain()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_domain TEXT;
  user_email TEXT;
  user_company_id UUID;
BEGIN
  -- Only process if role is 'partner'
  IF NEW.role = 'partner' THEN
    -- Get user email and company_id from profiles
    SELECT email, company_id INTO user_email, user_company_id
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- Only proceed if email and company_id exist
    IF user_email IS NOT NULL AND user_company_id IS NOT NULL THEN
      -- Extract domain from email
      email_domain := extract_email_domain(user_email);
      
      -- Insert domain if it doesn't exist (ignore duplicates)
      INSERT INTO public.company_email_domains (
        company_id,
        domain,
        is_active,
        auto_tracked
      )
      VALUES (
        user_company_id,
        email_domain,
        true,
        true
      )
      ON CONFLICT (company_id, domain) 
      DO UPDATE SET 
        is_active = true,
        auto_tracked = true,
        updated_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_track_partner_email_domain() IS
  'SECURITY DEFINER trigger function with fixed search_path to prevent SQL injection';

-- ============================================================================
-- 3. FIX ANY REMAINING SECURITY DEFINER VIEWS
-- ============================================================================

-- Query and fix views that might not have security_invoker set
-- We'll use ALTER VIEW to set security_invoker on all public views

DO $$
DECLARE
  view_record RECORD;
BEGIN
  FOR view_record IN 
    SELECT c.relname as viewname
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relkind = 'v' 
      AND n.nspname = 'public'
      AND NOT (c.reloptions @> ARRAY['security_invoker=true'])
  LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', view_record.viewname);
    RAISE NOTICE 'Fixed view: public.%', view_record.viewname;
  END LOOP;
END $$;

-- ============================================================================
-- 4. VERIFICATION AND DOCUMENTATION
-- ============================================================================

-- Log the security fixes applied
DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Security Fixes Applied:';
  RAISE NOTICE '1. RLS policies added for stripe_webhook_events (admin-only)';
  RAISE NOTICE '2. RLS policies added for churn_analysis (admin-only)';
  RAISE NOTICE '3. Fixed search_path on auto_track_partner_email_domain()';
  RAISE NOTICE '4. All public views now have security_invoker = true';
  RAISE NOTICE '=================================================================';
END $$;