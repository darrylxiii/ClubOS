-- Create a secure view that excludes password columns for non-admin reads
CREATE OR REPLACE VIEW public.linkedin_avatar_accounts_public
WITH (security_invoker = on) AS
SELECT
  id, label, linkedin_email, status, owner_team, risk_level,
  max_daily_minutes, notes, playbook, created_by, created_at, updated_at,
  linkedin_url, avatar_url, connections_count, followers_count,
  linkedin_headline, email_account_address, last_synced_at,
  about, location, top_skills, current_company, current_company_url,
  is_creator, is_influencer, is_premium, open_to_work,
  public_identifier, linkedin_urn, account_created_at,
  background_picture_url, experience_json, education_json,
  featured_json, linkedin_email_from_scrape,
  risk_score, daily_usage_minutes_today, sessions_today, last_cooldown_at
FROM public.linkedin_avatar_accounts;

-- Drop the overly permissive SELECT policy that exposes password columns to all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view avatar accounts" ON public.linkedin_avatar_accounts;

-- Recreate SELECT policy: admins/strategists get full access (including passwords), others get nothing (use view instead)
CREATE POLICY "Admin strategist full read access"
ON public.linkedin_avatar_accounts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY(ARRAY['admin'::app_role, 'strategist'::app_role])
  )
);