-- Fix RLS policies to allow company members to add candidates

-- ============================================
-- FIX APPLICATIONS TABLE RLS POLICY
-- ============================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Allow user and admin inserts on applications" ON applications;
DROP POLICY IF EXISTS "Users can create applications" ON applications;

-- Create comprehensive policy that handles all cases
CREATE POLICY "Allow application inserts" ON applications
FOR INSERT
WITH CHECK (
  -- Case 1: User inserting their own application
  (auth.uid() = user_id AND user_id IS NOT NULL)
  OR
  -- Case 2: Admin, partner, or strategist role can insert any application
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'partner', 'strategist')
  )
  OR
  -- Case 3: Company members can insert applications for their company's jobs
  -- This allows adding candidates with NULL user_id
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN company_members cm ON cm.company_id = j.company_id
    WHERE j.id = applications.job_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
      AND cm.role IN ('owner', 'admin', 'recruiter')
  )
);

-- ============================================
-- FIX CANDIDATE_PROFILES TABLE RLS POLICY
-- ============================================

-- Drop old restrictive policy
DROP POLICY IF EXISTS "Admins and partners can create candidate profiles" ON candidate_profiles;

-- Create comprehensive policy for candidate profile creation
CREATE POLICY "Allow candidate profile creation" ON candidate_profiles
FOR INSERT
WITH CHECK (
  -- Admins, partners, strategists can create profiles
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'partner', 'strategist')
  )
  OR
  -- Company members can create candidate profiles
  EXISTS (
    SELECT 1 FROM company_members cm
    WHERE cm.user_id = auth.uid()
      AND cm.is_active = true
      AND cm.role IN ('owner', 'admin', 'recruiter')
  )
);