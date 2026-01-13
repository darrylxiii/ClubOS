-- Phase 1: Create user_preferences table for secure UI state storage
-- This replaces localStorage role switching which could be manipulated
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_role_view TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 2: Secure talent_strategists table
-- Drop the overly permissive policy that allows all authenticated users to view strategists
DROP POLICY IF EXISTS "Authenticated users can view talent strategists" ON public.talent_strategists;

-- Ensure only admins can view full talent_strategists table
-- (Frontend should use public_talent_strategists view instead)
CREATE POLICY "Only admins can view talent strategists"
ON public.talent_strategists
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Phase 3: Fix analytics tables - remove write access
-- Drop dangerous "System can manage analytics" policies
DROP POLICY IF EXISTS "System can manage analytics" ON public.company_analytics;
DROP POLICY IF EXISTS "System can manage job analytics" ON public.job_analytics;

-- Keep read access for company members, but remove write access
-- Analytics should be updated via edge functions with service role only

-- Company analytics: Read-only for members
CREATE POLICY "Company members can view analytics read-only"
ON public.company_analytics
FOR SELECT
USING (is_company_member(auth.uid(), company_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Job analytics: Read-only for members
CREATE POLICY "Company members can view job analytics read-only"
ON public.job_analytics
FOR SELECT
USING ((EXISTS ( SELECT 1
   FROM jobs j
  WHERE ((j.id = job_analytics.job_id) AND is_company_member(auth.uid(), j.company_id)))) OR has_role(auth.uid(), 'admin'::app_role));