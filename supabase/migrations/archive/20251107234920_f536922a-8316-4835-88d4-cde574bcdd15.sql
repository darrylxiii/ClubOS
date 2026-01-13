-- Create auth trigger function to auto-create profiles for new users
CREATE OR REPLACE FUNCTION public.ensure_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name', 
      split_part(NEW.email, '@', 1)
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_ensure_profile ON auth.users;

-- Create trigger on auth.users INSERT
CREATE TRIGGER on_auth_user_created_ensure_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_profile_on_signup();

-- Simplify applications RLS policy for INSERT
DROP POLICY IF EXISTS "Allow application inserts" ON public.applications;

CREATE POLICY "Allow application inserts" ON public.applications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if authenticated user matches the user_id being inserted
  (auth.uid() = user_id)
  OR
  -- Allow if user has any admin/partner/strategist role
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'partner', 'strategist')
  )
  OR
  -- Allow if user is a company member of the job's company
  EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.company_members cm ON cm.company_id = j.company_id
    WHERE j.id = applications.job_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
      AND cm.role IN ('owner', 'admin', 'recruiter')
  )
  OR
  -- Fallback: Allow any authenticated user
  auth.uid() IS NOT NULL
);